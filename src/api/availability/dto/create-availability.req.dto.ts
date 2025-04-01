import { Uuid } from '@/common/types/common.type';
import {
  BooleanField,
  DateField,
  UUIDField,
} from '@/decorators/field.decorators';

export class CreateAvailabilityDto {
  @UUIDField()
  listing_id: Uuid;

  @DateField()
  start_date: Date;

  @DateField()
  end_date: Date;

  @BooleanField()
  availability_override: boolean;
}
