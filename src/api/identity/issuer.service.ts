import { AllConfigType } from '@/config/config.type';
import { PolygonIdService } from '@/shared/polygon-id/polygon-id.service';
import { CredentialStatusType, W3CCredential } from '@0xpolygonid/js-sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IssuerService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly polygonIdService: PolygonIdService,
  ) {}

  async issueCredential(
    credentialSubject: Record<string, any>,
    credentialSchema: string,
    expiration: number,
  ): Promise<W3CCredential> {
    console.log('=============== Issuing Credential ===============');

    const credentialRequest = {
      credentialSchema,
      type: 'Reservation',
      credentialSubject: credentialSubject,
      expiration,
      revocationOpts: {
        type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
        id: this.configService.getOrThrow('polygonId.rhsUrl', { infer: true }),
      },
    };

    console.log('Credential request:', credentialRequest);

    const credential = await this.polygonIdService
      .getIdentityWallet()
      .issueCredential(this.polygonIdService.getIssuerDID(), credentialRequest);

    console.log('Credential issued:', credential);

    // Save the credential
    await this.polygonIdService.getCredentialWallet().save(credential);
    console.log('Credential saved successfully.');

    // Convert BigInt values to strings before returning
    const serializedCredential = JSON.parse(
      JSON.stringify(credential, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    ) as W3CCredential;

    return serializedCredential;
  }
}
