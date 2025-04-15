import { PolygonIdModule } from '@/shared/polygon-id/polygon-id.module';
import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { IssuerService } from './issuer.service';
import { VerifierService } from './verifier.service';

@Module({
  imports: [PolygonIdModule],
  controllers: [IdentityController],
  providers: [IdentityService, IssuerService, VerifierService],
  exports: [IdentityService, IssuerService, VerifierService],
})
export class IdentityModule {}
