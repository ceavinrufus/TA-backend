import { PartialType } from '@nestjs/swagger';
import { CreateReservationDto } from './create-reservation.req.dto';

export class UpdateReservationDto extends PartialType(CreateReservationDto) {}
