import { CursorPaginationDto } from '@/common/dto/cursor-pagination/cursor-pagination.dto';
import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { ListingStatus, ReservationStatus } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { buildPaginator } from '@/utils/cursor-pagination';
import { paginate } from '@/utils/offset-pagination';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import assert from 'assert';
import { plainToInstance } from 'class-transformer';
import { Brackets, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CreateListingDto } from './dto/create-listing.req.dto';
import { ListListingReqDto } from './dto/list-listing.req.dto';
import {
  AvailabilityCountDto,
  ListingAggregateResDto,
  StatusCountDto,
} from './dto/listing-aggregate.res.dto';
import { ListingResDto } from './dto/listing.res.dto';
import { LoadMoreListingsReqDto } from './dto/load-more-listings.req.dto';
import { SearchListingDto } from './dto/search-listing.req.dto';
import { SearchListingResDto } from './dto/search-listing.res.dto';
import { UpdateListingDto } from './dto/update-listing.req.dto';
import { ListingEntity } from './entities/listing.entity';

@Injectable()
export class ListingService {
  private readonly logger = new Logger(ListingService.name);

  private readonly excludedStatuses = [
    ReservationStatus.ORDER_CANCELED,
    ReservationStatus.ORDER_FAIL,
  ];

  constructor(
    @InjectRepository(ListingEntity)
    private readonly listingRepository: Repository<ListingEntity>,
  ) {}

  async create(dto: CreateListingDto): Promise<ListingResDto> {
    let slug: string;

    if (dto.status === ListingStatus.LISTING_DRAFT) {
      slug = `draft-${uuidv4()}`;
    } else {
      if (!dto.name) {
        slug = `listing-${uuidv4()}`;
      } else {
        slug = dto.name
          .toLowerCase()
          .replace(/ /g, '-')
          .replace(/[^\w-]+/g, '');
        const existingListing = await this.listingRepository.findOne({
          where: { slug },
        });

        if (existingListing) {
          slug = `${slug}-${uuidv4()}`;
        }
      }
    }

    const newListing = this.listingRepository.create({
      ...dto,
      pictures: dto.pictures || [],
      tags: dto.tags || [],
      security_agreement: dto.security_agreement || [],
      status: dto.status || ListingStatus.LISTING_DRAFT,
      default_availability: dto.default_availability ?? true,
      slug,
    });

    const savedListing = await this.listingRepository.save(newListing);
    this.logger.debug('Listing created:', { id: savedListing.id });

    return plainToInstance(ListingResDto, savedListing, {
      excludeExtraneousValues: true,
    });
  }

