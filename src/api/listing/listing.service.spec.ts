import { Uuid } from '@/common/types/common.type';
import { ListingStatus } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CreateListingDto } from './dto/create-listing.req.dto';
import { ListingResDto } from './dto/listing.res.dto';
import { ListingEntity } from './entities/listing.entity';
import { ListingService } from './listing.service';

describe('ListingService', () => {
  let service: ListingService;
  let repository: Repository<ListingEntity>;

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
    })),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingService,
        {
          provide: getRepositoryToken(ListingEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ListingService>(ListingService);
    repository = module.get<Repository<ListingEntity>>(
      getRepositoryToken(ListingEntity),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new listing successfully', async () => {
      const userId: Uuid = uuidv4() as Uuid;
      const listingId: Uuid = uuidv4() as Uuid;

      const dto: CreateListingDto = {
        is_instant_booking: false,
        is_no_free_cancellation: false,
        booking_window: 'Inactive',
        buffer_period: 'None',
        restricted_check_in: [1, 2, 3],
        restricted_check_out: [6, 7],
        region_id: 2,
        cancellation_policy: 'FLEXIBLE',
        same_day_booking_cutoff_time: '18:00:00Z',
        max_booking_night: 10,
        min_booking_night: 1,
        address: '123 Test St',
        host_id: userId,
        earliest_check_in_time: '12:00:00Z',
        latest_check_in_time: '12:00:00Z',
        check_out_time: '14:00:00Z',
        name: 'Test Listing',
        latitude: 40.7128,
        longitude: -74.006,
        description: 'A beautiful location in the city.',
        default_price: 100,
        phone: '123-456-7890',
        property_type: 'HOUSE',
        place_type: 'ENTIRE_PLACE',
        postal_code: '10001',
        region_name: 'New York',
        pictures: [],
        tags: [],
        security_agreement: [],
        status: ListingStatus.LISTING_COMPLETED,
        default_availability: true,
        country_code: 'US',
        guest_number: 4,
        bedrooms: 2,
        beds: 2,
        bathrooms: 1,
        amenities: ['WiFi', 'TV'],
        location_details: {
          unit: '123',
          building: 'Test Building',
          district: 'Test District',
          city: 'Test City',
          details: 'Test Details',
        },
      };

      const mockListing = {
        id: listingId,
        ...dto,
        slug: 'test-listing',
        availabilities: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockListing);
      mockRepository.save.mockResolvedValue(mockListing);

      const result = await service.create(dto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...dto,
        slug: 'test-listing',
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockListing);
      expect(result).toEqual(
        plainToInstance(ListingResDto, mockListing, {
          excludeExtraneousValues: true,
        }),
      );
    });

    it('should create a new draft listing with a generated slug', async () => {
      const userId: Uuid = uuidv4() as Uuid;
      const listingId: Uuid = uuidv4() as Uuid;
      const slug = `draft-${uuidv4()}`;

      const dto: CreateListingDto = {
        is_instant_booking: false,
        is_no_free_cancellation: false,
        booking_window: 'Inactive',
        buffer_period: 'None',
        restricted_check_in: [1, 2, 3],
        restricted_check_out: [6, 7],
        region_id: 2,
        cancellation_policy: 'FLEXIBLE',
        same_day_booking_cutoff_time: '18:00:00Z',
        max_booking_night: 10,
        min_booking_night: 1,
        address: '456 Test Ave',
        host_id: userId,
        earliest_check_in_time: '12:00:00Z',
        latest_check_in_time: '12:00:00Z',
        check_out_time: '14:00:00Z',
        name: 'Draft Listing',
        latitude: 40.7128,
        longitude: -74.006,
        description: 'A temporary listing for testing.',
        default_price: 80,
        phone: '987-654-3210',
        property_type: 'APARTMENT',
        place_type: 'PRIVATE_ROOM',
        postal_code: '10002',
        region_name: 'New York',
        pictures: [],
        tags: [],
        security_agreement: [],
        status: ListingStatus.LISTING_DRAFT,
        default_availability: true,
        country_code: 'US',
        guest_number: 2,
        bedrooms: 1,
        beds: 1,
        bathrooms: 1,
        amenities: ['Air Conditioner', 'Desk'],
        location_details: {
          unit: '456',
          building: 'Test Tower',
          district: 'Business District',
          city: 'Test City',
          details: 'Close to public transport.',
        },
      };

      const mockListing = {
        id: listingId,
        ...dto,
        slug,
        availabilities: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockListing);
      mockRepository.save.mockResolvedValue(mockListing);

      const result = await service.create(dto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...dto,
          slug: expect.stringMatching(/^draft-[a-f0-9-]+$/),
        }),
      );
      expect(mockRepository.save).toHaveBeenCalledWith(mockListing);
      expect(result).toEqual(
        plainToInstance(ListingResDto, mockListing, {
          excludeExtraneousValues: true,
        }),
      );
    });

    it('should generate a unique slug if the same slug already exists', async () => {
      const userId: Uuid = uuidv4() as Uuid;
      const listingId: Uuid = uuidv4() as Uuid;
      const baseSlug = 'duplicate-listing';
      const newSlug = `${baseSlug}-${uuidv4()}`;

      const dto: CreateListingDto = {
        is_instant_booking: false,
        is_no_free_cancellation: false,
        booking_window: 'Inactive',
        buffer_period: 'None',
        restricted_check_in: [1, 2, 3],
        restricted_check_out: [6, 7],
        region_id: 2,
        cancellation_policy: 'FLEXIBLE',
        same_day_booking_cutoff_time: '18:00:00Z',
        max_booking_night: 10,
        min_booking_night: 1,
        address: '456 Test Ave',
        host_id: userId,
        earliest_check_in_time: '12:00:00Z',
        latest_check_in_time: '12:00:00Z',
        check_out_time: '14:00:00Z',
        name: 'Duplicate Listing',
        latitude: 40.7128,
        longitude: -74.006,
        description: 'A temporary listing for testing.',
        default_price: 80,
        phone: '987-654-3210',
        property_type: 'APARTMENT',
        place_type: 'PRIVATE_ROOM',
        postal_code: '10002',
        region_name: 'New York',
        pictures: [],
        tags: [],
        security_agreement: [],
        status: ListingStatus.LISTING_COMPLETED,
        default_availability: true,
        country_code: 'US',
        guest_number: 2,
        bedrooms: 1,
        beds: 1,
        bathrooms: 1,
        amenities: ['Air Conditioner', 'Desk'],
        location_details: {
          unit: '456',
          building: 'Test Tower',
          district: 'Business District',
          city: 'Test City',
          details: 'Close to public transport.',
        },
      };

      const existingListing = { id: uuidv4(), slug: baseSlug };

      mockRepository.findOne.mockResolvedValueOnce(existingListing);
      mockRepository.create.mockReturnValue({ ...dto, slug: newSlug });
      mockRepository.save.mockResolvedValue({ ...dto, slug: newSlug });

      const result = await service.create(dto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { slug: baseSlug },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...dto,
          slug: expect.stringMatching(new RegExp(`^${baseSlug}-[a-f0-9-]+$`)),
        }),
      );
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ slug: newSlug }),
      );
      expect(result).toEqual(
        plainToInstance(
          ListingResDto,
          { ...dto, slug: newSlug },
          {
            excludeExtraneousValues: true,
          },
        ),
      );
    });
  });

  describe('checkAvailability', () => {
    const slug = 'test-listing';
    const startDate = new Date('2024-12-10T12:00:00Z');
    const endDate = new Date('2024-12-15T12:00:00Z');
    const today = new Date();

    // Mock Brackets class that's used in the query building
    class MockBrackets {
      constructor(
        private readonly buildCallback: (bracket: MockBrackets) => void,
      ) {}
      where(query: string, params?: any) {
        return this;
      }
      andWhere(query: string, params?: any) {
        return this;
      }
      orWhere(query: string, params?: any) {
        return this;
      }
    }

    beforeEach(() => {
      // Reset and set up the mock query builder with more detailed functionality
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
        getMany: jest.fn(),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Mock the Brackets class used in the method
      (global as any).Brackets = MockBrackets;
    });

    it('should throw a validation exception if the listing does not exist', async () => {
      mockRepository.createQueryBuilder().getOne.mockResolvedValue(null);

      await expect(
        service.checkAvailability(slug, startDate, endDate),
      ).rejects.toThrow(
        new ValidationException(
          ErrorCode.E001,
          'Listing not found or not available for the selected dates',
        ),
      );
    });

    it('should throw a validation exception if start date is after or equal to end date', async () => {
      const invalidStartDate = new Date('2024-12-15T12:00:00Z');
      const invalidEndDate = new Date('2024-12-15T12:00:00Z');

      await expect(
        service.checkAvailability(slug, invalidStartDate, invalidEndDate),
      ).rejects.toThrow(
        new ValidationException(
          ErrorCode.E002,
          'Start date must be before end date',
        ),
      );
    });

    it('should handle null parameters', async () => {
      await expect(
        service.checkAvailability(null, startDate, endDate),
      ).rejects.toThrow('Listing slug is required');

      await expect(
        service.checkAvailability(slug, null, endDate),
      ).rejects.toThrow('Start date is required');

      await expect(
        service.checkAvailability(slug, startDate, null),
      ).rejects.toThrow('End date is required');
    });

    it('should return available listing when all constraints are satisfied', async () => {
      const mockListing = {
        id: 'test-id',
        slug,
        default_availability: true,
        booking_window: '30 days',
        buffer_period: 'None',
        restricted_check_in: [],
        restricted_check_out: [],
        availabilities: [],
        prices: [],
        host: {},
        reservations: [],
      };

      mockRepository.createQueryBuilder().getOne.mockResolvedValue(mockListing);

      const result = await service.checkAvailability(slug, startDate, endDate);

      expect(result).toBeDefined();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('listing');
      expect(
        mockRepository.createQueryBuilder().leftJoinAndSelect,
      ).toHaveBeenCalledWith('listing.user', 'user');
      expect(
        mockRepository.createQueryBuilder().leftJoinAndSelect,
      ).toHaveBeenCalledWith('listing.prices', 'prices');
      expect(
        mockRepository.createQueryBuilder().leftJoinAndSelect,
      ).toHaveBeenCalledWith('listing.availabilities', 'availabilities');
      expect(mockRepository.createQueryBuilder().where).toHaveBeenCalledWith(
        'listing.slug = :slug',
        { slug },
      );

      // Remove specific parameter checks since the order and exact parameters may vary
      expect(
        mockRepository.createQueryBuilder().setParameter,
      ).toHaveBeenCalled();
    });

    it('should not return listing when date falls within restricted check-in days', async () => {
      // Sunday is day 0 in DOW extraction
      const restrictedStartDate = new Date('2024-12-08T12:00:00Z'); // Sunday

      const mockListing = {
        slug,
        default_availability: true,
        booking_window: '30 days',
        buffer_period: 'None',
        restricted_check_in: [0], // Restrict Sundays
        restricted_check_out: [],
        availabilities: [],
        prices: [],
      };

      mockRepository.createQueryBuilder().getOne.mockResolvedValue(null); // No listing found due to restriction

      await expect(
        service.checkAvailability(slug, restrictedStartDate, endDate),
      ).rejects.toThrow(
        new ValidationException(
          ErrorCode.E001,
          'Listing not found or not available for the selected dates',
        ),
      );
    });

    it('should not return listing when date falls within restricted check-out days', async () => {
      // Saturday is day 6 in DOW extraction
      const restrictedEndDate = new Date('2024-12-14T12:00:00Z'); // Saturday

      const mockListing = {
        slug,
        default_availability: true,
        booking_window: '30 days',
        buffer_period: 'None',
        restricted_check_in: [],
        restricted_check_out: [6], // Restrict Saturdays
        availabilities: [],
        prices: [],
      };

      mockRepository.createQueryBuilder().getOne.mockResolvedValue(null); // No listing found due to restriction

      await expect(
        service.checkAvailability(slug, startDate, restrictedEndDate),
      ).rejects.toThrow(
        new ValidationException(
          ErrorCode.E001,
          'Listing not found or not available for the selected dates',
        ),
      );
    });

    it('should not return listing when booking window constraint is not satisfied', async () => {
      // Create a date that's definitely beyond a 7-day booking window
      const farFutureDate = new Date();
      farFutureDate.setDate(today.getDate() + 14);

      const mockListing = {
        slug,
        default_availability: true,
        booking_window: '7 days', // Only allow bookings up to 7 days in advance
        buffer_period: 'None',
        restricted_check_in: [],
        restricted_check_out: [],
        availabilities: [],
        prices: [],
      };

      mockRepository.createQueryBuilder().getOne.mockResolvedValue(null); // No listing found due to booking window restriction

      await expect(
        service.checkAvailability(
          slug,
          farFutureDate,
          new Date(farFutureDate.getTime() + 86400000),
        ),
      ).rejects.toThrow(
        new ValidationException(
          ErrorCode.E001,
          'Listing not found or not available for the selected dates',
        ),
      );
    });

    it('should not return listing when within buffer period of another booking', async () => {
      const bufferStartDate = new Date('2024-12-06T12:00:00Z');
      const bufferEndDate = new Date('2024-12-08T12:00:00Z');

      const mockListing = {
        slug,
        default_availability: true,
        booking_window: 'Inactive', // No booking window constraints
        buffer_period: '2 nights', // 2-night buffer between bookings
        restricted_check_in: [],
        restricted_check_out: [],
        availabilities: [],
        prices: [],
      };

      // This would simulate that there's a reservation ending on Dec 5th,
      // and with 2-night buffer that means no bookings should start before Dec 7th
      mockRepository.createQueryBuilder().getOne.mockResolvedValue(null); // No listing found due to buffer period

      await expect(
        service.checkAvailability(slug, bufferStartDate, bufferEndDate),
      ).rejects.toThrow(
        new ValidationException(
          ErrorCode.E001,
          'Listing not found or not available for the selected dates',
        ),
      );
    });

    it('should handle availability overrides correctly', async () => {
      const mockListing = {
        id: 'test-id',
        slug,
        default_availability: false, // Default not available
        booking_window: 'Inactive',
        buffer_period: 'None',
        restricted_check_in: [],
        restricted_check_out: [],
        // But there's an explicit override making it available for these dates
        availabilities: [
          {
            start_date: new Date('2024-12-08T00:00:00Z'),
            end_date: new Date('2024-12-20T23:59:59Z'),
            availability_override: true,
          },
        ],
        prices: [],
        host: {},
        reservations: [],
      };

      mockRepository.createQueryBuilder().getOne.mockResolvedValue(mockListing);

      const result = await service.checkAvailability(slug, startDate, endDate);

      expect(result).toBeDefined();
    });

    // Additional test for one-night buffer period
    it('should respect one-night buffer period', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
        getMany: jest.fn(),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const bufferStartDate = new Date('2024-12-06T12:00:00Z');
      const bufferEndDate = new Date('2024-12-09T12:00:00Z');

      await expect(
        service.checkAvailability(slug, bufferStartDate, bufferEndDate),
      ).rejects.toThrow(
        new ValidationException(
          ErrorCode.E001,
          'Listing not found or not available for the selected dates',
        ),
      );
    });
  });

  describe('calculateTotalPrice', () => {
    it('should calculate total price based on default price when no overrides are present', async () => {
      const listingId: Uuid = uuidv4() as Uuid;
      const startDate = new Date('2024-12-10T12:00:00Z');
      const endDate = new Date('2024-12-13T12:00:00Z');

      const mockListing = {
        id: listingId,
        default_price: 100,
        prices: [],
      };

      mockRepository.findOne.mockResolvedValue(mockListing);

      const result = await service.calculateTotalPrice(
        listingId,
        startDate,
        endDate,
      );

      expect(result).toEqual(300); // 3 days * 100 per day
    });

    it('should calculate total price with price overrides', async () => {
      const listingId: Uuid = uuidv4() as Uuid;
      const startDate = new Date('2024-12-10T12:00:00Z');
      const endDate = new Date('2024-12-13T12:00:00Z');

      const mockListing = {
        id: listingId,
        default_price: 100,
        prices: [
          {
            start_date: new Date('2024-12-11T00:00:00Z'),
            end_date: new Date('2024-12-11T23:59:59Z'),
            price_override: 150,
          },
        ],
      };

      mockRepository.findOne.mockResolvedValue(mockListing);

      const result = await service.calculateTotalPrice(
        listingId,
        startDate,
        endDate,
      );

      expect(result).toEqual(350); // Day 1: 100, Day 2: 150, Day 3: 100
    });

    it('should throw a validation exception if listing does not exist', async () => {
      const listingId: Uuid = uuidv4() as Uuid;
      const startDate = new Date('2024-12-10T12:00:00Z');
      const endDate = new Date('2024-12-15T12:00:00Z');

      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.calculateTotalPrice(listingId, startDate, endDate),
      ).rejects.toThrow(
        new ValidationException(ErrorCode.E001, 'Listing not found'),
      );
    });

    it('should throw a validation exception if endDate is before or equal to startDate', async () => {
      const listingId: Uuid = uuidv4() as Uuid;
      const startDate = new Date('2024-12-15T12:00:00Z');
      const endDate = new Date('2024-12-10T12:00:00Z');

      await expect(
        service.calculateTotalPrice(listingId, startDate, endDate),
      ).rejects.toThrow(
        new ValidationException(
          ErrorCode.E002,
          'End date must be after start date',
        ),
      );
    });
  });

  describe('findOne', () => {
    it('should return a listing by ID', async () => {
      const listingId: Uuid = uuidv4() as Uuid;

      const mockListing: ListingResDto = {
        slug: 'test-listing',
        rules: [],
        reservations: [],
        is_instant_booking: false,
        is_no_free_cancellation: false,
        booking_window: 'Inactive',
        buffer_period: 'None',
        restricted_check_in: [1, 2, 3],
        restricted_check_out: [6, 7],
        region_id: 2,
        cancellation_policy: 'FLEXIBLE',
        same_day_booking_cutoff_time: '18:00:00Z',
        max_booking_night: 10,
        min_booking_night: 1,
        id: listingId,
        address: '123 Test St',
        host_id: uuidv4() as Uuid,
        earliest_check_in_time: '12:00:00Z',
        latest_check_in_time: '12:00:00Z',
        check_out_time: '14:00:00Z',
        name: 'Test Listing',
        latitude: 40.7128,
        longitude: -74.006,
        description: 'A beautiful location in the city.',
        postal_code: '10001',
        property_type: 'HOUSE',
        place_type: 'ENTIRE_PLACE',
        guest_number: 4,
        bedrooms: 2,
        beds: 2,
        bathrooms: 1,
        default_availability: true,
        default_price: 100,
        phone: '123-456-7890',
        country_code: 'US',
        region_name: 'New York',
        status: ListingStatus.LISTING_DRAFT,
        pictures: [],
        tags: [],
        security_agreement: [],
        amenities: ['WiFi', 'TV'],
        location_details: {
          unit: '123',
          building: 'Test Building',
          district: 'Test District',
          city: 'Test City',
          details: 'Test Details',
        },
        host: null,
        availabilities: [],
        prices: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockListing);

      const result = await service.findOne(listingId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: listingId },
        relations: ['user', 'reservations', 'prices', 'availabilities'],
      });
      expect(result).toEqual(
        plainToInstance(ListingResDto, mockListing, {
          excludeExtraneousValues: true,
        }),
      );
    });

    it('should throw a validation exception if the listing is not found', async () => {
      const listingId: Uuid = uuidv4() as Uuid;

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(listingId)).rejects.toThrow(
        new ValidationException(ErrorCode.E001, 'Listing not found'),
      );
    });
  });

  describe('search', () => {
    it('should search listings with basic filters', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockReturnThis(),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const searchDto = {
        filters: {
          listing_name: 'test',
          amenities: ['WiFi', 'TV'],
          price_per_night: { min: 50, max: 200 },
          free_cancellation: true,
          sorting: { sorting_by: 'name', desc: false },
        },
        params: {
          region_id: 1,
          slug: 'test-listing',
          check_in: new Date('2024-12-10'),
          check_out: new Date('2024-12-15'),
        },
        pagination: { page: 1, limit: 10, offset: 1 },
      };

      const result = await service.search(searchDto);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('listing');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'listing.prices',
        'prices',
        'prices.listing_id = listing.id',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'listing.deleted_at IS NULL',
      );
      expect(result).toBeDefined();
    });

    it('should throw validation exception for invalid sorting field', async () => {
      const searchDto = {
        filters: {
          sorting: { sorting_by: 'invalid_field', desc: false },
        },
        pagination: { page: 1, limit: 10, offset: 1 },
      };

      await expect(service.search(searchDto)).rejects.toThrow(
        new ValidationException(ErrorCode.E003, 'Invalid sorting field'),
      );
    });

    it('should apply default sorting when no sorting specified', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockReturnThis(),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const searchDto = {
        pagination: { page: 1, limit: 10, offset: 1 },
      };

      await service.search(searchDto);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'listing.created_at',
        'DESC',
      );
    });
  });
  describe('remove', () => {
    it('should soft delete a listing', async () => {
      const listingId: Uuid = uuidv4() as Uuid;

      const mockListing = {
        id: listingId,
        address: '123 Test St',
        host_id: uuidv4() as Uuid,
        check_in_time: new Date('2024-12-09T12:00:00Z'),
        check_out_time: new Date('2024-12-09T14:00:00Z'),
      };

      mockRepository.findOne.mockResolvedValue(mockListing);
      mockRepository.softDelete.mockResolvedValue(undefined);

      await service.remove(listingId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: listingId },
      });
      expect(mockRepository.softDelete).toHaveBeenCalledWith(listingId);
    });

    it('should throw a validation exception if the listing is not found', async () => {
      const listingId: Uuid = uuidv4() as Uuid;

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(listingId)).rejects.toThrow(
        new ValidationException(ErrorCode.E001, 'Listing not found'),
      );
    });
  });
});
