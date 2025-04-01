import {
  BooleanField,
  ClassField,
  DateField,
  UUIDField,
} from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';

export class AvailabilityResDto {
  @UUIDField()
  @Expose()
  listing_id: string;

  @DateField()
  @Expose()
  start_date: Date;

  @DateField()
  @Expose()
  end_date: Date;

  @BooleanField()
  @Expose()
  availability_override: boolean;

  @ClassField(() => Date)
  @Expose()
  created_at: Date;

  @ClassField(() => Date)
  @Expose()
  updated_at: Date;
}
