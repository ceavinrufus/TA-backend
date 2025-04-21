import { AllConfigType } from '@/config/config.type';
import {
  CircuitId,
  ZeroKnowledgeProofQuery,
  ZeroKnowledgeProofRequest,
} from '@0xpolygonid/js-sdk';
import { auth, resolver } from '@iden3/js-iden3-auth';
import {
  AuthorizationRequestMessage,
  AuthorizationResponseMessage,
} from '@iden3/js-iden3-auth/dist/types/types-sdk';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
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
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * Generates a zero-knowledge proof request and returns a universal link.
   * Creates a proof request with a unique identifier and specific circuit parameters.
   * The request is encoded in base64 and formatted as a universal link for the Privado wallet.
   *
   * @param query - The zero-knowledge proof query parameters
   * @returns An object containing the universal link for the proof request
   */
  async requestProof(
    sessionId: number,
    reason: string,
    query: ZeroKnowledgeProofQuery,
  ): Promise<{ data: { request: AuthorizationRequestMessage } }> {
    const requestId = uuidv4();

    const isDevelopment =
      this.configService.getOrThrow('app.nodeEnv', { infer: true }) ===
      'development';
    const baseUrl = isDevelopment
      ? 'http://192.168.0.101:8000/'
      : this.configService.getOrThrow('app.url', { infer: true });
    const apiPrefix = this.configService.getOrThrow('app.apiPrefix', {
      infer: true,
    });

    const callbackURL = '/v1/identity/verifier/callback';
    const uri = `${baseUrl}${apiPrefix}${callbackURL}?sessionId=${sessionId}`;

    // Generate request for basic authentication
    const request = auth.createAuthorizationRequest(
      reason,
      'did:polygonid:polygon:amoy:2qQ68JkRcf3xrHPQPWZei3YeVzHPP58wYNxx2mEouR',
      uri,
    );

    request.id = requestId;
    request.thid = requestId;

    const proofRequest: ZeroKnowledgeProofRequest = {
      id: Math.floor(Math.random() * 10000),
      circuitId: CircuitId.AtomicQuerySigV2,
      query,
    };

    const scope = request.body.scope ?? [];
    request.body.scope = [...scope, proofRequest];

    await this.cacheManager.set(
      `authRequest:${sessionId}`,
      request,
      3600 * 1000,
    );

    return { data: { request } };
  }

  async verificationCallback(
    sessionId: string,
    tokenStr: string,
  ): Promise<AuthorizationResponseMessage> {
    const resolvers = {
      ['polygon:amoy']: new resolver.EthStateResolver(
        this.configService.getOrThrow('polygonId.rpcUrl', {
          infer: true,
        }),
        '0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124',
      ),
      ['privado:main']: new resolver.EthStateResolver(
        'https://rpc-mainnet.privado.id',
        '0x3C9acB2205Aa72A05F6D77d708b5Cf85FCa3a896',
      ),
    };

    const authRequest = (await this.cacheManager.get(
      `authRequest:${sessionId}`,
    )) as AuthorizationRequestMessage;

    const circuitDirectoryPath = this.configService.get(
      'polygonId.circuitsPath',
      {
        infer: true,
      },
    );

    // EXECUTE VERIFICATION
    const verifier = await auth.Verifier.newVerifier({
      stateResolver: resolvers,
      circuitsDir: circuitDirectoryPath,
      ipfsGatewayURL: this.configService.getOrThrow('polygonId.ipfsUrl', {
        infer: true,
      }),
    });

    try {
      const opts = {
        acceptedStateTransitionDelay: 5 * 60 * 1000, // 5 minute
      };
      const authResponse = await verifier.fullVerify(
        tokenStr,
        authRequest,
        opts,
      );

      // Save to Redis or in-memory cache
      await this.cacheManager.set(
        `authResponse:${sessionId}`,
        authResponse,
        300 * 1000,
      ); // TTL: 5 mins

      return authResponse;
    } catch (e) {
      console.error('Error verifying proof:', e);
      throw new Error('Verification failed');
    }
  }

  async getVerificationResult(
    sessionId: string,
  ): Promise<AuthorizationResponseMessage | null> {
    const authResponse = await this.cacheManager.get(
      `authResponse:${sessionId}`,
    );

    return authResponse as AuthorizationResponseMessage;
  }
}
