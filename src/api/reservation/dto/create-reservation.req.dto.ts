import { Uuid } from '@/common/types/common.type';
import { ReservationStatus } from '@/constants/entity.enum';
import {
  BooleanFieldOptional,
  ClassFieldOptional,
  DateFieldOptional,
  EnumFieldOptional,
  NumberFieldOptional,
  StringFieldOptional,
  UUIDField,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';

export class UserOrderInfoDto {
  @StringFieldOptional()
  first_name?: string;

  @StringFieldOptional()
  last_name?: string;

  @BooleanFieldOptional()
  is_child?: boolean;

  @NumberFieldOptional()
  age?: number;

  @StringFieldOptional()
  email?: string;

  @StringFieldOptional()
  phone?: string;

  @StringFieldOptional()
  residency?: string;

  @StringFieldOptional()
  title?: string;
}

export class CreateReservationDto {
  @UUIDField()
  listing_id: Uuid; // Required field

  @StringFieldOptional()
  booking_number?: string;

  @UUIDFieldOptional()
  guest_id?: Uuid;

  @UUIDFieldOptional()
  host_id?: Uuid;

  @NumberFieldOptional()
  base_price: number;

  @NumberFieldOptional()
  tax: number;

  @NumberFieldOptional()
  service_fee: number;

  @NumberFieldOptional()
  night_staying?: number;

  @DateFieldOptional()
  check_in_date?: Date;

  @DateFieldOptional()
  check_out_date?: Date;

  @NumberFieldOptional()
  guest_number?: number;

  @NumberFieldOptional()
  total_price?: number;

  @ClassFieldOptional(() => UserOrderInfoDto, {
    default: [],
    isArray: true,
  })
  guest_info?: UserOrderInfoDto[];

  @StringFieldOptional()
  guest_wallet_address?: string;

  @EnumFieldOptional(() => ReservationStatus)
  status?: ReservationStatus;

  @StringFieldOptional()
  cancel_reason?: string;

  @StringFieldOptional()
  book_hash?: string;

  @StringFieldOptional()
  guest_did?: string;
}
