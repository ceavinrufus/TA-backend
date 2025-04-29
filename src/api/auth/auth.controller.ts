import { ApiPublic } from '@/decorators/http.decorators';
import { AuthorizationRequestMessage } from '@iden3/js-iden3-auth/dist/types/types-sdk';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
  @Get('nonce')
  async getNonce(@Query('address') address: string) {
    if (!address) {
      return { error: 'Wallet address is required' };
    }

    const nonce = await this.authService.generateNonce(address);
    return { nonce };
  }

  @ApiPublic()
  @Post('login')
  async login(@Body() payload: LoginReqDto): Promise<LoginResDto> {
    return await this.authService.authenticate(payload);
  }

  @Post('did/:sessionId')
  @ApiPublic({
    summary: 'Request Privado ID auth',
  })
  async basicAuth(
    @Param('sessionId') sessionId: string,
  ): Promise<{ data: { request: AuthorizationRequestMessage } }> {
    return this.authService.basicPrivadoAuth(sessionId);
  }
}
