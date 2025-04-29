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
import { Repository } from 'typeorm';
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
      throw new ValidationException(ErrorCode.V003, 'Listing not found');
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
      throw new ValidationException(ErrorCode.V003, 'Listing not found');
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
      throw new ValidationException(ErrorCode.V003, 'Listing not found');
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
      throw new ValidationException(ErrorCode.V003, 'Listing not found');
    }

    await this.listingRepository.softDelete(id);
    this.logger.debug('Listing soft deleted:', { id });
  }
}
