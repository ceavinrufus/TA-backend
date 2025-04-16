import { AllConfigType } from '@/config/config.type';
import { PolygonIdService } from '@/shared/polygon-id/polygon-id.service';
import { CredentialStatusType, W3CCredential } from '@0xpolygonid/js-sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class IssuerService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly polygonIdService: PolygonIdService,
  ) {}

  // Function to issue a credential
  async issueCredential(
    credentialSubject: Record<string, any>,
    type: string,
    credentialSchema: string,
    expiration: number,
  ): Promise<{ credential_id: string; universal_link: string }> {
    console.log('=============== Issuing Credential ===============');

    const credentialRequest = {
      credentialSchema,
      type,
      credentialSubject,
      expiration,
      revocationOpts: {
        type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
        id: this.configService.getOrThrow('polygonId.rhsUrl', { infer: true }),
      },
    };

    const issuerDID = this.polygonIdService.getIssuerDID();

    const credential = await this.polygonIdService
      .getIdentityWallet()
      .issueCredential(issuerDID, credentialRequest);

    // Save the credential
    await this.polygonIdService.getCredentialWallet().save(credential);

    // await this.polygonIdService
    //   .getDataStorage()
    //   .credential.saveCredential(credential);

    console.log(
      '================= generate Iden3SparseMerkleTreeProof =======================',
    );

    // Add the credential to the Merkle Tree
    const merkleTreeResult = await this.polygonIdService
      .getIdentityWallet()
      .addCredentialsToMerkleTree([credential], issuerDID);

    console.log('================= push states to rhs ===================');

    // Publish the state to the RHS
    await this.polygonIdService
      .getIdentityWallet()
      .publishRevocationInfoByCredentialStatusType(
        issuerDID,
        CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
        {
          rhsUrl: this.configService.getOrThrow('polygonId.rhsUrl', {
            infer: true,
          }),
        },
      );

    // console.log('================= publish to blockchain ===================');

    // Publish the state to the blockchain
    const ethSigner = new ethers.Wallet(
      this.configService.getOrThrow('polygonId.walletKey', { infer: true }),
      this.polygonIdService.getDataStorage().states.getRpcProvider(),
    );

    await this.polygonIdService
      .getProofService()
      .transitState(
        issuerDID,
        merkleTreeResult.oldTreeState,
        true,
        this.polygonIdService.getDataStorage().states,
        ethSigner,
      );

    const credentialId = credential.id.replace('urn:', '');

    const isDevelopment =
      this.configService.getOrThrow('app.nodeEnv', { infer: true }) ===
      'development';
    const baseUrl = isDevelopment
      ? 'http://192.168.0.101:8000'
      : this.configService.getOrThrow('app.url', { infer: true });

    const universalLink = `https://wallet.privado.id#request_uri=${encodeURIComponent(baseUrl + '/api/v1/identity/' + credentialId)}`;

    return {
      credential_id: credentialId,
      universal_link: universalLink,
    };
  }

  // Function to get the fetch request
  // This is used to create a credential offer that will be sent to the user
  // The user will then use this offer to fetch the credential from the issuer
  getFetchRequest(id: string) {
    const requestId = uuidv4();

    const isDevelopment =
      this.configService.getOrThrow('app.nodeEnv', { infer: true }) ===
      'development';
    const baseUrl = isDevelopment
      ? 'http://192.168.0.101:8000'
      : this.configService.getOrThrow('app.url', { infer: true });

    const credentialOffer = {
      id: requestId,
      thid: requestId,
      typ: 'application/iden3comm-plain-json',
      type: 'https://iden3-communication.io/credentials/1.0/offer',
      body: {
        url: `${baseUrl}/api/v1/identity/credentials/${id}`, // Where full credential is served
        credentials: [
          {
            id: `${id}`,
            description: 'Your zkBooking Reservation Credential',
          },
        ],
      },
      from: this.polygonIdService.getIssuerDID().string(),
      to: 'did:iden3:privado:main:2SZJJKGC1CytxUV3127C6AESAphGjvUf5HVv972d6K',
    };

    return credentialOffer;
  }

  // Function to retrieve and format credential by ID for wallet transmission
  async getCredential(id: string) {
    const credentialWallet = this.polygonIdService.getCredentialWallet();
    const credential = await credentialWallet.findById(`urn:${id}`);

    const serializedCredential = JSON.parse(
      JSON.stringify(credential, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    ) as W3CCredential;

    return {
      id: id,
      typ: 'application/iden3comm-plain-json',
      type: 'https://iden3-communication.io/credentials/1.0/issuance-response',
      threadID: id,
      body: {
        credential: serializedCredential as W3CCredential,
      },
      from: this.polygonIdService.getIssuerDID().string(),
      to: 'did:iden3:privado:main:2SZJJKGC1CytxUV3127C6AESAphGjvUf5HVv972d6K',
    };
  }
}
