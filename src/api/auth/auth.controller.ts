import { ApiPublic } from '@/decorators/http.decorators';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginReqDto } from './dto/login.req.dto';
import { LoginResDto } from './dto/login.res.dto';

@ApiTags('auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiPublic()
  @Post('login')
  async login(@Body() payload: LoginReqDto): Promise<LoginResDto> {
    return await this.authService.authenticate(payload);
  }
}
