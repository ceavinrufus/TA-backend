import { Uuid } from '@/common/types/common.type';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserReqDto } from './dto/create-user.req.dto';
import { UserResDto } from './dto/user.res.dto';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let userServiceValue: Partial<Record<keyof UserService, jest.Mock>>;

  beforeAll(async () => {
    userServiceValue = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UserService,
          useValue: userServiceValue,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO: write unit tests for getCurrentUser method

  describe('createUser', () => {
    it('should return a user', async () => {
      const createUserReqDto = {
        name: 'john',
        email: 'mail@example.com',
        wallet_address: '0x',
      } as CreateUserReqDto;

      const userResDto = new UserResDto();
      userResDto.id = '123e4567-e89b-12d3-a456-426614174000' as Uuid;
      userResDto.name = 'john';
      userResDto.email = 'mail@example.com';
      userResDto.wallet_address = '0x';
      userResDto.created_at = new Date();
      userResDto.updated_at = new Date();

      userServiceValue.create.mockReturnValue(userResDto);
      const user = await service.create(createUserReqDto);

      expect(user).toBe(userResDto);
      expect(userServiceValue.create).toHaveBeenCalledWith(createUserReqDto);
      expect(userServiceValue.create).toHaveBeenCalledTimes(1);
    });

    it('should return null', async () => {
      userServiceValue.create.mockReturnValue(null);
      const user = await service.create({} as CreateUserReqDto);

      expect(user).toBeNull();
      expect(userServiceValue.create).toHaveBeenCalledWith({});
      expect(userServiceValue.create).toHaveBeenCalledTimes(1);
    });

    describe('CreateUserReqDto', () => {
      let createUserReqDto: CreateUserReqDto;

      beforeEach(() => {
        createUserReqDto = plainToInstance(CreateUserReqDto, {
          name: 'john',
          email: 'mail@example.com',
          password: 'password',
          wallet_address: '0x',
        });
      });

      it('should success with correctly data', async () => {
        const errors = await validate(createUserReqDto);
        expect(errors.length).toEqual(0);
      });

      it('should fail with invalid email', async () => {
        createUserReqDto.email = 'invalid-email';
        const errors = await validate(createUserReqDto);
        expect(errors.length).toEqual(1);
        expect(errors[0].constraints).toEqual({
          isEmail: 'email must be an email',
        });
      });

      it('should fail with wallet_address is null', async () => {
        createUserReqDto.wallet_address = null;
        const errors = await validate(createUserReqDto);
        expect(errors.length).toEqual(1);
      });

      it('should fail with wallet_address is undefined', async () => {
        createUserReqDto.wallet_address = undefined;
        const errors = await validate(createUserReqDto);
        expect(errors.length).toEqual(1);
      });
    });
  });

  // TODO: write unit tests for findAllUsers method
  // TODO: write unit tests for loadMoreUsers method

  describe('findUser', () => {
    it('should return a user', async () => {
      const userResDto = new UserResDto();
      userResDto.id = '123e4567-e89b-12d3-a456-426614174000' as Uuid;
      userResDto.name = 'john';
      userResDto.email = 'mail@example.com';
      userResDto.wallet_address = '0x';
      userResDto.created_at = new Date();
      userResDto.updated_at = new Date();

      userServiceValue.findOne.mockReturnValue(userResDto);
      const user = await service.findOne('1' as Uuid);

      expect(user).toBe(userResDto);
      expect(userServiceValue.findOne).toHaveBeenCalledWith('1');
      expect(userServiceValue.findOne).toHaveBeenCalledTimes(1);
    });

    it('should return null', async () => {
      userServiceValue.findOne.mockReturnValue(null);
      const user = await service.findOne('1' as Uuid);

      expect(user).toBeNull();
      expect(userServiceValue.findOne).toHaveBeenCalledWith('1');
      expect(userServiceValue.findOne).toHaveBeenCalledTimes(1);
    });
  });
});
