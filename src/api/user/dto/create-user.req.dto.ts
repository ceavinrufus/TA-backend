import {
  BooleanFieldOptional,
  EmailFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { lowerCaseTransformer } from '@/utils/transformers/lower-case.transformer';
import { Transform } from 'class-transformer';

export class CreateUserReqDto {
  @StringFieldOptional()
  @Transform(lowerCaseTransformer)
  name: string;

  @EmailFieldOptional()
  email?: string;

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
