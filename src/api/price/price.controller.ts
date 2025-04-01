import { ApiPublic } from '@/decorators/http.decorators';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PriceService } from './price.service';

@ApiTags('prices')
@Controller({
  path: 'prices',
  version: '1',
})
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get('exchange-rate')
  @ApiPublic({
    summary: 'Get exchange rate between two currencies',
  })
  async getExchangeRate(
    @Query('from_currency') from_currency: string,
    @Query('to_currency') to_currency: string,
  ): Promise<number> {
    return await this.priceService.fetchExchangeRate(
      from_currency,
      to_currency,
    );
  }

  // @Post()
  // @ApiAuth({
  //   type: PriceResDto,
  //   summary: 'Create a new price entry',
  //   statusCode: HttpStatus.CREATED,
  // })
  // async create(@Body() createPriceDto: CreatePriceDto): Promise<PriceResDto> {
  //   return await this.priceService.create(createPriceDto);
  // }

  // @Get()
  // @ApiAuth({
  //   type: PriceResDto,
  //   summary: 'List all prices with pagination',
  //   isPaginated: true,
  // })
  // async findAll(
  //   @Query() reqDto: ListPriceReqDto,
  // ): Promise<OffsetPaginatedDto<PriceResDto>> {
  //   return await this.priceService.findAll(reqDto);
  // }

  // @Get('/load-more')
  // @ApiAuth({
  //   type: PriceResDto,
  //   summary: 'Load more prices with cursor pagination',
  //   isPaginated: true,
  //   paginationType: 'cursor',
  // })
  // async loadMore(
  //   @Query() reqDto: LoadMorePricesReqDto,
  // ): Promise<CursorPaginatedDto<PriceResDto>> {
  //   return await this.priceService.loadMorePrices(reqDto);
  // }

  // @Get(':listing_id/:start_date/:end_date')
  // @ApiPublic({
  //   type: PriceResDto,
  //   summary: 'Find a price by listing_id, start_date, and end_date',
  // })
  // @ApiParam({
  //   name: 'listing_id',
  //   type: 'string',
  //   description: 'Listing group ID',
  // })
  // @ApiParam({
  //   name: 'start_date',
  //   type: 'string',
  //   description: 'Start date of the price period',
  // })
  // @ApiParam({
  //   name: 'end_date',
  //   type: 'string',
  //   description: 'End date of the price period',
  // })
  // async findOne(
  //   @Param('listing_id') listing_id: Uuid,
  //   @Param('start_date') start_date: string,
  //   @Param('end_date') end_date: string,
  // ): Promise<PriceResDto> {
  //   return await this.priceService.findOne(
  //     listing_id,
  //     new Date(start_date),
  //     new Date(end_date),
  //   );
  // }

  // @Patch(':listing_id/:start_date/:end_date')
  // @ApiAuth({
  //   type: PriceResDto,
  //   summary: 'Update a price by listing_id, start_date, and end_date',
  // })
  // @ApiParam({
  //   name: 'listing_id',
  //   type: 'string',
  //   description: 'Listing group ID',
  // })
  // @ApiParam({
  //   name: 'start_date',
  //   type: 'string',
  //   description: 'Start date of the price period',
  // })
  // @ApiParam({
  //   name: 'end_date',
  //   type: 'string',
  //   description: 'End date of the price period',
  // })
  // update(
  //   @Param('listing_id') listing_id: Uuid,
  //   @Param('start_date') start_date: string,
  //   @Param('end_date') end_date: string,
  //   @Body() updatePriceDto: UpdatePriceDto,
  // ) {
  //   return this.priceService.update(
  //     listing_id,
  //     new Date(start_date),
  //     new Date(end_date),
  //     updatePriceDto,
  //   );
  // }

  // @Delete(':listing_id/:start_date/:end_date')
  // @ApiAuth({
  //   summary: 'Delete a price by listing_id, start_date, and end_date',
  //   errorResponses: [400, 401, 403, 404, 500],
  // })
  // @ApiParam({
  //   name: 'listing_id',
  //   type: 'string',
  //   description: 'Listing group ID',
  // })
  // @ApiParam({
  //   name: 'start_date',
  //   type: 'string',
  //   description: 'Start date of the price period',
  // })
  // @ApiParam({
  //   name: 'end_date',
  //   type: 'string',
  //   description: 'End date of the price period',
  // })
  // remove(
  //   @Param('listing_id') listing_id: Uuid,
  //   @Param('start_date') start_date: string,
  //   @Param('end_date') end_date: string,
  // ) {
  //   return this.priceService.remove(
  //     listing_id,
  //     new Date(start_date),
  //     new Date(end_date),
  //   );
  // }
}
