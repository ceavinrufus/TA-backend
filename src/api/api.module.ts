import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { DisputeModule } from './dispute/dispute.module';
import { HealthModule } from './health/health.module';
import { HomeModule } from './home/home.module';
import { IdentityModule } from './identity/identity.module';
import { ListingModule } from './listing/listing.module';
import { PaymentModule } from './payment/payment.module';
import { PriceModule } from './price/price.module';
import { ReservationModule } from './reservation/reservation.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    UserModule,
    HealthModule,
    AuthModule,
    HomeModule,
    ListingModule,
    PriceModule,
    PaymentModule,
    ReservationModule,
    AvailabilityModule,
    DisputeModule,
    IdentityModule,
  ],
})
export class ApiModule {}
