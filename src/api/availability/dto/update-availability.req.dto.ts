import { PartialType } from '@nestjs/swagger';
import { CreateAvailabilityDto } from './create-availability.req.dto';

export class UpdateAvailabilityDto extends PartialType(CreateAvailabilityDto) {}
