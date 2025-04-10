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
