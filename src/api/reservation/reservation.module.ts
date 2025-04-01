import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingEntity } from '../listing/entities/listing.entity';
import { ReservationEntity } from './entities/reservation.entity';
import { ReservationController } from './reservation.controller';
import { ReservationProcessor } from './reservation.processor';
import { ReservationService } from './reservation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReservationEntity, ListingEntity]),
    BullModule.registerQueue({
      name: 'reservationQueue',
    }),
  ],
  controllers: [ReservationController],
  providers: [ReservationService, ReservationProcessor],
  exports: [ReservationService],
})
export class ReservationModule {}
