import {
  DateFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { PartialType } from '@nestjs/swagger';
import { CreateDisputeDto } from './create-dispute.req.dto';

export class UpdateDisputeDto extends PartialType(CreateDisputeDto) {
  @DateFieldOptional()
  resolved_at?: Date;

  @StringFieldOptional()
  resolve_dispute_transaction_hash?: string;
}
