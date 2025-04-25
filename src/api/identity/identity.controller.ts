import { ApiPublic } from '@/decorators/http.decorators';
import { W3CCredential } from '@0xpolygonid/js-sdk';
import {
  AuthorizationRequestMessage,
  AuthorizationResponseMessage,
} from '@iden3/js-iden3-auth/dist/types/types-sdk';
import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import getRawBody from 'raw-body';
import { IssueCredentialReqDto } from './dto/issue-credential.req.dto';
import { RequestProofReqDto } from './dto/request-proof.req.dto';
import { IssuerService } from './issuer.service';
import { VerifierService } from './verifier.service';

@ApiTags('identity')
@Controller({
  path: 'identity',
  version: '1',
})
/**
 * Controller handling identity-related operations including credential issuance and verification
 * @class IdentityController
 *
 * @description
 * This controller provides endpoints for:
 * - Retrieving fetch requests for identities
 * - Getting W3C verifiable credentials
 * - Issuing new W3C verifiable credentials
 * - Creating and handling zero-knowledge proof requests
 * - Processing verification callbacks
 *
 * @constructor
 * @param issuerService - Service handling credential issuance operations
 * @param verifierService - Service handling credential verification operations
 */
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
  getFetchRequest(
    @Param('id') id: string,
    @Query('to') to: string, // The wallet address to send the fetch request to
  ) {
    return this.issuerService.getFetchRequest(id, to);
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
    summary: 'Issue a W3C verifiable credential',
  })
  async issueCredential(
    @Body() dto: IssueCredentialReqDto,
  ): Promise<{ data: { credential_id: string } }> {
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
  @Post('verifier/request-proof/:sessionId')
  @ApiPublic({
    summary: 'Request zero-knowledge proof',
  })
  async requestProof(
    @Body() query: RequestProofReqDto,
    @Param('sessionId') sessionId: string,
    @Query('reason') reason: string,
  ): Promise<{ data: { request: AuthorizationRequestMessage } }> {
    return this.verifierService.requestProof(sessionId, reason, {
      ...query,
      credentialSubject: JSON.parse(query.credentialSubject),
    });
  }

  /**
   * Callback endpoint for proof verification
   * @query sessionId - The unique session identifier
   * @returns The authorization response message
   */
  @Post('verifier/callback')
  @ApiPublic({
    summary: 'Callback for proof verification',
  })
  async verificationCallback(
    @Req() req: Request,
    @Query('sessionId') sessionId: string,
  ): Promise<AuthorizationResponseMessage> {
    // Get JWZ token params from the post request
    const raw = await getRawBody(req);
    const tokenStr = raw.toString().trim();
    return await this.verifierService.verificationCallback(sessionId, tokenStr);
  }

  @Get('verifier/verification-result/:sessionId')
  @ApiPublic({
    summary: 'Get verification result for a session',
  })
  async getVerificationResult(
    @Param('sessionId') sessionId: string,
  ): Promise<AuthorizationResponseMessage | null> {
    return this.verifierService.getVerificationResult(sessionId);
  }
}
