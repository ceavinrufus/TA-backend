import { Uuid } from '@/common/types/common.type';
import {
  DateField,
  NumberField,
  StringField,
  UUIDField,
} from '@/decorators/field.decorators';

export class CreatePriceDto {
  @UUIDField()
  listing_id: Uuid;

  @NumberField({ isPositive: true })
  price_override: number;

  @StringField()
  currency: string;

  @StringField({ maxLength: 50 })
  type: string;

  @DateField()
  start_date: Date;

  @DateField()
  end_date: Date;
}
