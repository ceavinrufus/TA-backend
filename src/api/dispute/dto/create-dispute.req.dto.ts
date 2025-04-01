import { Uuid } from '@/common/types/common.type';
import { DisputeStatus } from '@/constants/entity.enum';
import {
  EnumField,
  StringField,
  StringFieldOptional,
  UUIDField,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';

export class CreateDisputeDto {
  @UUIDField()
  reservation_id: Uuid;

  @UUIDField()
  raised_by_id: Uuid;

  @StringField({ each: true, default: [] })
  reasons: string[];

  @StringFieldOptional()
  guest_claim?: string;

  @StringFieldOptional()
  host_response?: string;

  @StringFieldOptional()
  mediator_notes?: string;

  @StringFieldOptional()
  resolution_reason?: string;

  @UUIDFieldOptional()
  mediator_id?: Uuid;

  @StringFieldOptional({ each: true, default: [] })
  evidences?: string[];

  @StringFieldOptional()
  raise_dispute_transaction_hash?: string;

  @EnumField(() => DisputeStatus)
  status: DisputeStatus;
}
