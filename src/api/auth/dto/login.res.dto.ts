import { UserResDto } from '@/api/user/dto/user.res.dto';
import { WrapperType } from '@/common/types/types';
import { ClassField, StringField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class LoginResDto {
  @StringField()
  @Expose()
  message!: string;

  @ClassField(() => UserResDto)
  @Expose()
  user!: WrapperType<UserResDto>;

  @StringField()
  @Expose()
  accessToken!: string;
}
