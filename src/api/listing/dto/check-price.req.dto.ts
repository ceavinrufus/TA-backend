import {
  BooleanFieldOptional,
  ClassFieldOptional,
  DateFieldOptional,
  NumberFieldOptional,
} from '@/decorators/field.decorators'; // Use the specific decorators you mentioned

class GuestDto {
  @NumberFieldOptional()
  adults?: number;

  @NumberFieldOptional({ each: true })
  children?: number[];
}

export class CheckPriceDto {
  @DateFieldOptional()
  startDate?: Date;

  @DateFieldOptional()
  endDate?: Date;

  @ClassFieldOptional(() => GuestDto)
  guests?: GuestDto;

  @BooleanFieldOptional({ default: true })
  use_cache?: boolean;

  // @StringFieldOptional()
  // currency?: string;

  // @NumberFieldOptional()
  // region_id?: number;
}
