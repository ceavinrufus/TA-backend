import {
  JSONField,
  NumberFieldOptional,
  StringField,
} from '@/decorators/field.decorators';
import { ApiProperty } from '@nestjs/swagger';

export class IssueCredentialReqDto {
  @JSONField()
  @ApiProperty({
    description: 'The credential subject containing the claims',
  })
  credentialSubject: string;

  @StringField({
    example:
      'https://raw.githubusercontent.com/ceavinrufus/claim-schema-vocab/refs/heads/main/schemas/json/ReservationCredential.json',
  })
  credentialSchema: string;

  @NumberFieldOptional({ example: 1735689600 })
  expiration?: number;
}
