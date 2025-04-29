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
import { ListingEntity } from '../listing/entities/listing.entity';
import { ReservationEntity } from '../reservation/entities/reservation.entity';
import { CreateUserReqDto } from './dto/create-user.req.dto';
import { ListUserReqDto } from './dto/list-user.req.dto';
import { LoadMoreUsersReqDto } from './dto/load-more-users.req.dto';
import { UpdateUserReqDto } from './dto/update-user.req.dto';
import { UserResDto } from './dto/user.res.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ListingEntity)
    private readonly listingRepository: Repository<ListingEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservationRepository: Repository<ReservationEntity>,
  ) {}

  async create(dto: CreateUserReqDto): Promise<UserResDto> {
    const { name, email, wallet_address } = dto;

    const user = await this.userRepository.findOne({
      where: [
        {
          wallet_address,
        },
      ],
    });

    if (user) {
      throw new ValidationException(ErrorCode.V004);
    }

    const newUser = new UserEntity({
      name,
      email,
      wallet_address,
      is_verified: false,
      is_anonymous: false,
    });

    const savedUser = await this.userRepository.save(newUser);
    this.logger.debug(savedUser);

    return plainToInstance(UserResDto, savedUser);
  }

  private async checkHasListedListing(userId: Uuid): Promise<boolean> {
    const listingCount = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('listings', 'listing', 'listing.host_id = user.id')
      .where('user.id = :userId', { userId })
      .andWhere('listing.status = :status', {
        status: ListingStatus.LISTING_COMPLETED,
      })
      .getCount();

    return listingCount > 0;
  }

  private checkIsProfileComplete(user: UserEntity): boolean {
    // user.name &&
    // user.email &&
    return !!user.wallet_address;
  }

  async findAll(
    reqDto: ListUserReqDto,
  ): Promise<OffsetPaginatedDto<UserResDto>> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.created_at', 'DESC');
    const [users, metaDto] = await paginate<UserEntity>(query, reqDto, {
      skipCount: false,
      takeAll: false,
    });

    const userDtos = await Promise.all(
      users.map(async (user) => {
        const hasListedListing = await this.checkHasListedListing(user.id);
        const isProfileComplete = this.checkIsProfileComplete(user);

        const userDto = user.toDto(UserResDto);
        userDto.has_listed_listing = hasListedListing;
        userDto.is_profile_complete = isProfileComplete;

        return userDto;
      }),
    );

    return new OffsetPaginatedDto(
      plainToInstance(UserResDto, userDtos),
      metaDto,
    );
  }

  async loadMoreUsers(
    reqDto: LoadMoreUsersReqDto,
  ): Promise<CursorPaginatedDto<UserResDto>> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    const paginator = buildPaginator({
      entity: UserEntity,
      alias: 'user',
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

    return new CursorPaginatedDto(plainToInstance(UserResDto, data), metaDto);
  }

  async findOne(id: Uuid): Promise<UserResDto> {
    assert(id, 'id is required');
    const user = await this.userRepository.findOneByOrFail({ id });

    const hasListedListing = await this.checkHasListedListing(id);
    const isProfileComplete = this.checkIsProfileComplete(user);

    const userDto = user.toDto(UserResDto);
    userDto.has_listed_listing = hasListedListing;
    userDto.is_profile_complete = isProfileComplete;

    return userDto;
  }

  async getUserStats(id: Uuid) {
    await this.userRepository.findOneByOrFail({ id });

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const [totalReservations, totalListings, totalEarnings] = await Promise.all(
      [
        // Get total reservations where user is host
        this.reservationRepository
          .createQueryBuilder('reservation')
          .where('reservation.host_id = :id', { id })
          .andWhere('reservation.status NOT IN (:...excludedStatuses)', {
            excludedStatuses: [
              ReservationStatus.ORDER_CREATED,
              ReservationStatus.ORDER_WAITING_PAYMENT,
            ],
          })
          .getCount(),

        // Get total listings
        this.listingRepository
          .createQueryBuilder('listing')
          .where('listing.host_id = :id', { id })
          .andWhere('listing.status = :status', {
            status: ListingStatus.LISTING_COMPLETED,
          })
          .getCount(),

        // Calculate total earnings from completed reservations
        this.reservationRepository
          .createQueryBuilder('reservation')
          .where('reservation.host_id = :id', { id })
          .andWhere('reservation.status = :status', {
            status: ReservationStatus.ORDER_COMPLETED,
          })
          .andWhere('reservation.check_out_date <= :sevenDaysAgo', {
            sevenDaysAgo,
          })
          .select('SUM(reservation.total_price)', 'total')
          .getRawOne(),
      ],
    );

    return {
      totalReservations,
      totalListings,
      totalEarnings: totalEarnings?.total || 0,
    };
  }

  async update(id: Uuid, dto: UpdateUserReqDto) {
    const user = await this.userRepository.findOneByOrFail({ id });
    const updatedUser = await this.userRepository.save({
      ...user,
      ...dto,
    });
    return plainToInstance(UserResDto, updatedUser);
  }

  async remove(id: Uuid) {
    await this.userRepository.findOneByOrFail({ id });
    await this.userRepository.softDelete(id);
  }
}
