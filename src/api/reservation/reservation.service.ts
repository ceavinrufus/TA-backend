import { CursorPaginationDto } from '@/common/dto/cursor-pagination/cursor-pagination.dto';
import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { ReservationStatus } from '@/constants/entity.enum';
import { JobName } from '@/constants/job.constant';
import { buildPaginator } from '@/utils/cursor-pagination';
import { paginate } from '@/utils/offset-pagination';
import { InjectQueue } from '@nestjs/bullmq';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import assert from 'assert';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import { createHash } from 'crypto';
import { Brackets, Repository } from 'typeorm';
import { ListingEntity } from '../listing/entities/listing.entity';
import { CreateReservationDto } from './dto/create-reservation.req.dto';
import { ListReservationReqDto } from './dto/list-reservation.req.dto';
import { LoadMoreReservationsReqDto } from './dto/load-more-reservations.req.dto';
import { ReservationResDto } from './dto/reservation.res.dto';
import { UpdateReservationDto } from './dto/update-reservation.req.dto';
import { ReservationEntity } from './entities/reservation.entity';

/**
 * Service responsible for handling reservation-related operations.
 */
@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    @InjectRepository(ReservationEntity)
    private readonly reservationRepository: Repository<ReservationEntity>,
    @InjectRepository(ListingEntity)
    private readonly listingRepository: Repository<ListingEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectQueue('reservationQueue')
    private reservationQueue: Queue,
  ) {}

  /**
   * Checks if a date range is available for a given listing.
   *
   * @param listing_id - The ID of the listing.
   * @param check_in_date - The check-in date.
   * @param check_out_date - The check-out date.
   * @param excludeReservationId - Optional reservation ID to exclude from the check.
   * @returns A promise that resolves to a boolean indicating whether the date range is available.
   * @throws Error if the check-in or check-out date is invalid.
   */
  async isDateRangeAvailable(
    listing_id: Uuid,
    check_in_date: Date,
    check_out_date: Date,
    excludeReservationId?: Uuid,
  ): Promise<boolean> {
    if (!check_in_date || !check_out_date || check_in_date >= check_out_date) {
      throw new Error('Invalid check-in or check-out date');
    }

    // Define excluded statuses
    const excludedStatuses = [
      ReservationStatus.ORDER_CANCELED,
      ReservationStatus.ORDER_FAIL,
    ];

    const query = this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.listing_id = :listing_id', { listing_id })
      .andWhere('reservation.status NOT IN (:...excludedStatuses)', {
        excludedStatuses,
      })
      .andWhere(
        new Brackets((qb) => {
          qb.where(
            'reservation.check_in_date < :check_in_date AND reservation.check_out_date > :check_in_date',
            { check_in_date, check_out_date },
          )
            .orWhere(
              'reservation.check_in_date >= :check_in_date AND reservation.check_in_date < :check_out_date',
              { check_in_date, check_out_date },
            )
            .orWhere(
              'reservation.check_in_date <= :check_in_date AND reservation.check_out_date >= :check_out_date',
              { check_in_date, check_out_date },
            )
            .orWhere(
              'reservation.check_in_date >= :check_in_date AND reservation.check_out_date <= :check_out_date',
              { check_in_date, check_out_date },
            );
        }),
      );

    if (excludeReservationId) {
      query.andWhere('reservation.id != :excludeReservationId', {
        excludeReservationId,
      });
    }

    const conflictingReservations = await query.getCount();
    return conflictingReservations === 0;
  }

  /**
   * Generates a unique book_hash based on the reservation details.
   *
   * @param dto - The data transfer object containing reservation details.
   * @returns The generated book_hash.
   */
  generateBookHash(dto: CreateReservationDto): string {
    const {
      listing_id,
      check_in_date,
      check_out_date,
      night_staying,
      total_price,
      guest_number,
    } = dto;

    // Concatenate relevant reservation data
    const data = `${listing_id}-${check_in_date}-${check_out_date}-${night_staying}-${total_price}-${guest_number}`;

    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verifies the book_hash by checking if it matches the expected hash.
   *
   * @param receivedBookHash - The book_hash sent from the frontend.
   * @param dto - The reservation data to be hashed.
   * @returns Boolean indicating if the hash is valid.
   */
  private verifyBookHash(dto: CreateReservationDto): boolean {
    const generatedHash = this.generateBookHash(dto);
    return dto.book_hash === generatedHash;
  }

  /**
   * Creates a pre-reservation entry in Redis.
   * @param dto - The reservation details to store temporarily in Redis.
   * @returns A promise resolving to true if successful.
   */
  async storePreReservationInRedis(dto: CreateReservationDto): Promise<void> {
    const preReservationKey = `pre_reservation:${dto.book_hash}`;
    await this.cacheManager.set(
      preReservationKey,
      JSON.stringify(dto),
      3600 * 1000,
    ); // Store for 1 hour
  }

  /**
   * Retrieves a pre-reservation by its book_hash.
   *
   * @param bookHash - The unique book_hash.
   * @returns The reservation data from Redis.
   * @throws Error if pre-reservation is not found.
   */
  async getPreReservationFromRedis(
    bookHash: string,
  ): Promise<CreateReservationDto> {
    const preReservationKey = `pre_reservation:${bookHash}`;
    const preReservationData = await this.cacheManager.get(preReservationKey);

    if (!preReservationData) {
      throw new Error('Pre-reservation data not found');
    }

    return plainToInstance(
      CreateReservationDto,
      JSON.parse(preReservationData as string),
    );
  }

  private generateBookingNumber = (userId: string) => {
    const uniqueString = userId + Date.now() + Math.random().toString();
    const hash = createHash('sha256').update(uniqueString).digest('hex');
    return `SH-${hash.substring(0, 10).toUpperCase()}`;
  };

  /**
   * Creates a new reservation.
   *
   * @param dto - The data transfer object containing reservation details.
   * @returns A promise that resolves to the created reservation response DTO.
   * @throws Error if the selected date range is already reserved.
   */
  async create(dto: CreateReservationDto): Promise<ReservationResDto> {
    assert(dto.book_hash, 'book_hash is required');

    // Verify the book_hash
    if (!this.verifyBookHash(dto)) {
      throw new Error('The reservation details have been altered.');
    }

    const {
      listing_id,
      guest_id,
      host_id,
      base_price,
      tax,
      service_fee,
      night_staying,
      check_in_date,
      check_out_date,
      guest_number,
      total_price,
      guest_info,
      guest_wallet_address,
      status,
      book_hash,
      guest_did,
    } = dto;

    // Find the listing first
    const listing = await this.listingRepository.findOneByOrFail({
      id: listing_id as Uuid,
    });

    if (check_in_date && check_out_date) {
      const isAvailable = await this.isDateRangeAvailable(
        listing_id as Uuid,
        check_in_date,
        check_out_date,
      );

      if (!isAvailable) {
        throw new Error('The selected date range is already reserved.');
      }
    }

    const newReservation = new ReservationEntity({
      booking_number: this.generateBookingNumber(guest_id as string),
      listing_id: listing_id as Uuid,
      check_in_date,
      check_out_date,
      guest_id: guest_id as Uuid,
      host_id: (host_id as Uuid) || (listing.host_id as Uuid),
      listing_address: listing.address,
      listing_name: listing.name,
      base_price,
      tax,
      service_fee,
      night_staying,
      guest_number,
      total_price,
      guest_info: guest_info ? JSON.parse(JSON.stringify(guest_info)) : [],
      guest_wallet_address,
      status: status || ReservationStatus.ORDER_CREATED,
      book_hash,
      guest_did,
    });

    const savedReservation =
      await this.reservationRepository.save(newReservation);
    this.logger.debug(savedReservation);

    await this.reservationQueue.add(
      JobName.EXPIRE_RESERVATION,
      { reservationId: savedReservation.id },
      { delay: 15 * 60 * 1000, removeOnComplete: true, removeOnFail: false }, // 15 minutes delay
    );

    return plainToInstance(ReservationResDto, savedReservation);
  }

  /**
   * Retrieves all reservations with pagination.
   *
   * @param reqDto - The request DTO containing pagination details.
   * @returns A promise that resolves to an offset paginated DTO of reservation response DTOs.
   */
  async findAll(
    reqDto: ListReservationReqDto,
  ): Promise<OffsetPaginatedDto<ReservationResDto>> {
    const query = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.listing', 'listing')
      .orderBy('reservation.created_at', 'DESC');

    const [reservations, metaDto] = await paginate<ReservationEntity>(
      query,
      reqDto,
      {
        skipCount: false,
        takeAll: false,
      },
    );

    return new OffsetPaginatedDto(
      plainToInstance(ReservationResDto, reservations),
      metaDto,
    );
  }

  /**
   * Retrieves all reservations for a specific listing with pagination.
   *
   * @param listing_id - The ID of the listing.
   * @param reqDto - The request DTO containing pagination details.
   * @returns A promise that resolves to an offset paginated DTO of reservation response DTOs.
   */
  async findAllByListingId(
    listing_id: Uuid,
    reqDto: ListReservationReqDto,
  ): Promise<OffsetPaginatedDto<ReservationResDto>> {
    const query = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.listing', 'listing')
      .where('reservation.listing_id = :listing_id', { listing_id })
      .orderBy('reservation.created_at', 'DESC');

    const [reservations, metaDto] = await paginate<ReservationEntity>(
      query,
      reqDto,
      {
        skipCount: false,
        takeAll: false,
      },
    );

    return new OffsetPaginatedDto(
      plainToInstance(ReservationResDto, reservations),
      metaDto,
    );
  }

  /**
   * Retrieves all reservations for a specific host with pagination.
   *
   * @param host_id - The ID of the host.
   * @param reqDto - The request DTO containing pagination details.
   * @returns A promise that resolves to an offset paginated DTO of reservation response DTOs.
   */
  async findAllByHost(
    host_id: Uuid,
    reqDto: ListReservationReqDto,
  ): Promise<OffsetPaginatedDto<ReservationResDto>> {
    assert(host_id, 'Host ID is required');

    const query = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.listing', 'listing')
      .leftJoinAndSelect('reservation.dispute', 'dispute')
      .where('reservation.host_id = :host_id', { host_id })
      .andWhere('reservation.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [
          ReservationStatus.ORDER_CREATED,
          ReservationStatus.ORDER_WAITING_PAYMENT,
          ReservationStatus.ORDER_FAIL,
        ],
      })
      .orderBy('reservation.created_at', 'DESC');

    const [reservations, metaDto] = await paginate<ReservationEntity>(
      query,
      reqDto,
      {
        skipCount: false,
        takeAll: false,
      },
    );

    return new OffsetPaginatedDto(
      plainToInstance(ReservationResDto, reservations),
      metaDto,
    );
  }

  /**
   * Retrieves the number of guests checking in and checking out today for a specific host.
   *
   * @param host_id - The ID of the host.
   * @returns A promise that resolves to an object containing the number of guests checking in and checking out today.
   */
  async getGuestsCheckingInAndOutTodayForHost(host_id: Uuid): Promise<{
    check_ins: number;
    check_outs: number;
    total_reservations: number;
  }> {
    assert(host_id, 'Host ID is required');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const checkIns = await this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.host_id = :host_id', { host_id })
      .andWhere('reservation.check_in_date >= :today', { today })
      .andWhere('reservation.check_in_date < :tomorrow', { tomorrow })
      .andWhere('reservation.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [
          ReservationStatus.ORDER_CANCELED,
          ReservationStatus.ORDER_FAIL,
          ReservationStatus.ORDER_CREATED,
          ReservationStatus.ORDER_WAITING_PAYMENT,
        ],
      })
      .getCount();

    const checkOuts = await this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.host_id = :host_id', { host_id })
      .andWhere('reservation.check_out_date >= :today', { today })
      .andWhere('reservation.check_out_date < :tomorrow', { tomorrow })
      .andWhere('reservation.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [
          ReservationStatus.ORDER_CANCELED,
          ReservationStatus.ORDER_FAIL,
          ReservationStatus.ORDER_CREATED,
          ReservationStatus.ORDER_WAITING_PAYMENT,
        ],
      })
      .getCount();

    const totalReservations = await this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.host_id = :host_id', { host_id })
      .andWhere('reservation.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [
          ReservationStatus.ORDER_CREATED,
          ReservationStatus.ORDER_WAITING_PAYMENT,
          ReservationStatus.ORDER_FAIL,
        ],
      })
      .getCount();

    return {
      check_ins: checkIns,
      check_outs: checkOuts,
      total_reservations: totalReservations,
    };
  }

  /**
   * Retrieves earnings statistics for a host.
   *
   * @param host_id - The ID of the host.
   * @returns A promise that resolves to an object containing pending, monthly, and yearly earnings.
   */
  async getHostEarnings(host_id: Uuid): Promise<{
    pending_earnings: number;
    monthly_earnings: number;
    yearly_earnings: number;
  }> {
    assert(host_id, 'Host ID is required');

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const baseQuery = this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.host_id = :host_id', { host_id })
      .andWhere('reservation.status = :status', {
        status: ReservationStatus.ORDER_COMPLETED,
      });

    // Use a single query with CASE statements for better performance
    /**
     * Represents aggregated earnings data from reservations
     * @property {number} pending_earnings - Sum of base prices for reservations checked out in the last 7 days
     * @property {number} monthly_earnings - Sum of base prices for reservations checked out this month (excluding last 7 days)
     * @property {number} yearly_earnings - Sum of base prices for reservations checked out this year (excluding last 7 days)
     */
    const earnings = await baseQuery
      .select([
        'SUM(CASE WHEN reservation.check_out_date <= :now AND reservation.check_out_date > :sevenDaysAgo THEN reservation.base_price ELSE 0 END) as pending_earnings',
        'SUM(CASE WHEN reservation.check_out_date <= :sevenDaysAgo AND reservation.check_out_date >= :startOfMonth THEN reservation.base_price ELSE 0 END) as monthly_earnings',
        'SUM(CASE WHEN reservation.check_out_date <= :sevenDaysAgo AND reservation.check_out_date >= :startOfYear THEN reservation.base_price ELSE 0 END) as yearly_earnings',
      ])
      .setParameters({
        now,
        sevenDaysAgo,
        startOfMonth,
        startOfYear,
      })
      .getRawOne();

    return {
      pending_earnings: Number(earnings?.pending_earnings || 0),
      monthly_earnings: Number(earnings?.monthly_earnings || 0),
      yearly_earnings: Number(earnings?.yearly_earnings || 0),
    };
  }

  /**
   * Retrieves all reservations for a specific guest with pagination.
   *
   * @param guest_id - The ID of the guest.
   * @param reqDto - The request DTO containing pagination details.
   * @returns A promise that resolves to an offset paginated DTO of reservation response DTOs.
   */
  async findAllByGuest(
    guest_id: Uuid,
    category: 'all' | 'upcoming' | 'past' | 'cancelled' | 'paid' | 'not-paid',
    reqDto: ListReservationReqDto,
  ): Promise<OffsetPaginatedDto<ReservationResDto>> {
    assert(guest_id, 'Guest ID is required');

    const query = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.listing', 'listing')
      .where('reservation.guest_id = :guest_id', { guest_id });

    const now = new Date();

    switch (category) {
      case 'upcoming':
        query
          .andWhere('reservation.check_out_date > :now', { now })
          .andWhere('reservation.status NOT IN (:...canceledStatuses)', {
            canceledStatuses: [
              ReservationStatus.ORDER_CANCELED,
              ReservationStatus.ORDER_FAIL,
            ],
          });
        break;
      case 'past':
        query.andWhere('reservation.check_out_date < :now', { now });
        break;
      case 'cancelled':
        query.andWhere('reservation.status IN (:...canceledStatuses)', {
          canceledStatuses: [
            ReservationStatus.ORDER_CANCELED,
            ReservationStatus.ORDER_FAIL,
          ],
        });
        break;
      case 'paid':
        query.andWhere('reservation.status IN (:...paidStatuses)', {
          paidStatuses: [
            ReservationStatus.ORDER_COMPLETED,
            ReservationStatus.ORDER_PAID_COMPLETED,
            ReservationStatus.ORDER_PAID_PARTIAL,
            ReservationStatus.REFUND_COMPLETED,
            ReservationStatus.REFUND_FAIL,
            ReservationStatus.REFUND_PENDING,
          ],
        });
        break;
      case 'not-paid':
        query.andWhere('reservation.status IN (:...notPaidStatuses)', {
          notPaidStatuses: [
            ReservationStatus.ORDER_CREATED,
            ReservationStatus.ORDER_WAITING_PAYMENT,
          ],
        });
        break;
    }

    query.orderBy('reservation.created_at', 'DESC');

    const [reservations, metaDto] = await paginate<ReservationEntity>(
      query,
      reqDto,
      {
        skipCount: false,
        takeAll: false,
      },
    );

    return new OffsetPaginatedDto(
      plainToInstance(ReservationResDto, reservations),
      metaDto,
    );
  }

  /**
   * Loads more reservations using cursor-based pagination.
   *
   * @param reqDto - The request DTO containing cursor pagination details.
   * @returns A promise that resolves to a cursor paginated DTO of reservation response DTOs.
   */
  async loadMoreReservations(
    reqDto: LoadMoreReservationsReqDto,
  ): Promise<CursorPaginatedDto<ReservationResDto>> {
    const queryBuilder = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.listing', 'listing');

    const paginator = buildPaginator({
      entity: ReservationEntity,
      alias: 'reservation',
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
      plainToInstance(ReservationResDto, data),
      metaDto,
    );
  }

  /**
   * Retrieves a reservation by its ID.
   *
   * @param id - The ID of the reservation.
   * @returns A promise that resolves to the reservation response DTO.
   * @throws Error if the reservation is not found.
   */
  async findOne(id: Uuid): Promise<ReservationResDto> {
    assert(id, 'id is required');

    const reservation = await this.reservationRepository.findOneOrFail({
      where: { id },
      relations: ['listing', 'dispute', 'payments'],
    });

    return plainToInstance(ReservationResDto, reservation);
  }

  /**
   * Updates an existing reservation.
   *
   * @param id - The ID of the reservation to update.
   * @param updateReservationDto - The data transfer object containing updated reservation details.
   * @returns A promise that resolves to the updated reservation response DTO.
   * @throws Error if the selected date range is already reserved.
   */
  async update(id: Uuid, updateReservationDto: UpdateReservationDto) {
    const reservation = await this.reservationRepository.findOneByOrFail({
      id,
    });

    const { check_in_date, check_out_date, listing_id } = updateReservationDto;

    // Only check for availability if dates have changed
    if (
      check_in_date &&
      check_out_date &&
      (check_in_date !== reservation.check_in_date ||
        check_out_date !== reservation.check_out_date)
    ) {
      const isAvailable = await this.isDateRangeAvailable(
        listing_id || reservation.listing_id,
        check_in_date,
        check_out_date,
        id, // Exclude the current reservation
      );

      if (!isAvailable) {
        throw new Error('The selected date range is already reserved.');
      }
    }

    Object.assign(reservation, updateReservationDto);

    // Wrap update in a transaction for consistency
    const updatedReservation =
      await this.reservationRepository.manager.transaction(
        async (transactionalEntityManager) => {
          return await transactionalEntityManager.save(reservation);
        },
      );

    this.logger.debug(updatedReservation);

    return plainToInstance(ReservationResDto, updatedReservation);
  }

  /**
   * Soft deletes a reservation by its ID.
   *
   * @param id - The ID of the reservation to delete.
   * @returns A promise that resolves when the reservation is deleted.
   * @throws Error if the reservation is not found.
   */
  async remove(id: Uuid) {
    await this.reservationRepository.findOneByOrFail({ id });
    await this.reservationRepository.softDelete({ id });
  }
}
