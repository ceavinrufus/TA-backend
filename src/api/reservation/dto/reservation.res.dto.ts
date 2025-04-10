import { DisputeResDto } from '@/api/dispute/dto/dispute.res.dto';
import { ListingResDto } from '@/api/listing/dto/listing.res.dto';
import { Uuid } from '@/common/types/common.type';
import { WrapperType } from '@/common/types/types';
import { ReservationStatus } from '@/constants/entity.enum';
import {
  ClassField,
  DateField,
  EnumField,
  JSONField,
  NumberField,
  StringField,
  UUIDField,
} from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';

export class ReservationResDto {
  @UUIDField()
  @Expose()
  id: Uuid;

  @StringField()
  @Expose()
  booking_number: string;

  @UUIDField()
  @Expose()
  listing_id: Uuid;

  @ClassField(() => ListingResDto)
  @Expose()
  listing: WrapperType<ListingResDto>;

  @ClassField(() => DisputeResDto)
  @Expose()
  dispute: WrapperType<DisputeResDto>;

  @UUIDField()
  @Expose()
  guest_id: Uuid;

  @UUIDField()
  @Expose()
  host_id: Uuid;

  @StringField()
  @Expose()
  listing_name: string;

  @StringField()
  @Expose()
  listing_address: string;

  @NumberField()
  @Expose()
  base_price: number;

  @NumberField()
  @Expose()
  tax: number;

  @NumberField()
  @Expose()
  service_fee: number;

  @NumberField({ int: true })
  @Expose()
  night_staying: number;

  @DateField()
  @Expose()
  check_in_date: Date;

  @DateField()
  @Expose()
  check_out_date: Date;

  @NumberField({ int: true })
  @Expose()
  guest_number: number;

  @NumberField()
  @Expose()
  total_price: number;

  @JSONField({ each: true })
  @Expose()
  guest_info: object[];

  @StringField()
  @Expose()
  guest_wallet_address: string;

  @EnumField(() => ReservationStatus)
  @Expose()
  status: ReservationStatus;

  @StringField()
  @Expose()
  cancel_reason: string;

  @StringField()
  @Expose()
  book_hash: string;

  @DateField()
  @Expose()
  deleted_at?: Date;
}
