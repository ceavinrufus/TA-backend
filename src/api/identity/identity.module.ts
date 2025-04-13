import { PolygonIdModule } from '@/shared/polygon-id/polygon-id.module';
import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller';
import { IssuerService } from './issuer.service';

@Module({
  imports: [PolygonIdModule],
  controllers: [IdentityController],
  providers: [IssuerService],
  exports: [IssuerService],
})
export class IdentityModule {}
