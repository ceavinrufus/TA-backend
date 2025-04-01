import { CursorPaginationDto } from '@/common/dto/cursor-pagination/cursor-pagination.dto';
import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { buildPaginator } from '@/utils/cursor-pagination';
import { paginate } from '@/utils/offset-pagination';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';
import { AvailabilityResDto } from './dto/availability.res.dto';
import { CreateAvailabilityDto } from './dto/create-availability.req.dto';
import { ListAvailabilityReqDto } from './dto/list-availability.req.dto';
import { LoadMoreAvailabilitiesReqDto } from './dto/load-more-availabilities.req.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.req.dto';
import { AvailabilityEntity } from './entities/availability.entity';

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    @InjectRepository(AvailabilityEntity)
    private readonly availabilityRepository: Repository<AvailabilityEntity>,
  ) {}

  async create(dto: CreateAvailabilityDto): Promise<AvailabilityResDto> {
    const { listing_id, start_date, end_date, availability_override } = dto;

    // Check uniqueness of availability
    const existingAvailability = await this.availabilityRepository.findOne({
      where: { listing_id, start_date, end_date },
    });

    if (existingAvailability) {
      throw new ValidationException(ErrorCode.E001);
    }

    const newAvailability = new AvailabilityEntity({
      listing_id,
      start_date,
      end_date,
      availability_override,
    });

    const savedAvailability =
      await this.availabilityRepository.save(newAvailability);
    this.logger.debug(savedAvailability);

    return plainToInstance(AvailabilityResDto, savedAvailability);
  }

  async findAll(
    reqDto: ListAvailabilityReqDto,
  ): Promise<OffsetPaginatedDto<AvailabilityResDto>> {
    const query = this.availabilityRepository
      .createQueryBuilder('availability')
      .orderBy('availability.created_at', 'DESC');

    const [availabilities, metaDto] = await paginate<AvailabilityEntity>(
      query,
      reqDto,
      {
        skipCount: false,
        takeAll: false,
      },
    );

    return new OffsetPaginatedDto(
      plainToInstance(AvailabilityResDto, availabilities),
      metaDto,
    );
  }

  async loadMoreAvailabilities(
    reqDto: LoadMoreAvailabilitiesReqDto,
  ): Promise<CursorPaginatedDto<AvailabilityResDto>> {
    const queryBuilder =
      this.availabilityRepository.createQueryBuilder('availability');
    const paginator = buildPaginator({
      entity: AvailabilityEntity,
      alias: 'availability',
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
      plainToInstance(AvailabilityResDto, data),
      metaDto,
    );
  }

  async findOne(
    listing_id: Uuid,
    start_date: Date,
    end_date: Date,
  ): Promise<AvailabilityResDto> {
    const availability = await this.availabilityRepository.findOneByOrFail({
      listing_id,
      start_date,
      end_date,
    });
    return availability.toDto(AvailabilityResDto);
  }

  async update(
    listing_id: Uuid,
    start_date: Date,
    end_date: Date,
    updateAvailabilityDto: UpdateAvailabilityDto,
  ) {
    const availability = await this.availabilityRepository.findOneByOrFail({
      listing_id,
      start_date,
      end_date,
    });

    availability.start_date = updateAvailabilityDto.start_date;
    availability.end_date = updateAvailabilityDto.end_date;
    availability.availability_override =
      updateAvailabilityDto.availability_override;

    await this.availabilityRepository.save(availability);
  }

  async remove(listing_id: Uuid, start_date: Date, end_date: Date) {
    await this.availabilityRepository.findOneByOrFail({
      listing_id,
      start_date,
      end_date,
    });
    await this.availabilityRepository.softDelete({
      listing_id,
      start_date,
      end_date,
    });
  }
}
