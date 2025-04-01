import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { ethers } from 'ethers';
import { Repository } from 'typeorm';
import { UserEntity } from '../user/entities/user.entity';
import { LoginReqDto } from './dto/login.req.dto';
import { LoginResDto } from './dto/login.res.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

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
   * Authenticates a user and creates or updates their record in the database.
   * @param payload - Login request data containing user identification and wallet addresses
   * @returns Promise<LoginResDto> User ID and Firebase ID
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

    // Return LoginResDto with Firebase ID token
    return plainToInstance(LoginResDto, {
      message: 'Login successful!',
      user: user,
    });
  }
}
