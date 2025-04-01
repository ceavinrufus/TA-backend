import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { ApiAuth } from '@/decorators/http.decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { DisputeService } from './dispute.service';
import { CreateDisputeDto } from './dto/create-dispute.req.dto';
import { DisputeResDto } from './dto/dispute.res.dto';
import { ListDisputeReqDto } from './dto/list-dispute.req.dto';
import { LoadMoreDisputesReqDto } from './dto/load-more-disputes.req.dto';
import { UpdateDisputeDto } from './dto/update-dispute.req.dto';

@ApiTags('disputes')
@Controller({
  path: 'disputes',
  version: '1',
})
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @Post()
  @ApiAuth({
    type: DisputeResDto,
    summary: 'Create a new dispute',
    statusCode: HttpStatus.CREATED,
  })
  async create(
    @Body() createDisputeDto: CreateDisputeDto,
  ): Promise<DisputeResDto> {
    return await this.disputeService.create(createDisputeDto);
  }

  @Get()
  @ApiAuth({
    type: DisputeResDto,
    summary: 'List all disputes with pagination',
    isPaginated: true,
  })
  async findAll(
    @Query() reqDto: ListDisputeReqDto,
  ): Promise<OffsetPaginatedDto<DisputeResDto>> {
    return await this.disputeService.findAll(reqDto);
  }

  @Get('/load-more')
  @ApiAuth({
    type: DisputeResDto,
    summary: 'Load more disputes with cursor pagination',
    isPaginated: true,
    paginationType: 'cursor',
  })
  async loadMore(
    @Query() reqDto: LoadMoreDisputesReqDto,
  ): Promise<CursorPaginatedDto<DisputeResDto>> {
    return await this.disputeService.loadMoreDisputes(reqDto);
  }

  @Get(':id')
  @ApiAuth({
    type: DisputeResDto,
    summary: 'Find a dispute by id',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Dispute ID',
  })
  async findOne(@Param('id') id: Uuid): Promise<DisputeResDto> {
    return await this.disputeService.findOne(id);
  }

  @Patch(':id')
  @ApiAuth({
    summary: 'Update a dispute by id',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Dispute ID',
  })
  update(@Param('id') id: Uuid, @Body() updateDisputeDto: UpdateDisputeDto) {
    return this.disputeService.update(id, updateDisputeDto);
  }

  @Delete(':id')
  @ApiAuth({
    summary: 'Delete a dispute by id',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Dispute ID',
  })
  remove(@Param('id') id: Uuid) {
    return this.disputeService.remove(id);
  }
}
