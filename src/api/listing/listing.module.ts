import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingEntity } from './entities/listing.entity';
import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';

@Module({
  imports: [TypeOrmModule.forFeature([ListingEntity])],
  controllers: [ListingController],
  providers: [ListingService],
  exports: [ListingService],
})
export class ListingModule {}
