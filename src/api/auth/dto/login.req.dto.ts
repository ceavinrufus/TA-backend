import { StringField } from '@/decorators/field.decorators';

export class LoginReqDto {
  @StringField()
  address: string;

  @StringField()
  signature: string;

  @StringField()
  message: string;
}
