import { ApiPublic } from '@/decorators/http.decorators';
import { W3CCredential } from '@0xpolygonid/js-sdk';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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

  @Get(':id')
  @ApiPublic({
    summary: 'Get the fetch request',
  })
  getFetchRequest(@Param('id') id: string) {
    return this.issuerService.getFetchRequest(id);
  }

  @Post('credentials/:id')
  @ApiPublic({
    summary: 'Serve the full W3C credential',
  })
  async getCredential(@Param('id') id: string) {
    return this.issuerService.getCredential(id);
  }
}
