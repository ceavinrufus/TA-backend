import {
  EnumFieldOptional,
  JSONFieldOptional,
  NumberFieldOptional,
  StringField,
} from '@/decorators/field.decorators';
import { ProofType } from '@0xpolygonid/js-sdk';

export class RequestProofReqDto {
  @StringField({
    each: true,
    description: 'Array of allowed issuer DIDs',
    example: ['*'],
  })
  allowedIssuers: string[];

  @StringField({
    description: 'Context of the zero knowledge proof',
    example:
      'https://raw.githubusercontent.com/ceavinrufus/claim-schema-vocab/refs/heads/main/schemas/json-ld/ReservationCredential.jsonld',
  })
  context: string;

  @JSONFieldOptional({ description: 'Credential subject claims' })
  credentialSubject?: string;

  @EnumFieldOptional(() => ProofType, {
    description: 'Type of proof to be generated',
  })
  proofType?: ProofType;

  @JSONFieldOptional({ description: 'Skip claim revocation check' })
  skipClaimRevocationCheck?: boolean;

  @NumberFieldOptional({ description: 'Group identifier' })
  groupId?: number;

  @StringField({ description: 'Type of the credential' })
  type: string;
}
