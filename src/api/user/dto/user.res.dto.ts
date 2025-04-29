import { ListingResDto } from '@/api/listing/dto/listing.res.dto';
import { ReservationResDto } from '@/api/reservation/dto/reservation.res.dto';
import { Uuid } from '@/common/types/common.type';
import { WrapperType } from '@/common/types/types';
import {
  BooleanField,
  ClassField,
  StringField,
  UUIDField,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserResDto {
  @UUIDField()
  @Expose()
  id: Uuid;

  @StringField()
  @Expose()
  name: string;

  @StringField()
  @Expose()
  email: string;

  @StringField()
  @Expose()
  wallet_address: string;

  @BooleanField()
  @Expose()
  is_liveness_verified: boolean;

  @BooleanField()
  @Expose()
  is_uniqueness_verified: boolean;

  @BooleanField()
  @Expose()
  is_identity_verified: boolean;

  @BooleanField()
  @Expose()
  is_host: boolean;

  @BooleanField()
  @Expose()
  is_admin: boolean;

  @BooleanField()
  @Expose()
  is_profile_complete: boolean;

  @BooleanField()
  @Expose()
  has_listed_listing: boolean;

  @ClassField(() => ListingResDto)
  @Expose()
  listings?: WrapperType<ListingResDto[]>;

  @ClassField(() => ReservationResDto)
  @Expose()
  reservations_got?: WrapperType<ReservationResDto[]>;

  @ClassField(() => ReservationResDto)
  @Expose()
  reservations_made?: WrapperType<ReservationResDto[]>;

  @ClassField(() => Date)
  @Expose()
  created_at: Date;

  @ClassField(() => Date)
  @Expose()
  updated_at: Date;
}
