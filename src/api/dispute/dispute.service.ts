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
import { CreateDisputeDto } from './dto/create-dispute.req.dto';
import { DisputeResDto } from './dto/dispute.res.dto';
import { ListDisputeReqDto } from './dto/list-dispute.req.dto';
import { LoadMoreDisputesReqDto } from './dto/load-more-disputes.req.dto';
import { UpdateDisputeDto } from './dto/update-dispute.req.dto';
import { DisputeEntity } from './entities/dispute.entity';

@Injectable()
export class DisputeService {
  private readonly logger = new Logger(DisputeService.name);

  constructor(
    @InjectRepository(DisputeEntity)
    private readonly disputeRepository: Repository<DisputeEntity>,
  ) {}

  async create(dto: CreateDisputeDto): Promise<DisputeResDto> {
    const existingDispute = await this.disputeRepository.findOne({
      where: { reservation_id: dto.reservation_id },
    });

    if (existingDispute) {
      throw new ValidationException(ErrorCode.V004);
    }

    const newDispute = new DisputeEntity({
      ...dto,
      raised_at: new Date(),
    });

    const savedDispute = await this.disputeRepository.save(newDispute);
    return plainToInstance(DisputeResDto, savedDispute);
  }

  async findAll(
    reqDto: ListDisputeReqDto,
  ): Promise<OffsetPaginatedDto<DisputeResDto>> {
    const query = this.disputeRepository
      .createQueryBuilder('dispute')
      .orderBy('dispute.created_at', 'DESC');

    const [disputes, metaDto] = await paginate<DisputeEntity>(query, reqDto, {
      skipCount: false,
      takeAll: false,
    });

    return new OffsetPaginatedDto(
      plainToInstance(DisputeResDto, disputes),
      metaDto,
    );
  }

  async loadMoreDisputes(
    reqDto: LoadMoreDisputesReqDto,
  ): Promise<CursorPaginatedDto<DisputeResDto>> {
    const queryBuilder = this.disputeRepository.createQueryBuilder('dispute');
    const paginator = buildPaginator({
      entity: DisputeEntity,
      alias: 'dispute',
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
      plainToInstance(DisputeResDto, data),
      metaDto,
    );
  }

  async findOne(id: Uuid): Promise<DisputeResDto> {
    const dispute = await this.disputeRepository.findOneByOrFail({ id });
    return plainToInstance(DisputeResDto, dispute);
  }

  async update(id: Uuid, updateDisputeDto: UpdateDisputeDto) {
    const dispute = await this.disputeRepository.findOneByOrFail({ id });
    const updatedDispute = { ...dispute, ...updateDisputeDto };
    await this.disputeRepository.save(updatedDispute);
  }

  async remove(id: Uuid) {
    await this.disputeRepository.findOneByOrFail({ id });
    await this.disputeRepository.softDelete({ id });
  }
}
