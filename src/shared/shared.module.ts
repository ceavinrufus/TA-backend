import { Global, Module } from '@nestjs/common';
import { PolygonIdModule } from './polygon-id/polygon-id.module';

@Global()
@Module({
  imports: [PolygonIdModule],
})
export class SharedModule {}
