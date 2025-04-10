import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { CheckPriceDto } from './dto/check-price.req.dto';
import { CreateListingDto } from './dto/create-listing.req.dto';
import { ListListingReqDto } from './dto/list-listing.req.dto';
import { ListingAggregateResDto } from './dto/listing-aggregate.res.dto';
import { ListingResDto } from './dto/listing.res.dto';
import { LoadMoreListingsReqDto } from './dto/load-more-listings.req.dto';
import { SearchListingDto } from './dto/search-listing.req.dto';
import { SearchListingResDto } from './dto/search-listing.res.dto';
import { UpdateListingDto } from './dto/update-listing.req.dto';
import { ListingService } from './listing.service';
import { SearchListingService } from './search-listing.service';

@ApiTags('listings')
@Controller({
  path: 'listings',
  version: '1',
})
export class ListingController {
  constructor(
    private readonly listingService: ListingService,
    private readonly searchListingService: SearchListingService,
  ) {}

  @Post()
  @ApiAuth({
    type: ListingResDto,
    summary: 'Create listing',
    statusCode: HttpStatus.CREATED,
  })
  async create(
    @Body() createListingDto: CreateListingDto,
  ): Promise<ListingResDto> {
    return await this.listingService.create(createListingDto);
  }

  @Post('/search')
  @ApiPublic({
    type: SearchListingResDto,
    summary: 'Search listings with filters and pagination',
    isPaginated: true,
  })
  async search(
    @Body() searchListingDto: SearchListingDto,
  ): Promise<OffsetPaginatedDto<SearchListingResDto>> {
    return await this.searchListingService.search(searchListingDto);
  }

  @Post(':slug/check-availability')
  @ApiPublic({
    summary: 'Check listing availability and get price details',
  })
  @ApiParam({ name: 'slug', type: 'string' })
  async checkAvailability(
    @Param('slug') slug: string,
    @Body() reqDto: CheckPriceDto,
  ): Promise<SearchListingResDto> {
    return await this.searchListingService.checkAvailability(
      slug,
      reqDto.startDate,
      reqDto.endDate,
      reqDto.guests,
      reqDto.use_cache,
    );
  }

  @Get()
  @ApiPublic({
    type: ListingResDto,
    summary: 'List listings',
    isPaginated: true,
  })
  async findAll(
    @Query() reqDto: ListListingReqDto,
  ): Promise<OffsetPaginatedDto<ListingResDto>> {
    return await this.listingService.findAll(reqDto);
  }

  @Get('/region/:regionId')
  @ApiPublic({
    type: ListingResDto,
    summary: 'List listings by region',
    isPaginated: true,
  })
  @ApiParam({ name: 'regionId', type: 'number' })
  async findAllByRegion(
    @Param('regionId') regionId: number,
    @Query() reqDto: ListListingReqDto,
  ): Promise<OffsetPaginatedDto<ListingResDto>> {
    return await this.listingService.fetchAllByRegionId(regionId, reqDto);
  }

  @Get('/host')
  @ApiAuth({
    type: ListingResDto,
    summary: 'List listings by host',
    isPaginated: true,
  })
  async findAllByHost(
    @CurrentUser('id') hostId: Uuid,
    @Query() reqDto: ListListingReqDto,
  ): Promise<OffsetPaginatedDto<ListingResDto>> {
    return await this.listingService.findAllByHost(hostId, reqDto);
  }

  @Get('/host/aggregates')
  @ApiAuth({
    type: ListingAggregateResDto,
    summary: 'Get host aggregates',
  })
  async getHostAggregates(
    @CurrentUser('id') hostId: Uuid,
  ): Promise<ListingAggregateResDto> {
    return await this.listingService.getHostAggregates(hostId);
  }

  @Get('/load-more')
  @ApiPublic({
    type: ListingResDto,
    summary: 'Load more listings',
    isPaginated: true,
    paginationType: 'cursor',
  })
  async loadMore(
    @Query() reqDto: LoadMoreListingsReqDto,
  ): Promise<CursorPaginatedDto<ListingResDto>> {
    return await this.listingService.loadMoreListings(reqDto);
  }

  @Get(':id')
  @ApiPublic({ type: ListingResDto, summary: 'Find listing by id' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOne(@Param('id', ParseUUIDPipe) id: Uuid): Promise<ListingResDto> {
    return await this.listingService.findOne(id);
  }

  @Get('/slug/:slug')
  @ApiPublic({ type: ListingResDto, summary: 'Find listing by slug' })
  @ApiParam({ name: 'slug', type: 'string' })
  async findOneBySlug(@Param('slug') slug: string): Promise<ListingResDto> {
    return await this.listingService.findOneBySlug(slug);
  }

  @Patch(':id')
  @ApiAuth({ type: ListingResDto, summary: 'Update listing' })
  @ApiParam({ name: 'id', type: 'string' })
  update(
    @Param('id', ParseUUIDPipe) id: Uuid,
    @Body() reqDto: UpdateListingDto,
  ) {
    return this.listingService.update(id, reqDto);
  }

  @Delete(':id')
  @ApiAuth({
    summary: 'Delete listing',
    errorResponses: [400, 401, 403, 404, 500],
  })
  @ApiParam({ name: 'id', type: 'String' })
  remove(@Param('id', ParseUUIDPipe) id: Uuid) {
    return this.listingService.remove(id);
  }
}
