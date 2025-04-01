import { Uuid } from '@/common/types/common.type';
import { ValidationException } from '@/exceptions/validation.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.req.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.req.dto';
import { AvailabilityEntity } from './entities/availability.entity';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let repository: Repository<AvailabilityEntity>;
  const listingId = uuidv4() as Uuid;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    findOneByOrFail: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      orderBy: jest.fn().mockReturnThis(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: getRepositoryToken(AvailabilityEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
    repository = module.get<Repository<AvailabilityEntity>>(
      getRepositoryToken(AvailabilityEntity),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateAvailabilityDto = {
      listing_id: listingId,
      start_date: new Date(),
      end_date: new Date(),
      availability_override: true,
    };

    it('should create availability successfully', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(createDto);

      const result = await service.create(createDto);
      expect(result).toBeDefined();
    });

    it('should throw ValidationException if availability already exists', async () => {
      mockRepository.findOne.mockResolvedValue(createDto);

      await expect(service.create(createDto)).rejects.toThrow(
        ValidationException,
      );
    });
  });

  describe('findOne', () => {
    it('should find one availability', async () => {
      const availability = new AvailabilityEntity({
        listing_id: listingId,
        start_date: new Date(),
        end_date: new Date(),
      });
      mockRepository.findOneByOrFail.mockResolvedValue(availability);

      const result = await service.findOne(listingId, new Date(), new Date());
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    const updateDto: UpdateAvailabilityDto = {
      start_date: new Date(),
      end_date: new Date(),
      availability_override: false,
    };

    it('should update availability successfully', async () => {
      const availability = new AvailabilityEntity({
        listing_id: listingId,
        start_date: new Date(),
        end_date: new Date(),
      });
      mockRepository.findOneByOrFail.mockResolvedValue(availability);
      mockRepository.save.mockResolvedValue({ ...availability, ...updateDto });

      await service.update(listingId, new Date(), new Date(), updateDto);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove availability successfully', async () => {
      mockRepository.findOneByOrFail.mockResolvedValue({});
      mockRepository.softDelete.mockResolvedValue({});

      await service.remove(listingId, new Date(), new Date());
      expect(mockRepository.softDelete).toHaveBeenCalled();
    });
  });
});