  async search(dto: SearchListingDto) {
    // Set default check-in and check-out dates
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const check_in = dto.params?.check_in || null;
    const check_out = dto.params?.check_out || null;

    // Calculate total number of guests
    let totalGuests = 0;
    if (dto.params?.guests) {
      totalGuests += dto.params.guests.adults || 0;
      totalGuests += dto.params.guests.children
        ? dto.params.guests.children.length
        : 0;
    }

    const query = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect(
        'listing.prices',
        'prices',
        'prices.listing_id = listing.id',
      )
      .leftJoinAndSelect('listing.host', 'host')
      .leftJoinAndSelect('listing.availabilities', 'availabilities')
      .where('listing.deleted_at IS NULL')
      .andWhere('listing.status = :status', {
        status: ListingStatus.LISTING_COMPLETED,
      });

    // Filter by guest number if specified
    if (totalGuests > 0) {
      query.andWhere('listing.guest_number >= :totalGuests', { totalGuests });
    }

    // Filter by listing name
    if (dto.filters?.listing_name) {
      query.andWhere('LOWER(listing.name) LIKE LOWER(:listing_name)', {
        listing_name: `%${dto.filters.listing_name}%`,
      });
    }

    // Filter by region_id
    if (dto.params?.region_id !== undefined && dto.params?.region_id !== null) {
      query.andWhere('listing.region_id = :region_id', {
        region_id: dto.params.region_id,
      });
    }

    // Filter by slug
    if (dto.params?.slug) {
      query.andWhere('listing.slug = :slug', { slug: dto.params.slug });
    }

    // Filter by amenities
    if (dto.filters?.amenities?.length) {
      query.andWhere('listing.amenities @> ARRAY[:...amenities]::text[]', {
        amenities: dto.filters.amenities,
      });
    }

    // Filter by price range
    if (dto.filters?.price_per_night) {
      const minPrice = dto.filters.price_per_night.min;
      const maxPrice = dto.filters.price_per_night.max;
      if (check_in && check_out) {
        query.andWhere(
          `COALESCE(
          (SELECT price_override 
           FROM prices 
           WHERE prices.listing_id = listing.id 
             AND prices.start_date <= :check_out 
             AND prices.end_date >= :check_in 
           LIMIT 1), 
          listing.default_price
        ) BETWEEN :minPrice AND :maxPrice`,
          { check_in, check_out, minPrice, maxPrice },
        );
      } else {
        query.andWhere(
          'listing.default_price BETWEEN :minPrice AND :maxPrice',
          {
            minPrice,
            maxPrice,
          },
        );
      }
    }

    // Filter by free cancellation
    if (dto.filters?.free_cancellation) {
      query.andWhere('listing.is_no_free_cancellation = false');
    }

    // Filter by availability
    if (check_in && check_out) {
      query
        .andWhere(
          new Brackets((qb) => {
            qb.where(
              `listing.id NOT IN (
              SELECT r.listing_id
              FROM reservations r
              WHERE r.check_in_date < :desired_checkout
                AND r.check_out_date > :desired_checkin
                AND r.status NOT IN (:...excludedStatuses)
            )`,
              { desired_checkin: check_in, desired_checkout: check_out },
            ).andWhere(
              `(
              listing.id NOT IN (
                SELECT a.listing_id
                FROM availabilities a
                WHERE a.start_date < :desired_checkout
                  AND a.end_date > :desired_checkin
                  AND a.availability_override = false
              )
              AND listing.default_availability = true
            ) OR EXISTS (
              SELECT 1
              FROM availabilities a
              WHERE a.listing_id = listing.id
                AND a.start_date < :desired_checkout
                AND a.end_date > :desired_checkin
                AND a.availability_override = true
            )`,
              { desired_checkin: check_in, desired_checkout: check_out },
            );
          }),
        )
        .setParameter('excludedStatuses', this.excludedStatuses);

      // NEW: Check booking window constraints
      query
        .andWhere(
          new Brackets((qb) => {
            // For "Inactive" or null (no restriction)
            qb.where(
              'listing.booking_window = :inactive OR listing.booking_window IS NULL',
              {
                inactive: 'Inactive',
              },
            )
              // For dynamic time period
              .orWhere(
                `listing.booking_window != 'Inactive' AND (
                CASE 
                  WHEN listing.booking_window ~ E'^\\\\d+\\\\s+day(s)?$' THEN
                    DATE(:check_in) <= DATE(:today) + (SUBSTRING(listing.booking_window FROM E'^\\\\d+')::INTEGER) * INTERVAL '1 day'
                  WHEN listing.booking_window ~ E'^\\\\d+\\\\s+week(s)?$' THEN
                    DATE(:check_in) <= DATE(:today) + (SUBSTRING(listing.booking_window FROM E'^\\\\d+')::INTEGER) * INTERVAL '1 week' 
                  WHEN listing.booking_window ~ E'^\\\\d+\\\\s+month(s)?$' THEN
                    DATE(:check_in) <= DATE(:today) + (SUBSTRING(listing.booking_window FROM E'^\\\\d+')::INTEGER) * INTERVAL '1 month'
                  WHEN listing.booking_window ~ E'^\\\\d+\\\\s+year(s)?$' THEN
                    DATE(:check_in) <= DATE(:today) + (SUBSTRING(listing.booking_window FROM E'^\\\\d+')::INTEGER) * INTERVAL '1 year'
                  ELSE TRUE
                END
              )`,
              );
          }),
        )
        .setParameter('today', today);

      // NEW: Check for restricted check-in days
      query.andWhere(
        `NOT (EXTRACT(DOW FROM DATE(:check_in)) IN 
          (SELECT CAST(unnest(listing.restricted_check_in) AS INTEGER))
        )`,
      );

      // NEW: Check for restricted check-out days
      query.andWhere(
        `NOT (EXTRACT(DOW FROM DATE(:check_out)) IN 
          (SELECT CAST(unnest(listing.restricted_check_out) AS INTEGER))
        )`,
      );

      // NEW: Check buffer period - ensure we're not in a buffer period of another booking
      query.andWhere(
        new Brackets((qb) => {
          qb.where('listing.buffer_period IS NULL') // Handle NULL case first
            .orWhere('listing.buffer_period = :none', { none: 'None' }) // No buffer needed
            .orWhere(
              new Brackets((qb2) => {
                qb2.where('listing.buffer_period = :oneNight', {
                  oneNight: '1 night',
                }).andWhere(`listing.id NOT IN (
                    SELECT r.listing_id
                    FROM reservations r
                    WHERE (r.check_out_date + INTERVAL '1 day' >= :check_in AND r.check_out_date <= :check_in) 
                      OR (r.check_in_date - INTERVAL '1 day' <= :check_out AND r.check_in_date >= :check_out)
                      AND r.status NOT IN (:...excludedStatuses)
                  )`);
              }),
            )
            .orWhere(
              new Brackets((qb2) => {
                qb2.where('listing.buffer_period = :twoNights', {
                  twoNights: '2 nights',
                }).andWhere(`listing.id NOT IN (
                    SELECT r.listing_id
                    FROM reservations r
                    WHERE (r.check_out_date + INTERVAL '2 days' >= :check_in AND r.check_out_date <= :check_in) 
                      OR (r.check_in_date - INTERVAL '2 days' <= :check_out AND r.check_in_date >= :check_out)
                      AND r.status NOT IN (:...excludedStatuses)
                  )`);
              }),
            );
        }),
      );

      // NEW: Check min_booking_night constraint
      query.andWhere(
        new Brackets((qb) => {
          qb.where('listing.min_booking_night IS NULL') // No minimum nights set
            .orWhere(
              `(DATE(:check_out) - DATE(:check_in)) >= listing.min_booking_night`,
            );
        }),
      );

      // NEW: Check max_booking_night constraint
      query.andWhere(
        new Brackets((qb) => {
          qb.where('listing.max_booking_night IS NULL') // No maximum nights set
            .orWhere(
              `(DATE(:check_out) - DATE(:check_in)) <= listing.max_booking_night`,
            );
        }),
      );

      // NEW: Check same_day_booking_cutoff_time constraint
      // If check-in is today, ensure current time is before the cutoff time
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      query
        .andWhere(
          new Brackets((qb) => {
            qb.where('listing.same_day_booking_cutoff_time IS NULL') // No cutoff time set
              .orWhere('DATE(:check_in) > DATE(:today)') // Check-in is not today
              .orWhere(
                `DATE(:check_in) = DATE(:today) AND 
               CAST(:currentTime AS TIME) <= CAST(listing.same_day_booking_cutoff_time AS TIME)`,
              );
          }),
        )
        .setParameter('currentTime', currentTime);

      query
        .setParameter('check_in', check_in)
        .setParameter('check_out', check_out);
    }

    // Apply sorting
    if (dto.filters?.sorting?.sorting_by) {
      const allowedFields = ['name', 'created_at', 'default_price', 'price'];
      const field = dto.filters.sorting.sorting_by;

      if (!allowedFields.includes(field)) {
        throw new ValidationException(ErrorCode.E003, 'Invalid sorting field');
      }

      const direction = dto.filters.sorting.desc ? 'DESC' : 'ASC';
      if (field === 'price') {
        if (check_in && check_out) {
          query
            .addSelect(
              `COALESCE(
            (SELECT price_override 
             FROM prices 
             WHERE prices.listing_id = listing.id 
               AND prices.start_date <= :check_out 
               AND prices.end_date >= :check_in 
             LIMIT 1), 
            listing.default_price
          )`,
              'calculated_price',
            )
            .setParameter('check_in', check_in)
            .setParameter('check_out', check_out)
            .orderBy('calculated_price', direction);
        } else {
          query.orderBy('listing.default_price', direction);
        }
      } else {
        query.orderBy(`listing.${field}`, direction);
      }
    } else {
      query.orderBy('listing.created_at', 'DESC');
    }

    // Pagination
    const [listings, metaDto] = await paginate<ListingEntity>(
      query,
      dto.pagination,
      { skipCount: false, takeAll: false },
    );

    // Compute daily_price and total_price
    const resultListings = await Promise.all(
      listings.map(async (listing) => {
        let dailyPrices: number[] = [];
        let totalPrice = 0;

        if (check_in && check_out) {
          const days = this.getDateRange(check_in, check_out);
          for (const date of days) {
            const priceForDate = await this.getPriceForDate(listing, date);
            dailyPrices.push(priceForDate);
            totalPrice += priceForDate;
          }
        } else {
          dailyPrices = [listing.default_price];
          totalPrice = listing.default_price;
        }

        return plainToInstance(
          SearchListingResDto,
          { ...listing, daily_price: dailyPrices, total_price: totalPrice },
          { excludeExtraneousValues: true },
        );
      }),
    );

    return new OffsetPaginatedDto(resultListings, metaDto);
  }

