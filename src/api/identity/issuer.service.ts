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

  // Function to issue a credential with background blockchain processing
  async issueCredential(
    credentialSubject: Record<string, any>,
    type: string,
    credentialSchema: string,
    expiration: number,
  ): Promise<{ data: { credential_id: string } }> {
    const issuerDID = this.polygonIdService.getIssuerDID();

    // Create the credential request
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

    // Issue the credential
    const credential = await this.polygonIdService
      .getIdentityWallet()
      .issueCredential(issuerDID, credentialRequest);

    // Save the credential
    await this.polygonIdService.getCredentialWallet().save(credential);

    // Extract the credential ID early to return it
    const credentialId = credential.id.replace('urn:', '');

    // Start blockchain interaction in the background
    this.processCredentialOnBlockchain(credential, issuerDID).catch((error) => {
      console.error('Background processing error:', error);
    });

    // Return early with the credential ID
    return {
      data: {
        credential_id: credentialId,
      },
    };
  }

  // Background process to handle blockchain interaction
  private async processCredentialOnBlockchain(
    credential: W3CCredential,
    issuerDID: any,
  ): Promise<void> {
    try {
      const credentialsList = await this.polygonIdService
        .getCredentialWallet()
        .list();

      const isOldStateGenesis = credentialsList.length === 1;

      // Add the credential to the Merkle Tree
      const merkleTreeResult = await this.polygonIdService
        .getIdentityWallet()
        .addCredentialsToMerkleTree([credential], issuerDID);

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

      // Publish the state to the blockchain
      const ethSigner = new ethers.Wallet(
        this.configService.getOrThrow('polygonId.walletKey', { infer: true }),
        this.polygonIdService.getDataStorage().states.getRpcProvider(),
      );

      const txId = await this.polygonIdService
        .getProofService()
        .transitState(
          issuerDID,
          merkleTreeResult.oldTreeState,
          isOldStateGenesis,
          this.polygonIdService.getDataStorage().states,
          ethSigner,
        );

      // Generate the Iden3SparseMerkleTreeProof
      const credentialsWithProof = await this.polygonIdService
        .getIdentityWallet()
        .generateIden3SparseMerkleTreeProof(issuerDID, [credential], txId);

      // Save the credentials with proof
      await this.polygonIdService
        .getCredentialWallet()
        .saveAll(credentialsWithProof);

      console.log('Background blockchain processing completed successfully');
    } catch (error) {
      console.error('Error in background blockchain processing:', error);
    }
  }

  // Function to get the fetch request
  getFetchRequest(id: string, to: string) {
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

    const credentialOffer = {
      id: requestId,
      thid: requestId,
      typ: 'application/iden3comm-plain-json',
      type: 'https://iden3-communication.io/credentials/1.0/offer',
      body: {
        url: `${baseUrl}${apiPrefix}/v1/identity/credentials/${id}`, // Where full credential is served
        credentials: [
          {
            id: `${id}`,
            description: 'Your zkBooking Reservation Credential',
          },
        ],
      },
      from: this.polygonIdService.getIssuerDID().string(),
      to,
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
      id,
      typ: 'application/iden3comm-plain-json',
      type: 'https://iden3-communication.io/credentials/1.0/issuance-response',
      threadID: id,
      body: {
        credential: serializedCredential as W3CCredential,
      },
      from: this.polygonIdService.getIssuerDID().string(),
      to: serializedCredential.credentialSubject.id,
    };
  }
}
