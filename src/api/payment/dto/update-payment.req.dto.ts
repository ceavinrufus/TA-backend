import { PartialType } from '@nestjs/swagger';
import { CreatePaymentDto } from './create-payment.req.dto';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {}
