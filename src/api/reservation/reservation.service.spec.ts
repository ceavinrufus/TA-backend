import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { ReservationStatus } from '@/constants/entity.enum';
import { JobName } from '@/constants/job.constant';
import * as offsetPagination from '@/utils/offset-pagination';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Brackets, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ListingEntity } from '../listing/entities/listing.entity';
import { CreateReservationDto } from './dto/create-reservation.req.dto';
import { ListReservationReqDto } from './dto/list-reservation.req.dto';
import { ReservationResDto } from './dto/reservation.res.dto';
import { UpdateReservationDto } from './dto/update-reservation.req.dto';
import { ReservationEntity } from './entities/reservation.entity';
import { ReservationService } from './reservation.service';

jest.mock('@/utils/cursor-pagination');
jest.mock('@/utils/offset-pagination');

describe('ReservationService', () => {
  let service: ReservationService;
  let reservationRepository: Repository<ReservationEntity>;
  let listingRepository: Repository<ListingEntity>;
  let cacheManager: any;
  let reservationQueue: Queue;

  const listingId: Uuid = uuidv4() as Uuid;
  const guestId: Uuid = uuidv4() as Uuid;
  const hostId: Uuid = uuidv4() as Uuid;
  const reservationId: Uuid = uuidv4() as Uuid;

  const baseEntityMethods = {
    toDto: jest.fn(),
    hasId: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    softRemove: jest.fn(),
    recover: jest.fn(),
  };

  const mockReservation: ReservationEntity = {
    id: reservationId,
    listing_id: listingId,
    listing: null,
    payments: null,
    guest_id: guestId,
    guest: null,
    host_id: hostId,
    host: null,
    night_staying: 2,
    check_in_date: new Date('2023-01-01'),
    check_out_date: new Date('2023-01-03'),
    guest_number: 1,
    total_price: 100,
    guest_info: ['{}'],
    base_price: 100,
    service_fee: 0,
    guest_deposit: 0,
    book_hash: 'book-hash',
    booking_number: 'SH-123456',
    cancel_reason: null,
    listing_address: '123 Main St',
    listing_name: 'Hotel California',
    guest_wallet_address: '0x1234567890abcdef',
    dispute: null,
    status: ReservationStatus.ORDER_COMPLETED,
    guest_did: 'did:example:1234567890abcdef',
    booking_credential_id: '',
    deleted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    reload: jest.fn(),
    ...baseEntityMethods,
  };

  const mockListing: ListingEntity = {
    id: listingId,
    name: 'Hotel California',
    address: '123 Main St',
    host_id: hostId,
    ...baseEntityMethods,
  } as unknown as ListingEntity;

  const mockCreateReservationDto: CreateReservationDto = {
    listing_id: listingId,
    guest_id: guestId,
    host_id: hostId,
    check_in_date: new Date('2023-01-01'),
    check_out_date: new Date('2023-01-03'),
    night_staying: 2,
    guest_number: 1,
    total_price: 100,
    base_price: 100,
    service_fee: 0,
    guest_deposit: 0,
    book_hash: 'valid-hash',
    guest_info: [
      { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
    ],
    guest_wallet_address: '0x1234567890abcdef',
    status: ReservationStatus.ORDER_CREATED,
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getOne: jest.fn().mockResolvedValue(mockReservation),
    getRawOne: jest.fn().mockResolvedValue({
      pending_earnings: 100,
      monthly_earnings: 500,
      yearly_earnings: 2000,
    }),
  };

  const mockReservationRepository = {
    save: jest.fn().mockResolvedValue(mockReservation),
    findOneByOrFail: jest.fn().mockResolvedValue(mockReservation),
    findOneOrFail: jest.fn().mockResolvedValue(mockReservation),
    softDelete: jest.fn().mockResolvedValue({}),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    manager: {
      transaction: jest.fn(async (callback) =>
        callback({ save: jest.fn().mockResolvedValue(mockReservation) }),
      ),
    },
  };

  const mockListingRepository = {
    findOneByOrFail: jest.fn().mockResolvedValue(mockListing),
  };

  const mockCacheManager = {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'pre_reservation:valid-hash') {
        return JSON.stringify(mockCreateReservationDto);
      }
      return null;
    }),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        {
          provide: getRepositoryToken(ReservationEntity),
          useValue: mockReservationRepository,
        },
        {
          provide: getRepositoryToken(ListingEntity),
          useValue: mockListingRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: 'BullQueue_reservationQueue',
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
    reservationRepository = module.get<Repository<ReservationEntity>>(
      getRepositoryToken(ReservationEntity),
    );
    listingRepository = module.get<Repository<ListingEntity>>(
      getRepositoryToken(ListingEntity),
    );
    cacheManager = module.get(CACHE_MANAGER);
    reservationQueue = module.get('BullQueue_reservationQueue');

    // Mock the generateBookHash method to return a consistent value for testing
    jest.spyOn(service, 'generateBookHash').mockReturnValue('valid-hash');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isDateRangeAvailable', () => {
    it('should throw error if check-in or check-out date is invalid', async () => {
      await expect(
        service.isDateRangeAvailable(listingId, null, new Date()),
      ).rejects.toThrow('Invalid check-in or check-out date');

      await expect(
        service.isDateRangeAvailable(listingId, new Date(), null),
      ).rejects.toThrow('Invalid check-in or check-out date');

      await expect(
        service.isDateRangeAvailable(
          listingId,
          new Date('2023-01-03'),
          new Date('2023-01-01'),
        ),
      ).rejects.toThrow('Invalid check-in or check-out date');
    });

    it('should return true if no conflicting reservations found', async () => {
      mockQueryBuilder.getCount.mockResolvedValueOnce(0);

      const result = await service.isDateRangeAvailable(
        listingId,
        new Date('2023-01-01'),
        new Date('2023-01-03'),
      );

      expect(result).toBe(true);
      expect(mockReservationRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'reservation.listing_id = :listing_id',
        { listing_id: listingId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'reservation.status NOT IN (:...excludedStatuses)',
        {
          excludedStatuses: [
            ReservationStatus.ORDER_CANCELED,
            ReservationStatus.ORDER_FAIL,
          ],
        },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.any(Brackets),
      );
      expect(mockQueryBuilder.getCount).toHaveBeenCalled();
    });

    it('should return false if conflicting reservations found', async () => {
      mockQueryBuilder.getCount.mockResolvedValueOnce(1);

      const result = await service.isDateRangeAvailable(
        listingId,
        new Date('2023-01-01'),
        new Date('2023-01-03'),
      );

      expect(result).toBe(false);
    });

    it('should exclude specified reservation when excludeReservationId is provided', async () => {
      await service.isDateRangeAvailable(
        listingId,
        new Date('2023-01-01'),
        new Date('2023-01-03'),
        reservationId,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'reservation.id != :excludeReservationId',
        { excludeReservationId: reservationId },
      );
    });
  });

  describe('generateBookHash', () => {
    it('should generate a hash based on reservation details', () => {
      jest.spyOn(service, 'generateBookHash').mockRestore();

      // const hashSpy = jest.spyOn(createHash('sha256'), 'update');
      // const digestSpy = jest.spyOn(hashSpy.mockReturnThis(), 'digest');

      const dto = {
        listing_id: listingId,
        check_in_date: new Date('2023-01-01'),
        check_out_date: new Date('2023-01-03'),
        night_staying: 2,
        total_price: 100,
        guest_number: 1,
      } as CreateReservationDto;

      const result = service.generateBookHash(dto);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('storePreReservationInRedis', () => {
    it('should store reservation data in Redis with correct expiration', async () => {
      await service.storePreReservationInRedis(mockCreateReservationDto);

      expect(cacheManager.set).toHaveBeenCalledWith(
        `pre_reservation:${mockCreateReservationDto.book_hash}`,
        JSON.stringify(mockCreateReservationDto),
        3600 * 1000,
      );
    });
  });

  describe('getPreReservationFromRedis', () => {
    it('should retrieve and parse reservation data from Redis', async () => {
      const result = await service.getPreReservationFromRedis('valid-hash');

      expect(cacheManager.get).toHaveBeenCalledWith(
        'pre_reservation:valid-hash',
      );
      expect(result).toEqual(mockCreateReservationDto);
    });

    it('should throw error if pre-reservation data not found', async () => {
      await expect(
        service.getPreReservationFromRedis('invalid-hash'),
      ).rejects.toThrow('Pre-reservation data not found');
    });
  });

  describe('create', () => {
    beforeEach(() => {
      jest.spyOn(service, 'verifyBookHash' as any).mockReturnValue(true);
      jest.spyOn(service, 'isDateRangeAvailable').mockResolvedValue(true);
      jest
        .spyOn(service as any, 'generateBookingNumber')
        .mockReturnValue('SH-123456');
    });

    it('should throw error if book_hash is missing', async () => {
      const dtoWithoutHash = {
        ...mockCreateReservationDto,
        book_hash: undefined,
      };
      await expect(service.create(dtoWithoutHash)).rejects.toThrow(
        'book_hash is required',
      );
    });

    it('should throw error if book_hash verification fails', async () => {
      jest.spyOn(service, 'verifyBookHash' as any).mockReturnValue(false);
      await expect(service.create(mockCreateReservationDto)).rejects.toThrow(
        'The reservation details have been altered.',
      );
    });

    it('should throw error if date range is not available', async () => {
      jest.spyOn(service, 'isDateRangeAvailable').mockResolvedValue(false);
      await expect(service.create(mockCreateReservationDto)).rejects.toThrow(
        'The selected date range is already reserved.',
      );
    });

    it('should create and save a new reservation', async () => {
      const result = await service.create(mockCreateReservationDto);

      expect(listingRepository.findOneByOrFail).toHaveBeenCalledWith({
        id: listingId,
      });
      expect(service.isDateRangeAvailable).toHaveBeenCalledWith(
        listingId,
        mockCreateReservationDto.check_in_date,
        mockCreateReservationDto.check_out_date,
      );
      expect(reservationRepository.save).toHaveBeenCalled();
      expect(reservationQueue.add).toHaveBeenCalledWith(
        JobName.EXPIRE_RESERVATION,
        { reservationId: mockReservation.id },
        { delay: 15 * 60 * 1000, removeOnComplete: true, removeOnFail: false },
      );
      expect(result).toBeInstanceOf(ReservationResDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated reservations', async () => {
      const reqDto = new ListReservationReqDto();

      const paginateResult = {
        items: [mockReservation],
        meta: {
          totalRecords: 1,
          limit: 10,
          totalPages: 1,
          currentPage: 1,
        },
      };

      jest
        .spyOn(offsetPagination, 'paginate')
        .mockResolvedValue([paginateResult.items, paginateResult.meta]);

      const result = await service.findAll(reqDto);

      expect(mockReservationRepository.createQueryBuilder).toHaveBeenCalledWith(
        'reservation',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'reservation.listing',
        'listing',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'reservation.created_at',
        'DESC',
      );
      expect(offsetPagination.paginate).toHaveBeenCalled();
      expect(result).toBeInstanceOf(OffsetPaginatedDto);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findAllByListingId', () => {
    it('should return paginated reservations for a specific listing', async () => {
      const reqDto = new ListReservationReqDto();

      const paginateResult = {
        items: [mockReservation],
        meta: {
          totalRecords: 1,
          limit: 10,
          totalPages: 1,
          currentPage: 1,
        },
      };

      jest
        .spyOn(offsetPagination, 'paginate')
        .mockResolvedValue([paginateResult.items, paginateResult.meta]);

      const result = await service.findAllByListingId(listingId, reqDto);

      expect(mockReservationRepository.createQueryBuilder).toHaveBeenCalledWith(
        'reservation',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'reservation.listing',
        'listing',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'reservation.listing_id = :listing_id',
        { listing_id: listingId },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'reservation.created_at',
        'DESC',
      );
      expect(offsetPagination.paginate).toHaveBeenCalled();
      expect(result).toBeInstanceOf(OffsetPaginatedDto);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findAllByHost', () => {
    it('should throw error if host_id is missing', async () => {
      const reqDto = new ListReservationReqDto();
      await expect(service.findAllByHost(null, reqDto)).rejects.toThrow(
        'Host ID is required',
      );
    });

    it('should return paginated reservations for a specific host', async () => {
      const reqDto = new ListReservationReqDto();

      const paginateResult = {
        items: [mockReservation],
        meta: {
          totalRecords: 1,
          limit: 10,
          totalPages: 1,
          currentPage: 1,
        },
      };

      jest
        .spyOn(offsetPagination, 'paginate')
        .mockResolvedValue([paginateResult.items, paginateResult.meta]);

      const result = await service.findAllByHost(hostId, reqDto);

      expect(mockReservationRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'reservation.host_id = :host_id',
        { host_id: hostId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'reservation.status NOT IN (:...excludedStatuses)',
        {
          excludedStatuses: [
            ReservationStatus.ORDER_CREATED,
            ReservationStatus.ORDER_WAITING_PAYMENT,
            ReservationStatus.ORDER_FAIL,
          ],
        },
      );
      expect(result).toBeInstanceOf(OffsetPaginatedDto);
    });
  });

  describe('getGuestsCheckingInAndOutTodayForHost', () => {
    it('should throw error if host_id is missing', async () => {
      await expect(
        service.getGuestsCheckingInAndOutTodayForHost(null),
      ).rejects.toThrow('Host ID is required');
    });

    it('should return check-in, check-out, and total reservation counts', async () => {
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(2) // check-ins
        .mockResolvedValueOnce(1) // check-outs
        .mockResolvedValueOnce(10); // total reservations

      const result =
        await service.getGuestsCheckingInAndOutTodayForHost(hostId);

      expect(
        mockReservationRepository.createQueryBuilder,
      ).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        check_ins: 2,
        check_outs: 1,
        total_reservations: 10,
      });
    });
  });

  describe('getHostEarnings', () => {
    it('should throw error if host_id is missing', async () => {
      await expect(service.getHostEarnings(null)).rejects.toThrow(
        'Host ID is required',
      );
    });

    it('should return host earnings statistics', async () => {
      const result = await service.getHostEarnings(hostId);

      expect(mockReservationRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'reservation.host_id = :host_id',
        { host_id: hostId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'reservation.status = :status',
        {
          status: ReservationStatus.ORDER_COMPLETED,
        },
      );
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.setParameters).toHaveBeenCalled();
      expect(result).toEqual({
        pending_earnings: 100,
        monthly_earnings: 500,
        yearly_earnings: 2000,
      });
    });
  });

  describe('findAllByGuest', () => {
    it('should throw error if guest_id is missing', async () => {
      const reqDto = new ListReservationReqDto();
      await expect(service.findAllByGuest(null, 'all', reqDto)).rejects.toThrow(
        'Guest ID is required',
      );
    });

    it('should apply correct filters for each category', async () => {
      const reqDto = new ListReservationReqDto();
      const paginateResult = {
        items: [mockReservation],
        meta: {
          totalRecords: 1,
          limit: 10,
          totalPages: 1,
          currentPage: 1,
        },
      };

      jest
        .spyOn(offsetPagination, 'paginate')
        .mockResolvedValue([paginateResult.items, paginateResult.meta]);

      // Test 'upcoming' category
      await service.findAllByGuest(guestId, 'upcoming', reqDto);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'reservation.check_out_date > :now',
        expect.any(Object),
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'reservation.status NOT IN (:...canceledStatuses)',
        expect.any(Object),
      );

      jest.clearAllMocks();

      // Test 'past' category
      await service.findAllByGuest(guestId, 'past', reqDto);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'reservation.check_out_date < :now',
        expect.any(Object),
      );

      jest.clearAllMocks();

      // Test 'cancelled' category
      await service.findAllByGuest(guestId, 'cancelled', reqDto);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'reservation.status IN (:...canceledStatuses)',
        expect.any(Object),
      );

      jest.clearAllMocks();

      // Test 'paid' category
      await service.findAllByGuest(guestId, 'paid', reqDto);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'reservation.status IN (:...paidStatuses)',
        expect.any(Object),
      );

      jest.clearAllMocks();

      // Test 'not-paid' category
      await service.findAllByGuest(guestId, 'not-paid', reqDto);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'reservation.status IN (:...notPaidStatuses)',
        expect.any(Object),
      );
    });
  });

  describe('findOne', () => {
    it('should throw error if id is missing', async () => {
      await expect(service.findOne(null)).rejects.toThrow('id is required');
    });

    it('should return a specific reservation', async () => {
      const result = await service.findOne(reservationId);

      expect(reservationRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: reservationId },
        relations: ['listing'],
      });
      expect(result).toBeInstanceOf(ReservationResDto);
    });
  });

  describe('update', () => {
    it('should update a reservation', async () => {
      const updateDto: UpdateReservationDto = {
        status: ReservationStatus.ORDER_PAID_COMPLETED,
      };

      const result = await service.update(reservationId, updateDto);

      expect(reservationRepository.findOneByOrFail).toHaveBeenCalledWith({
        id: reservationId,
      });
      expect(reservationRepository.manager.transaction).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ReservationResDto);
    });

    it('should check date availability if dates are changed', async () => {
      const updateDto: UpdateReservationDto = {
        check_in_date: new Date('2023-02-01'),
        check_out_date: new Date('2023-02-03'),
      };

      jest.spyOn(service, 'isDateRangeAvailable').mockResolvedValue(true);

      await service.update(reservationId, updateDto);

      expect(service.isDateRangeAvailable).toHaveBeenCalledWith(
        mockReservation.listing_id,
        updateDto.check_in_date,
        updateDto.check_out_date,
        reservationId, // Should exclude the current reservation ID
      );
    });

    it('should throw error if updated date range is not available', async () => {
      const updateDto: UpdateReservationDto = {
        check_in_date: new Date('2023-02-01'),
        check_out_date: new Date('2023-02-03'),
      };

      jest.spyOn(service, 'isDateRangeAvailable').mockResolvedValue(false);

      await expect(service.update(reservationId, updateDto)).rejects.toThrow(
        'The selected date range is already reserved.',
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a reservation', async () => {
      await service.remove(reservationId);

      expect(reservationRepository.findOneByOrFail).toHaveBeenCalledWith({
        id: reservationId,
      });
      expect(reservationRepository.softDelete).toHaveBeenCalledWith({
        id: reservationId,
      });
    });
  });
});
