import { Uuid } from '@/common/types/common.type';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginReqDto } from './dto/login.req.dto';
import { LoginResDto } from './dto/login.res.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authServiceValue: Partial<Record<keyof AuthService, jest.Mock>>;

  beforeAll(async () => {
    authServiceValue = {
      authenticate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceValue,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.authenticate with correct parameters', async () => {
      const userId = uuidv4() as Uuid;
      const loginDto: LoginReqDto = {
        wallet_address: '0x123',
      };
      const expectedResponse: LoginResDto = {
        wallet_address: '0x123',
        userId,
      };

      authServiceValue.authenticate.mockResolvedValue(expectedResponse);

      const result = await controller.login(loginDto);

      expect(authServiceValue.authenticate).toHaveBeenCalledWith(loginDto);
      expect(result).toBe(expectedResponse);
    });
  });
});
