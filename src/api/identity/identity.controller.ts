import { ApiPublic } from '@/decorators/http.decorators';
import { W3CCredential } from '@0xpolygonid/js-sdk';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IssueCredentialReqDto } from './dto/issue-credential.req.dto';
import { RequestProofReqDto } from './dto/request-proof.req.dto';
import { IssuerService } from './issuer.service';
import { VerifierService } from './verifier.service';

@ApiTags('identity')
@Controller({
  path: 'identity',
  version: '1',
})
export class IdentityController {
  constructor(
    private readonly issuerService: IssuerService,
    private readonly verifierService: VerifierService,
  ) {}

  /**
   * Retrieves a fetch request for a given identity ID
   * @param id - The unique identifier for the fetch request
   * @returns The fetch request details
   */
  @Get(':id')
  @ApiPublic({
    summary: 'Get the fetch request',
  })
  getFetchRequest(@Param('id') id: string) {
    return this.issuerService.getFetchRequest(id);
  }

  /**
   * Retrieves a W3C credential for a given credential ID
   * @param id - The unique identifier for the credential
   * @returns The full W3C credential
   */
  @Post('credentials/:id')
  @ApiPublic({
    summary: 'Serve the full W3C credential',
  })
  async getCredential(@Param('id') id: string) {
    return this.issuerService.getCredential(id);
  }

  /**
   * Issues a new W3C verifiable credential
   * @param dto - The credential issuance request data containing subject, type, schema and expiration
   * @returns Object containing the issued credential ID and universal link
   */
  @Post('issuer/issue-credential')
  @ApiPublic({
    type: W3CCredential,
    summary: 'Search listings with filters and pagination',
    isPaginated: true,
  })
  async issueCredential(
    @Body() dto: IssueCredentialReqDto,
  ): Promise<{ credential_id: string; universal_link: string }> {
    const { credentialSubject, type, credentialSchema, expiration } = dto;

    return await this.issuerService.issueCredential(
      JSON.parse(credentialSubject),
      type,
      credentialSchema,
      expiration,
    );
  }

  /**
   * Creates a zero-knowledge proof request
   * @param query - The proof request parameters
   * @returns Object containing the universal link for the proof request to be sent to the wallet
   */
  @Post('verifier/request-proof')
  @ApiPublic({
    summary: 'Request zero-knowledge proof',
  })
  async requestProof(
    @Body() query: RequestProofReqDto,
  ): Promise<{ universal_link: string }> {
    return this.verifierService.requestProof({
      ...query,
      credentialSubject: JSON.parse(query.credentialSubject),
    });
  }
}