  async checkAvailability(
    slug: string,
    startDate: Date,
    endDate: Date,
    guests?: { adults?: number; children?: number[] },
  ): Promise<SearchListingResDto> {
    assert(slug, 'Listing slug is required');
    assert(startDate, 'Start date is required');
    assert(endDate, 'End date is required');

    if (startDate >= endDate) {
      throw new ValidationException(
        ErrorCode.E002,
        'Start date must be before end date',
      );
    }

    const today = new Date();
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    // Query to find the listing and check availability in one go
    const query = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.host', 'host')
      .leftJoinAndSelect('listing.prices', 'prices')
      .leftJoinAndSelect('listing.availabilities', 'availabilities')
      .where('listing.slug = :slug', { slug })
      .andWhere(
        new Brackets((qb) => {
          qb.where(
            `listing.id NOT IN (
              SELECT r.listing_id
              FROM reservations r
              WHERE r.check_in_date < :endDate
                AND r.check_out_date > :startDate
                AND r.status NOT IN (:...excludedStatuses)
            )`,
            { startDate, endDate },
          ).andWhere(
            `(
              listing.id NOT IN (
                SELECT a.listing_id
                FROM availabilities a
                WHERE a.start_date < :endDate
                  AND a.end_date > :startDate
                  AND a.availability_override = false
              )
              AND listing.default_availability = true
            ) OR EXISTS (
              SELECT 1
              FROM availabilities a
              WHERE a.listing_id = listing.id
                AND a.start_date < :endDate
                AND a.end_date > :startDate
                AND a.availability_override = true
            )`,
            { startDate, endDate },
          );
        }),
      )
      .setParameter('excludedStatuses', this.excludedStatuses);

    // Calculate total number of guests
    let totalGuests = 0;
    if (guests) {
      totalGuests += guests.adults || 0;
      totalGuests += guests.children ? guests.children.length : 0;
    }

    // Filter by guest number if specified
    if (totalGuests > 0) {
      query.andWhere('listing.guest_number >= :totalGuests', { totalGuests });
    }

    // Check booking window constraints
    query
      .andWhere(
        new Brackets((qb) => {
          // For "Inactive" or null (no restriction)
          qb.where(
            'listing.booking_window = :inactive OR listing.booking_window IS NULL',
            {
              inactive: 'Inactive',
            },
          )
            // For dynamic time period
            .orWhere(
              `listing.booking_window != 'Inactive' AND (
              CASE 
                WHEN listing.booking_window ~ E'^\\\\d+\\\\s+day(s)?$' THEN
                  DATE(:startDate) <= DATE(:today) + (SUBSTRING(listing.booking_window FROM E'^\\\\d+')::INTEGER) * INTERVAL '1 day'
                WHEN listing.booking_window ~ E'^\\\\d+\\\\s+week(s)?$' THEN
                  DATE(:startDate) <= DATE(:today) + (SUBSTRING(listing.booking_window FROM E'^\\\\d+')::INTEGER) * INTERVAL '1 week' 
                WHEN listing.booking_window ~ E'^\\\\d+\\\\s+month(s)?$' THEN
                  DATE(:startDate) <= DATE(:today) + (SUBSTRING(listing.booking_window FROM E'^\\\\d+')::INTEGER) * INTERVAL '1 month'
                WHEN listing.booking_window ~ E'^\\\\d+\\\\s+year(s)?$' THEN
                  DATE(:startDate) <= DATE(:today) + (SUBSTRING(listing.booking_window FROM E'^\\\\d+')::INTEGER) * INTERVAL '1 year'
                ELSE TRUE
              END
            )`,
            );
        }),
      )
      .setParameter('today', today);

    // Check for restricted check-in days
    query.andWhere(
      `NOT (EXTRACT(DOW FROM DATE(:startDate)) IN 
        (SELECT CAST(unnest(listing.restricted_check_in) AS INTEGER))
      )`,
    );

    // Check for restricted check-out days
    query.andWhere(
      `NOT (EXTRACT(DOW FROM DATE(:endDate)) IN 
        (SELECT CAST(unnest(listing.restricted_check_out) AS INTEGER))
      )`,
    );

    // Check buffer period - ensure we're not in a buffer period of another booking
    query.andWhere(
      new Brackets((qb) => {
        qb.where('listing.buffer_period IS NULL') // Handle NULL case first
          .orWhere('listing.buffer_period = :none', { none: 'None' }) // No buffer needed
          .orWhere(
            new Brackets((qb2) => {
              qb2.where('listing.buffer_period = :oneNight', {
                oneNight: '1 night',
              }).andWhere(`listing.id NOT IN (
                  SELECT r.listing_id
                  FROM reservations r
                  WHERE (r.check_out_date + INTERVAL '1 day' >= :startDate AND r.check_out_date <= :startDate) 
                    OR (r.check_in_date - INTERVAL '1 day' <= :endDate AND r.check_in_date >= :endDate)
                    AND r.status NOT IN (:...excludedStatuses)
                )`);
            }),
          )
          .orWhere(
            new Brackets((qb2) => {
              qb2.where('listing.buffer_period = :twoNights', {
                twoNights: '2 nights',
              }).andWhere(`listing.id NOT IN (
                  SELECT r.listing_id
                  FROM reservations r
                  WHERE (r.check_out_date + INTERVAL '2 days' >= :startDate AND r.check_out_date <= :startDate) 
                    OR (r.check_in_date - INTERVAL '2 days' <= :endDate AND r.check_in_date >= :endDate)
                    AND r.status NOT IN (:...excludedStatuses)
                )`);
            }),
          );
      }),
    );

    // NEW: Check min_booking_night constraint
    query.andWhere(
      new Brackets((qb) => {
        qb.where('listing.min_booking_night IS NULL') // No minimum nights set
          .orWhere(
            `(DATE(:endDate) - DATE(:startDate)) >= listing.min_booking_night`,
          );
      }),
    );

    // NEW: Check max_booking_night constraint
    query.andWhere(
      new Brackets((qb) => {
        qb.where('listing.max_booking_night IS NULL') // No maximum nights set
          .orWhere(
            `(DATE(:endDate) - DATE(:startDate)) <= listing.max_booking_night`,
          );
      }),
    );

    // NEW: Check same_day_booking_cutoff_time constraint
    // If check-in is today, ensure current time is before the cutoff time
    query
      .andWhere(
        new Brackets((qb) => {
          qb.where('listing.same_day_booking_cutoff_time IS NULL') // No cutoff time set
            .orWhere('DATE(:startDate) > DATE(:today)') // Check-in is not today
            .orWhere(
              `DATE(:startDate) = DATE(:today) AND 
             CAST(:currentTime AS TIME) <= CAST(listing.same_day_booking_cutoff_time AS TIME)`,
            );
        }),
      )
      .setParameter('currentTime', currentTime);

    const listing = await query.getOne();

    if (!listing) {
      throw new ValidationException(
        ErrorCode.E001,
        'Listing not found or not available for the selected dates',
      );
    }

    // Calculate daily prices and total price
    const days = this.getDateRange(startDate, endDate);
    const dailyPrices: number[] = [];
    let totalPrice = 0;

    for (const date of days) {
      const priceForDate = await this.getPriceForDate(listing, date);
      dailyPrices.push(priceForDate);
      totalPrice += priceForDate;
    }

    // Transform to response DTO with the calculated prices
    return plainToInstance(
      SearchListingResDto,
      {
        ...listing,
        daily_price: dailyPrices,
        total_price: totalPrice,
      },
      { excludeExtraneousValues: true },
    );
  }

