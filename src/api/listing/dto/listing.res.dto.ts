import { AvailabilityResDto } from '@/api/availability/dto/availability.res.dto';
import { PriceResDto } from '@/api/price/dto/price.res.dto';
import { ReservationResDto } from '@/api/reservation/dto/reservation.res.dto';
import { UserResDto } from '@/api/user/dto/user.res.dto';
import { Uuid } from '@/common/types/common.type';
import { WrapperType } from '@/common/types/types';
import { ListingStatus } from '@/constants/entity.enum';
import {
  BooleanField,
  ClassField,
  EnumField,
  NumberField,
  StringField,
  UUIDField,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { LocationDetailsResDto } from './location-details.res.dto';

@Exclude()
export class ListingResDto {
  @UUIDField()
  @Expose()
  id: Uuid;

  @StringField()
  @Expose()
  slug: string;

  @StringField()
  @Expose()
  name: string;

  @StringField()
  @Expose()
  address: string;

  @NumberField()
  @Expose()
  region_id: number;

  @NumberField()
  @Expose()
  latitude: number;

  @NumberField()
  @Expose()
  longitude: number;

  @StringField()
  @Expose()
  earliest_check_in_time: string;

  @StringField()
  @Expose()
  latest_check_in_time: string;

  @StringField()
  @Expose()
  check_out_time: string;

  @StringField()
  @Expose()
  description: string;

  @StringField()
  @Expose()
  postal_code: string;

  @StringField()
  @Expose()
  property_type: string;

  @StringField()
  @Expose()
  place_type: string;

  @NumberField()
  @Expose()
  guest_number: number;

  @NumberField()
  @Expose()
  bedrooms: number;

  @NumberField()
  @Expose()
  beds: number;

  @NumberField()
  @Expose()
  bathrooms: number;

  @BooleanField()
  @Expose()
  default_availability: boolean;

  @NumberField()
  @Expose()
  default_price: number;

  @StringField()
  @Expose()
  phone: string;

  @StringField()
  @Expose()
  country_code: string;

  @StringField()
  @Expose()
  region_name: string;

  @EnumField(() => ListingStatus)
  @Expose()
  status: ListingStatus;

  @StringField({ each: true })
  @Expose()
  pictures: string[];

  @StringField({ each: true })
  @Expose()
  tags: string[];

  @StringField({ each: true })
  @Expose()
  rules: string[];

  @StringField({ each: true })
  @Expose()
  security_agreement: string[];

  @StringField({ each: true })
  @Expose()
  amenities: string[];

  @ClassField(() => LocationDetailsResDto)
  @Expose()
  location_details: WrapperType<LocationDetailsResDto>;

  @BooleanField()
  @Expose()
  is_instant_booking: boolean;

  @BooleanField()
  @Expose()
  is_no_free_cancellation: boolean;

  @StringField()
  @Expose()
  cancellation_policy: string;

  @StringField()
  @Expose()
  same_day_booking_cutoff_time: string;

  @NumberField()
  @Expose()
  max_booking_night: number;

  @NumberField()
  @Expose()
  min_booking_night: number;

  @StringField()
  @Expose()
  booking_window: string;

  @StringField()
  @Expose()
  buffer_period: string;

  @NumberField({ each: true })
  @Expose()
  restricted_check_in: number[];

  @NumberField({ each: true })
  @Expose()
  restricted_check_out: number[];

  @UUIDField()
  @Expose()
  host_id: Uuid;

  @ClassField(() => UserResDto)
  @Expose()
  host: WrapperType<UserResDto>;

  @ClassField(() => ReservationResDto)
  @Expose()
  reservations: WrapperType<ReservationResDto[]>;

  @ClassField(() => PriceResDto)
  @Expose()
  prices: WrapperType<PriceResDto[]>;

  @ClassField(() => AvailabilityResDto)
  @Expose()
  availabilities: WrapperType<AvailabilityResDto[]>;

  @ClassField(() => Date)
  @Expose()
  created_at: Date;

  @ClassField(() => Date)
  @Expose()
  updated_at: Date;
}
