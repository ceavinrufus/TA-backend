import { Uuid } from '@/common/types/common.type';
import {
  BooleanField,
  NumberField,
  StringFieldOptional,
  UUIDField,
} from '@/decorators/field.decorators';

export class CreatePaymentDto {
  @UUIDField()
  reservation_id: Uuid; // Required field

  @NumberField()
  amount: number; // Required field

  @BooleanField()
  is_successful: boolean; // Required field

  @StringFieldOptional()
  transaction_hash?: string;
}
