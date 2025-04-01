import { Uuid } from '@/common/types/common.type';
import { WrapperType } from '@/common/types/types';
import { ListingStatus } from '@/constants/entity.enum';
import {
  BooleanFieldOptional,
  ClassFieldOptional,
  EnumFieldOptional,
  NumberFieldOptional,
  StringFieldOptional,
  UUIDField,
} from '@/decorators/field.decorators';
import { LocationDetailsResDto } from './location-details.res.dto';

export class CreateListingDto {
  @UUIDField()
  host_id: Uuid;

  @StringFieldOptional({ maxLength: 50 })
  name?: string;

  @StringFieldOptional({ maxLength: 255 })
  address?: string;

  @NumberFieldOptional()
  region_id?: number;

  @NumberFieldOptional({ min: -90, max: 90 })
  latitude?: number;

  @NumberFieldOptional({ min: -180, max: 180 })
  longitude?: number;

  @StringFieldOptional({ nullable: true })
  earliest_check_in_time?: string;

  @StringFieldOptional({ nullable: true })
  latest_check_in_time?: string;

  @StringFieldOptional({ nullable: true })
  check_out_time?: string;

  @StringFieldOptional({ nullable: true })
  description?: string;

  @StringFieldOptional({ maxLength: 10, nullable: true })
  postal_code?: string;

  @StringFieldOptional({ maxLength: 255, nullable: true })
  property_type?: string;

  @StringFieldOptional({ maxLength: 255, nullable: true })
  place_type?: string;

  @NumberFieldOptional({ nullable: true })
  guest_number?: number;

  @NumberFieldOptional({ nullable: true })
  bedrooms?: number;

  @NumberFieldOptional({ nullable: true })
  beds?: number;

  @NumberFieldOptional({ nullable: true })
  bathrooms?: number;

  @BooleanFieldOptional({ nullable: true })
  default_availability?: boolean;

  @NumberFieldOptional({ min: 0, nullable: true })
  default_price?: number;

  @StringFieldOptional({ maxLength: 20, nullable: true })
  phone?: string;

  @StringFieldOptional({ maxLength: 5, nullable: true })
  country_code?: string;

  @StringFieldOptional({ maxLength: 255, nullable: true })
  region_name?: string;

  @EnumFieldOptional(() => ListingStatus)
  status?: ListingStatus;

  @StringFieldOptional({ each: true, default: [] })
  pictures?: string[];

  @StringFieldOptional({ each: true, default: [] })
  tags?: string[];

  @StringFieldOptional({ each: true, default: [] })
  rules?: string[];

  @StringFieldOptional({ each: true, default: [] })
  security_agreement?: string[];

  @StringFieldOptional({ each: true, default: [] })
  amenities?: string[];

  @ClassFieldOptional(() => LocationDetailsResDto)
  location_details?: WrapperType<LocationDetailsResDto>;

  @BooleanFieldOptional({ nullable: true })
  is_instant_booking: boolean;

  @BooleanFieldOptional({ nullable: true })
  is_no_free_cancellation: boolean;

  @StringFieldOptional({ maxLength: 20, nullable: true })
  cancellation_policy: string;

  @StringFieldOptional({ nullable: true })
  same_day_booking_cutoff_time: string;

  @NumberFieldOptional({ nullable: true })
  max_booking_night: number;

  @NumberFieldOptional({ nullable: true })
  min_booking_night: number;

  @StringFieldOptional({ maxLength: 10, nullable: true, default: 'Inactive' })
  booking_window: string;

  @StringFieldOptional({ maxLength: 40, nullable: true, default: 'None' })
  buffer_period: string;

  @NumberFieldOptional({ each: true, default: [] })
  restricted_check_in: number[];

  @NumberFieldOptional({ each: true, default: [] })
  restricted_check_out: number[];
}