  // Not used for now
  async calculateTotalPrice(
    listingId: Uuid,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    if (endDate <= startDate) {
      throw new ValidationException(
        ErrorCode.E002,
        'End date must be after start date',
      );
    }

    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
      relations: ['prices'],
    });

    if (!listing) {
      throw new ValidationException(ErrorCode.E001, 'Listing not found');
    }

    const days = this.getDateRange(startDate, endDate);
    let totalPrice = 0;

    for (const date of days) {
      const priceForDate = await this.getPriceForDate(listing, date);
      totalPrice += priceForDate;
    }

    return totalPrice;
  }

  private getDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);

    while (current < endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private async getPriceForDate(
    listing: ListingEntity,
    date: Date,
  ): Promise<number> {
    const priceOverride = listing.prices?.find(
      (price) => price.start_date <= date && price.end_date >= date,
    );

    return priceOverride?.price_override ?? listing.default_price ?? 0;
  }

  async findAll(
    reqDto: ListListingReqDto,
  ): Promise<OffsetPaginatedDto<ListingResDto>> {
    const query = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.host', 'host')
      .leftJoinAndSelect('listing.reservations', 'reservations')
      .leftJoinAndSelect('listing.prices', 'prices')
      .leftJoinAndSelect('listing.availabilities', 'availabilities')
      .where('listing.deleted_at IS NULL')
      .orderBy('listing.created_at', 'DESC');

    const [listings, metaDto] = await paginate<ListingEntity>(query, reqDto, {
      skipCount: false,
      takeAll: false,
    });

    return new OffsetPaginatedDto(
      plainToInstance(ListingResDto, listings, {
        excludeExtraneousValues: true,
      }),
      metaDto,
    );
  }

  async fetchAllByRegionId(
    regionId: number,
    reqDto: ListListingReqDto,
  ): Promise<OffsetPaginatedDto<ListingResDto>> {
    assert(regionId, 'Region ID is required');

    const query = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.host', 'host')
      .leftJoinAndSelect('listing.reservations', 'reservations')
      .leftJoinAndSelect('listing.prices', 'prices')
      .leftJoinAndSelect('listing.availabilities', 'availabilities')
      .where('listing.deleted_at IS NULL')
      .andWhere('listing.region_id = :regionId', { regionId })
      .orderBy('listing.created_at', 'DESC');

    const [listings, metaDto] = await paginate<ListingEntity>(query, reqDto, {
      skipCount: false,
      takeAll: false,
    });

    return new OffsetPaginatedDto(
      plainToInstance(ListingResDto, listings, {
        excludeExtraneousValues: true,
      }),
      metaDto,
    );
  }

  async findAllByHost(
    hostId: Uuid,
    reqDto: ListListingReqDto,
  ): Promise<OffsetPaginatedDto<ListingResDto>> {
    assert(hostId, 'Host ID is required');

    const query = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.host', 'host')
      .leftJoinAndSelect('listing.reservations', 'reservations')
      .leftJoinAndSelect('listing.prices', 'prices')
      .leftJoinAndSelect('listing.availabilities', 'availabilities')
      .where('listing.deleted_at IS NULL')
      .andWhere('listing.host_id = :hostId', { hostId })
      .orderBy('listing.created_at', 'DESC');

    const [listings, metaDto] = await paginate<ListingEntity>(query, reqDto, {
      skipCount: false,
      takeAll: false,
    });

    return new OffsetPaginatedDto(
      plainToInstance(ListingResDto, listings, {
        excludeExtraneousValues: true,
      }),
      metaDto,
    );
  }

  async getHostAggregates(hostId: Uuid): Promise<ListingAggregateResDto> {
    assert(hostId, 'Host ID is required');

    const statusCounts = await this.listingRepository
      .createQueryBuilder('listing')
      .select('listing.status', 'status')
      .addSelect('COUNT(listing.id)', 'count')
      .where('listing.host_id = :hostId', { hostId })
      .groupBy('listing.status')
      .getRawMany();

    const availabilityCounts = await this.listingRepository
      .createQueryBuilder('listing')
      .select(
        `CASE
          WHEN EXISTS (
            SELECT 1
            FROM reservations r
            WHERE r.listing_id = listing.id
              AND r.check_in_date <= NOW()
              AND r.check_out_date >= NOW()
              AND r.status NOT IN (:...excludedStatuses)
          ) THEN 'RESERVED'
          WHEN EXISTS (
            SELECT 1
            FROM availabilities a
            WHERE a.listing_id = listing.id
              AND a.start_date <= NOW()
              AND a.end_date >= NOW()
              AND a.availability_override = true
          ) THEN 'AVAILABLE'
          WHEN listing.default_availability = true THEN 'AVAILABLE'
          ELSE 'NOT_AVAILABLE'
        END`,
        'availability',
      )
      .addSelect('COUNT(listing.id)', 'count')
      .where('listing.host_id = :hostId', { hostId })
      .andWhere('listing.status = :status', {
        status: ListingStatus.LISTING_COMPLETED,
      })
      .setParameter('excludedStatuses', this.excludedStatuses)
      .groupBy('availability')
      .getRawMany();

    const totalListings = await this.listingRepository
      .createQueryBuilder('listing')
      .where('listing.host_id = :hostId', { hostId })
      .getCount();

    return plainToInstance(ListingAggregateResDto, {
      status_counts: plainToInstance(StatusCountDto, statusCounts),
      availability_counts: plainToInstance(
        AvailabilityCountDto,
        availabilityCounts,
      ),
      total_listings: totalListings,
    });
  }

  async loadMoreListings(
    reqDto: LoadMoreListingsReqDto,
  ): Promise<CursorPaginatedDto<ListingResDto>> {
    const queryBuilder = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.host', 'host')
      .leftJoinAndSelect('listing.reservations', 'reservations')
      .leftJoinAndSelect('listing.prices', 'prices')
      .leftJoinAndSelect('listing.availabilities', 'availabilities')
      .where('listing.deleted_at IS NULL');

    const paginator = buildPaginator({
      entity: ListingEntity,
      alias: 'listing',
      paginationKeys: ['created_at'],
      query: {
        limit: reqDto.limit,
        order: 'DESC',
        afterCursor: reqDto.afterCursor,
        beforeCursor: reqDto.beforeCursor,
      },
    });

    const { data, cursor } = await paginator.paginate(queryBuilder);

    const metaDto = new CursorPaginationDto(
      data.length,
      cursor.afterCursor,
      cursor.beforeCursor,
      reqDto,
    );

    return new CursorPaginatedDto(
      plainToInstance(ListingResDto, data, { excludeExtraneousValues: true }),
      metaDto,
    );
  }

  async findOne(id: Uuid): Promise<ListingResDto> {
    assert(id, 'id is required');

    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['host', 'reservations', 'prices', 'availabilities'],
    });

    if (!listing) {
      throw new ValidationException(ErrorCode.E001, 'Listing not found');
    }

    return plainToInstance(ListingResDto, listing, {
      excludeExtraneousValues: true,
    });
  }

  async findOneBySlug(slug: string): Promise<ListingResDto> {
    assert(slug, 'slug is required');

    const listing = await this.listingRepository.findOne({
      where: { slug },
      relations: ['host', 'reservations', 'prices', 'availabilities'],
    });

    if (!listing) {
      throw new ValidationException(ErrorCode.E001, 'Listing not found');
    }

    return plainToInstance(ListingResDto, listing, {
      excludeExtraneousValues: true,
    });
  }

  async update(id: Uuid, dto: UpdateListingDto): Promise<ListingResDto> {
    const listing = await this.listingRepository.findOne({
      where: { id },
    });

    if (!listing) {
      throw new ValidationException(ErrorCode.E001, 'Listing not found');
    }

    let slug: string;

    if (dto.status === ListingStatus.LISTING_DRAFT) {
      slug = `draft-${uuidv4()}`;
    } else {
      if (!dto.name) {
        slug = `listing-${uuidv4()}`;
      } else {
        slug = dto.name
          .toLowerCase()
          .replace(/ /g, '-')
          .replace(/[^\w-]+/g, '');
        const existingListing = await this.listingRepository.findOne({
          where: { slug },
        });

        if (existingListing && existingListing.id !== id) {
          slug = `${slug}-${uuidv4()}`;
        }
      }
    }

    const updatedListing = await this.listingRepository.save({
      ...listing,
      ...dto,
      slug,
    });

    this.logger.debug('Listing updated:', { id: updatedListing.id });

    return plainToInstance(ListingResDto, updatedListing, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: Uuid) {
    const listing = await this.listingRepository.findOne({
      where: { id },
    });

    if (!listing) {
      throw new ValidationException(ErrorCode.E001, 'Listing not found');
    }

    await this.listingRepository.softDelete(id);
    this.logger.debug('Listing soft deleted:', { id });
  }
}
