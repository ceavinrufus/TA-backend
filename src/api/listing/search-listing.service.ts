import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { ListingStatus, ReservationStatus } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { paginate } from '@/utils/offset-pagination';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import assert from 'assert';
import { plainToInstance } from 'class-transformer';
import { Brackets, Repository } from 'typeorm';
import { SearchListingDto } from './dto/search-listing.req.dto';
import { SearchListingResDto } from './dto/search-listing.res.dto';
import { ListingEntity } from './entities/listing.entity';

@Injectable()
export class SearchListingService {
  private readonly logger = new Logger(SearchListingService.name);

  private readonly excludedStatuses = [
    ReservationStatus.ORDER_CANCELED,
    ReservationStatus.ORDER_FAIL,
  ];

  constructor(
    @InjectRepository(ListingEntity)
    private readonly listingRepository: Repository<ListingEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async search(dto: SearchListingDto) {
    const use_cache = dto.use_cache !== false; // Default to true if not specified

    // Check Redis cache first if caching is enabled
    if (use_cache) {
      const cachedResults = await this.getCachedSearch(dto);
      if (cachedResults) {
        this.logger.log('Cache hit for search');
        return cachedResults;
      } else {
        this.logger.log('Cache miss for search');
      }
    }

    const cacheKey = this.getSearchCacheKey(dto);

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
        throw new ValidationException(ErrorCode.V002, 'Invalid sorting field');
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

    const result = new OffsetPaginatedDto(resultListings, metaDto);

    // Store the result in Redis cache if caching is enabled
    if (use_cache) {
      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(result),
        5 * 60 * 1000,
      ); // Cache for 5 mins
    }

    return result;
  }

  private getSearchCacheKey(dto: SearchListingDto): string {
    const filters = JSON.stringify(dto.filters || {});
    const params = JSON.stringify(dto.params || {});
    const pagination = JSON.stringify(dto.pagination || {});
    return `search:${filters}:${params}:${pagination}`;
  }

  async getCachedSearch(
    dto: SearchListingDto,
  ): Promise<OffsetPaginatedDto<SearchListingResDto> | null> {
    const cacheKey = this.getSearchCacheKey(dto);
    const cachedSearchResults = await this.cacheManager.get(cacheKey);
    if (cachedSearchResults) {
      this.logger.log(`Cache hit for search check: ${cacheKey}`);
      return JSON.parse(cachedSearchResults as string);
    }
    this.logger.log(`Cache miss for search check: ${cacheKey}`);
    return null;
  }

  async checkAvailability(
    slug: string,
    startDate: Date,
    endDate: Date,
    guests?: { adults?: number; children?: number[] },
    use_cache: boolean = true, // Optional parameter to control caching
  ): Promise<SearchListingResDto> {
    assert(slug, 'Listing slug is required');
    assert(startDate, 'Start date is required');
    assert(endDate, 'End date is required');

    if (startDate >= endDate) {
      throw new ValidationException(
        ErrorCode.V002,
        'Start date must be before end date',
      );
    }

    const today = new Date();
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    // Check Redis cache first if caching is enabled
    if (use_cache) {
      const cachedAvailability = await this.getCachedAvailability(
        slug,
        startDate,
        endDate,
      );
      if (cachedAvailability) {
        this.logger.log(`Cache hit for availability: ${slug}`);
        return cachedAvailability;
      } else {
        this.logger.log(`Cache miss for availability: ${slug}`);
      }
    }

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
      await this.cacheAvailability(slug, startDate, endDate, null);
      throw new ValidationException(
        ErrorCode.V003,
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
    const result = plainToInstance(
      SearchListingResDto,
      {
        ...listing,
        daily_price: dailyPrices,
        total_price: totalPrice,
      },
      { excludeExtraneousValues: true },
    );

    // Cache the availability result if caching is enabled
    if (use_cache) {
      await this.cacheAvailability(slug, startDate, endDate, result);
    }

    return result;
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

  private async cacheAvailability(
    slug: string,
    startDate: Date,
    endDate: Date,
    availability: SearchListingResDto | null,
  ): Promise<void> {
    const key = `availability:${slug}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const value =
      availability === null ? 'NOT_FOUND' : JSON.stringify(availability);
    await this.cacheManager.set(key, value, 5 * 60 * 1000); // Cache for 5 mins
  }

  private async getCachedAvailability(
    slug: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SearchListingResDto | null> {
    const key = `availability:${slug}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cachedData = await this.cacheManager.get(key);
    if (cachedData === 'NOT_FOUND') {
      throw new ValidationException(
        ErrorCode.V003,
        'Listing not found or not available for the selected dates',
      );
    }
    return cachedData ? JSON.parse(cachedData as string) : null;
  }
}
