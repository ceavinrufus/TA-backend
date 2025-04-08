import { AuthService } from '@/api/auth/auth.service';
import { AllConfigType } from '@/config/config.type';
import { IS_AUTH_OPTIONAL, IS_PUBLIC } from '@/constants/app.constant';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly API_KEY: string;

  constructor(
    private reflector: Reflector,
    private authService: AuthService,
    private configService: ConfigService<AllConfigType>,
  ) {
    this.API_KEY = this.configService.get<string>('app.apiKey', {
      infer: true,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const isAuthOptional = this.reflector.getAllAndOverride<boolean>(
      IS_AUTH_OPTIONAL,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const accessToken = this.extractTokenFromHeader(request);
    const apiKey = this.extractApiKeyFromHeader(request);

    // If authentication is optional and no token is provided, allow access
    if (isAuthOptional && !accessToken && !apiKey) {
      return true;
    }

    // Check if API Key authentication is used
    if (apiKey) {
      if (apiKey !== this.API_KEY) {
        throw new UnauthorizedException('Invalid API Key');
      }
      return true;
    }

    // Check if Bearer token authentication is used
    if (!accessToken) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      // Validate JWT token using jose in the authService
      request.user = await this.authService.verifyAccessToken(accessToken);
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractApiKeyFromHeader(request: Request): string | undefined {
    return request.headers['x-api-key'] as string | undefined;
  }
}
