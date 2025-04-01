import { Uuid } from '@/common/types/common.type';
import { DisputeStatus } from '@/constants/entity.enum';
import { ValidationException } from '@/exceptions/validation.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DisputeService } from './dispute.service';
import { CreateDisputeDto } from './dto/create-dispute.req.dto';
import { UpdateDisputeDto } from './dto/update-dispute.req.dto';
import { DisputeEntity } from './entities/dispute.entity';

describe('DisputeService', () => {
  let service: DisputeService;
  let repository: Repository<DisputeEntity>;
  const reservation1Id = uuidv4() as Uuid;
  const reservation2Id = uuidv4() as Uuid;
  const raisedById = uuidv4() as Uuid;

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
        DisputeService,
        {
          provide: getRepositoryToken(DisputeEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DisputeService>(DisputeService);
    repository = module.get<Repository<DisputeEntity>>(
      getRepositoryToken(DisputeEntity),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateDisputeDto = {
      reservation_id: reservation1Id,
      raised_by_id: raisedById,
      reasons: ['test'],
      status: DisputeStatus.PENDING,
    };

    it('should create a new dispute', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({
        id: reservation2Id,
        ...createDto,
      });

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ValidationException if dispute already exists', async () => {
      mockRepository.findOne.mockResolvedValue({ id: reservation2Id });

      await expect(service.create(createDto)).rejects.toThrow(
        ValidationException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a dispute', async () => {
      const dispute = { id: reservation1Id };
      mockRepository.findOneByOrFail.mockResolvedValue(dispute);

      const result = await service.findOne(reservation1Id);

      expect(result).toBeDefined();
      expect(mockRepository.findOneByOrFail).toHaveBeenCalledWith({
        id: reservation1Id,
      });
    });
  });

  describe('update', () => {
    it('should update a dispute', async () => {
      const updateDto: UpdateDisputeDto = { reasons: ['updated'] };
      const existingDispute = { id: reservation1Id, reasons: ['old'] };

      mockRepository.findOneByOrFail.mockResolvedValue(existingDispute);
      mockRepository.save.mockResolvedValue({
        ...existingDispute,
        ...updateDto,
      });

      await service.update(reservation1Id, updateDto);

      expect(mockRepository.save).toHaveBeenCalledWith({
        ...existingDispute,
        ...updateDto,
      });
    });
  });

  describe('remove', () => {
    it('should soft delete a dispute', async () => {
      mockRepository.findOneByOrFail.mockResolvedValue({ id: reservation1Id });

      await service.remove(reservation1Id);

      expect(mockRepository.softDelete).toHaveBeenCalledWith({
        id: reservation1Id,
      });
    });
  });
});
