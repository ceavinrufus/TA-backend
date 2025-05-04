import {
  BooleanFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class CreateUserReqDto {
  @StringFieldOptional()
  did: string;

  @StringField()
  wallet_address: string;

  @BooleanFieldOptional()
  is_liveness_verified?: boolean;

  @BooleanFieldOptional()
  is_uniqueness_verified?: boolean;

  @BooleanFieldOptional()
  is_identity_verified?: boolean;

  @BooleanFieldOptional()
  is_host?: boolean;

  @BooleanFieldOptional()
  is_admin?: boolean;
}
