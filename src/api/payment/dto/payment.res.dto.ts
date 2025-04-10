import { Uuid } from '@/common/types/common.type';
import {
  BooleanField,
  DateField,
  NumberField,
  StringField,
  UUIDField,
} from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';

export class PaymentResDto {
  @UUIDField()
  @Expose()
  id: Uuid;

  @NumberField()
  @Expose()
  amount: number;

  @BooleanField()
  @Expose()
  is_successful: boolean;

  @StringField({ maxLength: 50 })
  @Expose()
  transaction_hash: string;

  @UUIDField()
  @Expose()
  reservation_id: Uuid;

  @DateField()
  @Expose()
  deleted_at?: Date;
}
