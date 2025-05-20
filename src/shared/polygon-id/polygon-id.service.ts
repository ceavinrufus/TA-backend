import { AllConfigType } from '@/config/config.type';
import {
  core,
  CredentialStatusType,
  ICircuitStorage,
  ICredentialWallet,
  IDataStorage,
  IIdentityWallet,
  ProofService,
} from '@0xpolygonid/js-sdk';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class PolygonIdService {
  private issuerDID: core.DID;
  private proofService: ProofService;

  constructor(
    @Inject('DataStorage') private dataStorage: IDataStorage,
    @Inject('CredentialWallet') private credentialWallet: ICredentialWallet,
    @Inject('IdentityWallet') private identityWallet: IIdentityWallet,
    @Inject('CircuitStorage') private circuitStorage: ICircuitStorage,
    private readonly configService: ConfigService<AllConfigType>,
  ) {
    this.initializeIssuerDID().then((did) => {
      this.issuerDID = did;
    });
    this.proofService = new ProofService(
      identityWallet,
      credentialWallet,
      circuitStorage,
      this.dataStorage.states,
      {
        ipfsGatewayURL: this.configService.getOrThrow('polygonId.ipfsUrl', {
          infer: true,
        }),
      },
    );
  }

  async initializeIssuerDID(): Promise<core.DID> {
    // Initialize the issuer DID
    console.log('=============== Initializing Issuer DID ===============');

    const walletKey = this.configService.getOrThrow('polygonId.walletKey', {
      infer: true,
    });

    // Generate a key from the wallet key
    // This key is used to create a seed for creating issuer DID
    const key = ethers.keccak256(ethers.toUtf8Bytes(walletKey));
    const seed = ethers.getBytes(key);

    const { did: issuerDID } = await this.identityWallet.createIdentity({
      method: core.DidMethod.Iden3,
      blockchain: core.Blockchain.Polygon,
      networkId: core.NetworkId.Amoy,
      revocationOpts: {
        type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
        id: this.configService.getOrThrow('polygonId.rhsUrl', { infer: true }),
      },
      seed,
    });

    console.log('Issuer DID:', issuerDID.string());

    return issuerDID;
  }

  getIssuerDID(): core.DID {
    return this.issuerDID;
  }
  getCredentialWallet(): ICredentialWallet {
    return this.credentialWallet;
  }
  getIdentityWallet(): IIdentityWallet {
    return this.identityWallet;
  }
  getDataStorage(): IDataStorage {
    return this.dataStorage;
  }
  getCircuitStorage(): ICircuitStorage {
    return this.circuitStorage;
  }
  getProofService(): ProofService {
    return this.proofService;
  }
}
