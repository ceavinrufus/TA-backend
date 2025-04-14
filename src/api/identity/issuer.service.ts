import { AllConfigType } from '@/config/config.type';
import { PolygonIdService } from '@/shared/polygon-id/polygon-id.service';
import { CredentialStatusType } from '@0xpolygonid/js-sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

    const credential = await this.polygonIdService
      .getIdentityWallet()
      .issueCredential(this.polygonIdService.getIssuerDID(), credentialRequest);

    // Save the credential
    await this.polygonIdService.getCredentialWallet().save(credential);

    const credentialId = credential.id.replace('urn:', '');
    const baseUrl = this.configService.getOrThrow('app.url', { infer: true });

    const universalLink = `https://wallet.privado.id#request_uri=${encodeURIComponent(baseUrl + '/api/v1/identity/' + credentialId)}`;

    return {
      credential_id: credentialId,
      universal_link: universalLink,
    };
  }
}
