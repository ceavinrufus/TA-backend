import { PartialType } from '@nestjs/swagger';
import { CreateUserReqDto } from './create-user.req.dto';

export class UpdateUserReqDto extends PartialType(CreateUserReqDto) {}
