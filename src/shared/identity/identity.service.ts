import { AllConfigType } from '@/config/config.type';
import {
  core,
  CredentialStatusType,
  ICredentialWallet,
  IDataStorage,
  IIdentityWallet,
} from '@0xpolygonid/js-sdk';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IdentityService {
  private issuerDID: string;

  constructor(
    @Inject('DataStorage') private dataStorage: IDataStorage,
    @Inject('CredentialWallet') private credentialWallet: ICredentialWallet,
    @Inject('IdentityWallet') private identityWallet: IIdentityWallet,
    private readonly configService: ConfigService<AllConfigType>,
  ) {
    this.initializeIssuerDID().then((did) => {
      this.issuerDID = did;
    });
  }

  async initializeIssuerDID(): Promise<string> {
    // Initialize the issuer DID
    console.log('=============== Initializing Issuer DID ===============');

    const { did: issuerDID } = await this.identityWallet.createIdentity({
      method: core.DidMethod.Iden3,
      blockchain: core.Blockchain.Polygon,
      networkId: core.NetworkId.Amoy,
      revocationOpts: {
        type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
        id: this.configService.getOrThrow('identity.rhsUrl', { infer: true }),
      },
    });

    console.log('Issuer DID:', issuerDID.string());

    return issuerDID.string();
  }
}
