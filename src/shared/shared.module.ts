import { Global, Module } from '@nestjs/common';
import { IdentityModule } from './identity/identity.module';

@Global()
@Module({
  imports: [IdentityModule],
})
export class SharedModule {}
