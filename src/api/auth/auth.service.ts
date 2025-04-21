import { AllConfigType } from '@/config/config.type';
import { auth } from '@iden3/js-iden3-auth';
import { AuthorizationRequestMessage } from '@iden3/js-iden3-auth/dist/types/types-sdk';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { ethers } from 'ethers';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from '../user/entities/user.entity';
import { LoginReqDto } from './dto/login.req.dto';
import { LoginResDto } from './dto/login.res.dto';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpires: string;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    this.jwtSecret =
      this.configService.get('auth.secret', { infer: true }) ?? 'secret';
    this.jwtExpires =
      this.configService.get('auth.expires', { infer: true }) ?? '24h';
  }

  /**
   * Verifies a message signature from MetaMask
   */
  async verifySignature(
    address: string,
    signature: string,
    message: string,
  ): Promise<boolean> {
    // Recover the signer address from the signature
    const signerAddress = ethers.verifyMessage(message, signature);
    return signerAddress.toLowerCase() === address.toLowerCase();
  }

  /**
   * Generates a nonce for user authentication
   * @param address Wallet address
   */
  async generateNonce(address: string): Promise<string> {
    // Create a unique nonce based on address and current timestamp
    const timestamp = Date.now().toString();
    const nonce = ethers.keccak256(
      ethers.toUtf8Bytes(`${address.toLowerCase()}-${timestamp}`),
    );

    return nonce;
  }

  /**
   * Verifies a JWT access token
   * @param token JWT token to verify
   * @returns The decoded payload containing user data
   */
  async verifyAccessToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.jwtSecret,
      });

      // Check if user exists in database
      const user = await this.userRepository.findOne({
        where: { wallet_address: payload.address },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Creates a JWT access token
   * @param user User entity
   * @returns Signed JWT token
   */
  async createAccessToken(user: UserEntity): Promise<string> {
    const payload = {
      sub: user.id.toString(),
      address: user.wallet_address,
      id: user.id,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpires,
    });
  }

  /**
   * Authenticates a user and creates or updates their record in the database.
   * @param payload - Login request data containing user identification and wallet addresses
   * @returns Promise<LoginResDto> User data and access token
   */
  async authenticate(payload: LoginReqDto): Promise<LoginResDto> {
    const { address, signature, message } = payload;

    const isValid = await this.verifySignature(address, signature, message);
    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Find or create user
    let user = await this.userRepository.findOne({
      where: { wallet_address: payload.address },
    });

    if (!user) {
      // Create new user in our database
      user = this.userRepository.create({
        wallet_address: payload.address,
      });
    } else {
      // Update existing user's properties
      user.wallet_address = payload.address;
    }

    // Save/update user
    await this.userRepository.save(user);

    // Generate JWT token
    const accessToken = await this.createAccessToken(user);

    // Return LoginResDto with user data and access token
    return plainToInstance(LoginResDto, {
      message: 'Login successful!',
      user: user,
      accessToken: accessToken,
    });
  }

  async basicPrivadoAuth(
    sessionId: string,
  ): Promise<{ data: { request: AuthorizationRequestMessage } }> {
    const requestId = uuidv4();

    const isDevelopment =
      this.configService.getOrThrow('app.nodeEnv', { infer: true }) ===
      'development';
    const baseUrl = isDevelopment
      ? 'http://192.168.0.101:8000/'
      : this.configService.getOrThrow('app.url', { infer: true });
    const apiPrefix = this.configService.getOrThrow('app.apiPrefix', {
      infer: true,
    });

    const callbackURL = '/v1/identity/verifier/callback';
    const uri = `${baseUrl}${apiPrefix}${callbackURL}?sessionId=${sessionId}`;

    // Generate request for basic authentication
    const request = auth.createAuthorizationRequest(
      'Authorization request',
      'did:polygonid:polygon:amoy:2qQ68JkRcf3xrHPQPWZei3YeVzHPP58wYNxx2mEouR',
      uri,
    );

    request.id = requestId;
    request.thid = requestId;

    await this.cacheManager.set(
      `authRequest:${sessionId}`,
      request,
      3600 * 1000,
    );

    return { data: { request } };
  }
}
