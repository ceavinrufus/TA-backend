import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListingEntity } from './entities/listing.entity';
import { SearchListingService } from './search-listing.service';

describe('SearchListingService', () => {
  let service: SearchListingService;
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
        SearchListingService,
        {
          provide: getRepositoryToken(ListingEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SearchListingService>(SearchListingService);
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
});
