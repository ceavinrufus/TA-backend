import { AllConfigType } from '@/config/config.type';
import { PolygonIdService } from '@/shared/polygon-id/polygon-id.service';
import {
  CircuitId,
  ProofService,
  ZeroKnowledgeProofQuery,
  ZeroKnowledgeProofRequest,
} from '@0xpolygonid/js-sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service responsible for handling zero-knowledge proof verification operations.
 */
/**
 * Constructs a new instance of the VerifierService.
 * @param configService - Service for accessing application configuration
 * @param polygonIdService - Service for Polygon ID operations
 */
@Injectable()
export class VerifierService {
  private proofService: ProofService;

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly polygonIdService: PolygonIdService,
  ) {
    // this.proofService = new ProofService(
    //   this.polygonIdService.getIdentityWallet(),
    //   this.polygonIdService.getCredentialWallet(),
    //   this.polygonIdService.getCircuitStorage(),
    //   this.polygonIdService.getDataStorage().states,
    // );
  }

  /**
   * Generates a zero-knowledge proof request and returns a universal link.
   * Creates a proof request with a unique identifier and specific circuit parameters.
   * The request is encoded in base64 and formatted as a universal link for the Privado wallet.
   *
   * @param query - The zero-knowledge proof query parameters
   * @returns An object containing the universal link for the proof request
   */
  requestProof(query: ZeroKnowledgeProofQuery) {
    const requestId = uuidv4();

    const proofRequest: ZeroKnowledgeProofRequest = {
      id: 1,
      circuitId: CircuitId.AtomicQuerySigV2,
      query,
    };

    const request = {
      from: this.polygonIdService.getIssuerDID().id,
      id: requestId,
      thid: requestId,
      typ: 'application/iden3comm-plain-json',
      type: 'https://iden3-communication.io/authorization/1.0/request',
      body: {
        reason: 'demo flow',
        scope: [proofRequest],
      },
    };

    // Base64 encode the verification request
    const base64EncodedRequest = btoa(JSON.stringify(request));

    // Configure the Wallet URL (universal link)
    const universalLink = `https://wallet.privado.id/#i_m=${base64EncodedRequest}`;

    return { universal_link: universalLink };
  }

  //   async verifyProof(proof: any): Promise<boolean> {
  //     try {
  //       const isValid = await this.proofService.verifyProof(
  //         proof,
  //         CircuitId.AtomicQuerySigV2,
  //       );
  //       console.log('Proof valid:', isValid);
  //       return isValid;
  //     } catch (error) {
  //       console.error('Error verifying proof:', error);
  //       return false;
  //     }
  //   }
}
