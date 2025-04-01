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
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateReservationDto } from './dto/create-reservation.req.dto';
import { ListReservationReqDto } from './dto/list-reservation.req.dto';
import { LoadMoreReservationsReqDto } from './dto/load-more-reservations.req.dto';
import { ReservationResDto } from './dto/reservation.res.dto';
import { UpdateReservationDto } from './dto/update-reservation.req.dto';
import { ReservationService } from './reservation.service';

@ApiTags('reservations')
@Controller({
  path: 'reservations',
  version: '1',
})
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post('generate-book-hash')
  @ApiPublic({
    summary: 'Generate a unique booking hash for a reservation',
  })
  async createBookHash(
    @Body() createReservationDto: CreateReservationDto,
  ): Promise<{ book_hash: string }> {
    const bookHash =
      this.reservationService.generateBookHash(createReservationDto);
    return { book_hash: bookHash };
  }

  @Post('pre-booking')
  @ApiPublic({
    summary: 'Store a pre-reservation in Redis',
    statusCode: HttpStatus.CREATED,
  })
  async storePreReservation(
    @Body() createReservationDto: CreateReservationDto,
  ): Promise<void> {
    await this.reservationService.storePreReservationInRedis(
      createReservationDto,
    );
  }

  @Get('pre-booking/:book_hash')
  @ApiPublic({
    type: CreateReservationDto,
    summary: 'Get a pre-reservation from Redis by book hash',
  })
  @ApiParam({
    name: 'book_hash',
    type: 'string',
    description: 'Booking Hash',
  })
  async getPreReservation(
    @Param('book_hash') bookHash: string,
  ): Promise<CreateReservationDto | null> {
    return await this.reservationService.getPreReservationFromRedis(bookHash);
  }

  @Post()
  @ApiAuth({
    auths: ['api-key', 'jwt'],
    type: ReservationResDto,
    summary: 'Create a new reservation',
    statusCode: HttpStatus.CREATED,
  })
  async create(
    @Body() createReservationDto: CreateReservationDto,
  ): Promise<ReservationResDto> {
    return await this.reservationService.create(createReservationDto);
  }

  @Get()
  @ApiAuth({
    type: ReservationResDto,
    summary: 'List all reservations with pagination',
    isPaginated: true,
  })
  async findAll(
    @Query() reqDto: ListReservationReqDto,
  ): Promise<OffsetPaginatedDto<ReservationResDto>> {
    return await this.reservationService.findAll(reqDto);
  }

  @Get('/listing/:listing_id')
  @ApiAuth({
    type: ReservationResDto,
    summary: 'List all reservations by listing id with pagination',
    isPaginated: true,
  })
  @ApiParam({
    name: 'listing_id',
    type: 'string',
    description: 'Listing ID',
  })
  async findAllByListingId(
    @Param('listing_id') listing_id: Uuid,
    @Query() reqDto: ListReservationReqDto,
  ): Promise<OffsetPaginatedDto<ReservationResDto>> {
    return await this.reservationService.findAllByListingId(listing_id, reqDto);
  }

  @Get('/host')
  @ApiAuth({
    type: ReservationResDto,
    summary: 'List all reservations by host id with pagination',
    isPaginated: true,
  })
  async findAllByHost(
    @CurrentUser('user_token_id') host_id: Uuid,
    @Query() reqDto: ListReservationReqDto,
  ): Promise<OffsetPaginatedDto<ReservationResDto>> {
    return await this.reservationService.findAllByHost(host_id, reqDto);
  }

  @Get('/host/today-guests')
  @ApiAuth({
    summary:
      'Get the number of guests checking in and out today for a specific host',
  })
  async getGuestsCheckingInAndOutTodayForHost(
    @CurrentUser('user_token_id') host_id: Uuid,
  ): Promise<{ check_ins: number; check_outs: number }> {
    return await this.reservationService.getGuestsCheckingInAndOutTodayForHost(
      host_id,
    );
  }

  @Get('/host/earnings')
  @ApiAuth({
    summary: 'Get earnings statistics for a host',
  })
  async getHostEarnings(@CurrentUser('user_token_id') host_id: Uuid): Promise<{
    pending_earnings: number;
    monthly_earnings: number;
    yearly_earnings: number;
  }> {
    return await this.reservationService.getHostEarnings(host_id);
  }

  @Get('/guest')
  @ApiAuth({
    auths: ['api-key', 'jwt'],
    type: ReservationResDto,
    summary: 'List all reservations by guest id with pagination',
    isPaginated: true,
  })
  @ApiQuery({
    name: 'guest_id',
    type: 'string',
    description: 'Guest ID',
  })
  @ApiQuery({
    name: 'category',
    type: 'string',
    description:
      'Reservation category: upcoming, past, cancelled, paid, or not-paid',
    enum: ['upcoming', 'past', 'cancelled', 'paid', 'not-paid'],
  })
  async findAllByGuest(
    @Query('guest_id') guest_id: Uuid,
    @Query('category')
    category: 'all' | 'upcoming' | 'past' | 'cancelled' | 'paid' | 'not-paid',
    @Query() reqDto: ListReservationReqDto,
  ): Promise<OffsetPaginatedDto<ReservationResDto>> {
    return await this.reservationService.findAllByGuest(
      guest_id,
      category,
      reqDto,
    );
  }

  @Get('/load-more')
  @ApiAuth({
    type: ReservationResDto,
    summary: 'Load more reservations with cursor pagination',
    isPaginated: true,
    paginationType: 'cursor',
  })
  async loadMore(
    @Query() reqDto: LoadMoreReservationsReqDto,
  ): Promise<CursorPaginatedDto<ReservationResDto>> {
    return await this.reservationService.loadMoreReservations(reqDto);
  }

  @Get(':id')
  @ApiAuth({
    auths: ['api-key', 'jwt'],
    type: ReservationResDto,
    summary: 'Find a reservation by id',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Reservation ID',
  })
  async findOne(@Param('id') id: Uuid): Promise<ReservationResDto> {
    return await this.reservationService.findOne(id);
  }

  @Patch(':id')
  @ApiAuth({
    type: ReservationResDto,
    summary: 'Update a reservation by id',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Reservation ID',
  })
  update(
    @Param('id') id: Uuid,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationService.update(id, updateReservationDto);
  }

  @Delete(':id')
  @ApiAuth({
    summary: 'Delete a reservation by id',
    errorResponses: [400, 401, 403, 404, 500],
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Reservation ID',
  })
  remove(@Param('id') id: Uuid) {
    return this.reservationService.remove(id);
  }
}
