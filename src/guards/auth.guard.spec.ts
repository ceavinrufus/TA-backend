import { AuthService } from '@/api/auth/auth.service';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: Partial<Record<keyof Reflector, jest.Mock>>;
  let authService: Partial<Record<keyof AuthService, jest.Mock>>;
  let configService: Partial<Record<keyof ConfigService, jest.Mock>>;
  let context: Partial<Record<keyof ExecutionContext, jest.Mock>>;
  let module: TestingModule;

  const API_KEY = 'test-api-key';

  beforeAll(async () => {
    authService = {
      verifyAccessToken: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue(API_KEY),
    };

    reflector = {
      getAllAndOverride: jest.fn(),
    };

    context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn(),
      }),
    };

    module = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: Reflector,
          useValue: reflector,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();
    guard = module.get<AuthGuard>(AuthGuard);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    module.close();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true if the route is public', async () => {
      const isPublic = true;
      reflector.getAllAndOverride.mockReturnValue(isPublic);

      const result = await guard.canActivate(context as ExecutionContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(1);
      expect(context.switchToHttp().getRequest).not.toHaveBeenCalled();
      expect(authService.verifyAccessToken).not.toHaveBeenCalled();
    });

    it('should return true if the route is auth optional and no token/apiKey is provided', async () => {
      const isPublic = false;
      reflector.getAllAndOverride.mockReturnValueOnce(isPublic);

      const isAuthOptional = true;
      reflector.getAllAndOverride.mockReturnValueOnce(isAuthOptional);

      context.switchToHttp().getRequest.mockReturnValue({
        headers: {},
      });

      const result = await guard.canActivate(context as ExecutionContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(2);
      expect(context.switchToHttp().getRequest).toHaveBeenCalledTimes(1);
    });

    it('should return true when valid API key is provided', async () => {
      const isPublic = false;
      reflector.getAllAndOverride.mockReturnValueOnce(isPublic);
      reflector.getAllAndOverride.mockReturnValueOnce(false); // isAuthOptional

      context.switchToHttp().getRequest.mockReturnValue({
        headers: {
          'x-api-key': API_KEY,
        },
      });

      const result = await guard.canActivate(context as ExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when invalid API key is provided', async () => {
      const isPublic = false;
      reflector.getAllAndOverride.mockReturnValueOnce(isPublic);
      reflector.getAllAndOverride.mockReturnValueOnce(false); // isAuthOptional

      context.switchToHttp().getRequest.mockReturnValue({
        headers: {
          'x-api-key': 'invalid-key',
        },
      });

      await expect(
        guard.canActivate(context as ExecutionContext),
      ).rejects.toThrow(new UnauthorizedException('Invalid API Key'));
    });

    it('should verify the token and return true if token is valid', async () => {
      const isPublic = false;
      reflector.getAllAndOverride.mockReturnValueOnce(isPublic);
      reflector.getAllAndOverride.mockReturnValueOnce(false); // isAuthOptional

      const request = {
        headers: {
          authorization: 'Bearer validToken',
        },
      };

      context.switchToHttp().getRequest.mockReturnValue(request);
      authService.verifyAccessToken.mockResolvedValueOnce({ id: 'user-id' });

      const result = await guard.canActivate(context as ExecutionContext);

      expect(result).toBe(true);
      expect(request['user']).toEqual({ id: 'user-id' });
      expect(authService.verifyAccessToken).toHaveBeenCalledWith('validToken');
    });

    it('should throw UnauthorizedException when no token or API key is provided', async () => {
      const isPublic = false;
      reflector.getAllAndOverride.mockReturnValueOnce(isPublic);
      reflector.getAllAndOverride.mockReturnValueOnce(false); // isAuthOptional

      context.switchToHttp().getRequest.mockReturnValue({
        headers: {},
      });

      await expect(
        guard.canActivate(context as ExecutionContext),
      ).rejects.toThrow(new UnauthorizedException('Access token is required'));
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      const isPublic = false;
      reflector.getAllAndOverride.mockReturnValueOnce(isPublic);
      reflector.getAllAndOverride.mockReturnValueOnce(false); // isAuthOptional

      context.switchToHttp().getRequest.mockReturnValue({
        headers: {
          authorization: 'Bearer invalidToken',
        },
      });

      authService.verifyAccessToken.mockRejectedValueOnce(
        new UnauthorizedException(),
      );

      await expect(
        guard.canActivate(context as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
