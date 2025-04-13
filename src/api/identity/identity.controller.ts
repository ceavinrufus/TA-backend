import { ApiPublic } from '@/decorators/http.decorators';
import { W3CCredential } from '@0xpolygonid/js-sdk';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IssueCredentialReqDto } from './dto/issue-credential.req.dto';
import { IssuerService } from './issuer.service';

@ApiTags('identity')
@Controller({
  path: 'identity',
  version: '1',
})
export class IdentityController {
  constructor(private readonly issuerService: IssuerService) {}

  @Post('issuer/issue-credential')
  @ApiPublic({
    type: W3CCredential,
    summary: 'Search listings with filters and pagination',
    isPaginated: true,
  })
  //   @ApiAuth({
  //     summary: 'Create a new dispute',
  //     statusCode: HttpStatus.CREATED,
  //   })
  async issueCredential(
    @Body() dto: IssueCredentialReqDto,
  ): Promise<W3CCredential> {
    const { credentialSubject, credentialSchema, expiration } = dto;

    return await this.issuerService.issueCredential(
      JSON.parse(credentialSubject),
      credentialSchema,
      expiration,
    );
  }
}
