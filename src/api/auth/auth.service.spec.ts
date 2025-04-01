import { Uuid } from '@/common/types/common.type';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from '../user/entities/user.entity';
import { AuthService } from './auth.service';
import { LoginReqDto } from './dto/login.req.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepositoryValue: Partial<
    Record<keyof Repository<UserEntity>, jest.Mock>
  >;
  const userId = uuidv4() as Uuid;

  beforeEach(async () => {
    userRepositoryValue = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepositoryValue,
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('authenticate', () => {
    it('should create new user if not exists', async () => {
      const loginDto = new LoginReqDto();
      loginDto.wallet_address = '0x123';

      userRepositoryValue.findOne.mockResolvedValue(null);
      userRepositoryValue.create.mockReturnValue({
        userId: userId,
        wallet_address: loginDto.wallet_address,
      });

      const result = await service.authenticate(loginDto);

      expect(result.userId).toBe(userId);
      expect(result.wallet_address).toBe(loginDto.wallet_address);
      expect(userRepositoryValue.save).toHaveBeenCalled();
    });
  });
});
