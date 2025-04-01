import {
  ClassField,
  DateField,
  NumberField,
  StringField,
  UUIDField,
} from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';

export class PriceResDto {
  @UUIDField()
  @Expose()
  listing_id: string;

  @NumberField()
  @Expose()
  price_override: number;

  @StringField()
  @Expose()
  currency: string;

  @StringField({ maxLength: 50 })
  @Expose()
  type: string;

  @DateField()
  @Expose()
  start_date: Date;

  @DateField()
  @Expose()
  end_date: Date;

  @ClassField(() => Date)
  @Expose()
  created_at: Date;

  @ClassField(() => Date)
  @Expose()
  updated_at: Date;
}
