import { registerAs } from '@nestjs/config';

import { IsNotEmpty, IsString } from 'class-validator';
import validateConfig from '../../../utils/validate-config';
import { PolygonIdConfig } from './polygon-id-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  // @IsNotEmpty()
  WALLET_KEY: string;

  @IsString()
  @IsNotEmpty()
  RPC_URL: string;

  @IsString()
  @IsNotEmpty()
  RHS_URL: string;

  @IsString()
  // @IsNotEmpty()
  IPFS_URL: string;

  @IsString()
  @IsNotEmpty()
  STATE_CONTRACT_ADDRESS: string;

  @IsString()
  // @IsNotEmpty()
  CIRCUITS_PATH: string;

  @IsString()
  // @IsNotEmpty()
  CHAIN_ID: string;
}

export default registerAs<PolygonIdConfig>('polygonId', () => {
  console.info(`Register PolygonIdConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    walletKey: process.env.WALLET_KEY,
    rpcUrl: process.env.RPC_URL,
    rhsUrl: process.env.RHS_URL,
    ipfsUrl: process.env.IPFS_URL,
    stateContractAddress: process.env.STATE_CONTRACT_ADDRESS,
    circuitsPath: process.env.CIRCUITS_PATH,
    chainId: process.env.CHAIN_ID,
  };
});
