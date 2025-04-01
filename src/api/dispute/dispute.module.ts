import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisputeController } from './dispute.controller';
import { DisputeService } from './dispute.service';
import { DisputeEntity } from './entities/dispute.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DisputeEntity])],
  controllers: [DisputeController],
  providers: [DisputeService],
  exports: [DisputeService],
})
export class DisputeModule {}
