import {
  JSONField,
  NumberFieldOptional,
  StringField,
} from '@/decorators/field.decorators';

export class IssueCredentialReqDto {
  @JSONField({
    description: 'The credential subject containing the claims',
  })
  credentialSubject: string;

  @StringField({
    example: 'Reservation',
    description: 'The type of the credential',
  })
  type: string;

  @StringField({
    example:
      'https://raw.githubusercontent.com/ceavinrufus/claim-schema-vocab/refs/heads/main/schemas/json/ReservationCredential.json',
  })
  credentialSchema: string;

  @NumberFieldOptional({ example: 1735689600 })
  expiration?: number;
}
