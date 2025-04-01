import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
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
import { AvailabilityService } from './availability.service';
import { AvailabilityResDto } from './dto/availability.res.dto';
import { CreateAvailabilityDto } from './dto/create-availability.req.dto';
import { ListAvailabilityReqDto } from './dto/list-availability.req.dto';
import { LoadMoreAvailabilitiesReqDto } from './dto/load-more-availabilities.req.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.req.dto';

@ApiTags('availabilities')
@Controller({
  path: 'availabilities',
  version: '1',
})
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  @ApiAuth({
    type: AvailabilityResDto,
    summary: 'Create a new availability entry',
    statusCode: HttpStatus.CREATED,
  })
  async create(
    @Body() createAvailabilityDto: CreateAvailabilityDto,
  ): Promise<AvailabilityResDto> {
    return await this.availabilityService.create(createAvailabilityDto);
  }

  @Get()
  @ApiAuth({
    type: AvailabilityResDto,
    summary: 'List all availabilities with pagination',
    isPaginated: true,
  })
  async findAll(
    @Query() reqDto: ListAvailabilityReqDto,
  ): Promise<OffsetPaginatedDto<AvailabilityResDto>> {
    return await this.availabilityService.findAll(reqDto);
  }

  @Get('/load-more')
  @ApiAuth({
    type: AvailabilityResDto,
    summary: 'Load more availabilities with cursor pagination',
    isPaginated: true,
    paginationType: 'cursor',
  })
  async loadMore(
    @Query() reqDto: LoadMoreAvailabilitiesReqDto,
  ): Promise<CursorPaginatedDto<AvailabilityResDto>> {
    return await this.availabilityService.loadMoreAvailabilities(reqDto);
  }

  @Get(':listing_id/:start_date/:end_date')
  @ApiPublic({
    type: AvailabilityResDto,
    summary: 'Find an availability by listing_id, start_date, and end_date',
  })
  @ApiParam({
    name: 'listing_id',
    type: 'string',
    description: 'Listing group ID',
  })
  @ApiParam({
    name: 'start_date',
    type: 'string',
    description: 'Start date of the availability period',
  })
  @ApiParam({
    name: 'end_date',
    type: 'string',
    description: 'End date of the availability period',
  })
  async findOne(
    @Param('listing_id') listing_id: Uuid,
    @Param('start_date') start_date: string,
    @Param('end_date') end_date: string,
  ): Promise<AvailabilityResDto> {
    return await this.availabilityService.findOne(
      listing_id,
      new Date(start_date),
      new Date(end_date),
    );
  }

  @Patch(':listing_id/:start_date/:end_date')
  @ApiAuth({
    type: AvailabilityResDto,
    summary: 'Update an availability by listing_id, start_date, and end_date',
  })
  @ApiParam({
    name: 'listing_id',
    type: 'string',
    description: 'Listing group ID',
  })
  @ApiParam({
    name: 'start_date',
    type: 'string',
    description: 'Start date of the availability period',
  })
  @ApiParam({
    name: 'end_date',
    type: 'string',
    description: 'End date of the availability period',
  })
  update(
    @Param('listing_id') listing_id: Uuid,
    @Param('start_date') start_date: string,
    @Param('end_date') end_date: string,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.update(
      listing_id,
      new Date(start_date),
      new Date(end_date),
      updateAvailabilityDto,
    );
  }

  @Delete(':listing_id/:start_date/:end_date')
  @ApiAuth({
    summary: 'Delete an availability by listing_id, start_date, and end_date',
    errorResponses: [400, 401, 403, 404, 500],
  })
  @ApiParam({
    name: 'listing_id',
    type: 'string',
    description: 'Listing group ID',
  })
  @ApiParam({
    name: 'start_date',
    type: 'string',
    description: 'Start date of the availability period',
  })
  @ApiParam({
    name: 'end_date',
    type: 'string',
    description: 'End date of the availability period',
  })
  remove(
    @Param('listing_id') listing_id: Uuid,
    @Param('start_date') start_date: string,
    @Param('end_date') end_date: string,
  ) {
    return this.availabilityService.remove(
      listing_id,
      new Date(start_date),
      new Date(end_date),
    );
  }
}
