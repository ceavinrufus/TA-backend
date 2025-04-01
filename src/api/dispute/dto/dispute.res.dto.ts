import { ReservationResDto } from '@/api/reservation/dto/reservation.res.dto';
import { Uuid } from '@/common/types/common.type';
import { WrapperType } from '@/common/types/types';
import { DisputeStatus } from '@/constants/entity.enum';
import {
  ClassField,
  EnumField,
  StringField,
  UUIDField,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class DisputeResDto {
  @UUIDField()
  @Expose()
  id: Uuid;

  @UUIDField()
  @Expose()
  reservation_id: Uuid;

  @ClassField(() => ReservationResDto)
  @Expose()
  reservation: WrapperType<ReservationResDto>;

  @UUIDField()
  @Expose()
  raised_by_id: Uuid;

  @ClassField(() => Date)
  @Expose()
  raised_at: Date;

  @ClassField(() => Date)
  @Expose()
  resolved_at: Date;

  @EnumField(() => DisputeStatus)
  @Expose()
  status: DisputeStatus;

  @StringField({ each: true })
  @Expose()
  reasons: string[];

  @StringField()
  @Expose()
  guest_claim: string;

  @StringField()
  @Expose()
  host_response: string;

  @StringField()
  @Expose()
  mediator_notes: string;

  @StringField()
  @Expose()
  resolution_reason: string;

  @UUIDField()
  @Expose()
  mediator_id: Uuid;

  @StringField({ each: true })
  @Expose()
  evidences: string[];

  @StringField()
  @Expose()
  raise_dispute_transaction_hash: string;

  @StringField()
  @Expose()
  resolve_dispute_transaction_hash: string;

  @ClassField(() => Date)
  @Expose()
  created_at: Date;

  @ClassField(() => Date)
  @Expose()
  updated_at: Date;
}
