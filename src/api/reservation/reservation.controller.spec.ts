import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';

describe('ReservationController', () => {
  let controller: ReservationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationController],
      providers: [
        ReservationService,
        {
          provide: 'ReservationEntityRepository',
          useValue: {},
        },
        {
          provide: 'ListingEntityRepository',
          useValue: {},
        },
        {
          provide: CACHE_MANAGER,
          useValue: {},
        },
        {
          provide: 'BullQueue_reservationQueue',
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ReservationController>(ReservationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
