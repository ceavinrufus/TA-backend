import { CircuitId } from '@0xpolygonid/js-sdk';
import { auth } from '@iden3/js-iden3-auth';
import { VerifierService } from './verifier.service';

jest.mock('@iden3/js-iden3-auth');
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

describe('VerifierService', () => {
  let service: VerifierService;
  let configService: Record<string, any>;
  let cacheManager: Record<string, any>;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn((key) => {
        const map = {
          'app.nodeEnv': 'development',
          'app.url': 'http://localhost:3000',
          'app.apiPrefix': '/api',
          'polygonId.rpcUrl': 'https://mock-rpc',
          'polygonId.ipfsUrl': 'https://mock-ipfs',
        };
        return map[key];
      }),
      get: jest.fn(() => '/mock/circuits'),
    };

    cacheManager = {
      set: jest.fn().mockResolvedValue(null),
      get: jest.fn().mockResolvedValue({
        id: 'mock-id',
        thid: 'mock-id',
        body: { scope: [] },
      }),
    };

    service = new VerifierService(configService as any, cacheManager as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestProof', () => {
    it('should create and cache a proof request', async () => {
      const createAuthorizationRequest = jest.fn().mockReturnValue({
        id: '',
        thid: '',
        body: { scope: [] },
      });
      (auth.createAuthorizationRequest as jest.Mock).mockImplementation(
        createAuthorizationRequest,
      );

      const result = await service.requestProof('abc123', 'Test Reason', {
        allowedIssuers: ['*'],
        credentialSubject: { email: { $eq: 'test@example.com' } },
        context: 'https://schema.org',
        type: 'TestType',
      });

      expect(createAuthorizationRequest).toHaveBeenCalled();
      expect(result.data.request.id).toBe('mock-uuid');
      expect(result.data.request.body.scope[0]).toMatchObject({
        circuitId: CircuitId.AtomicQuerySigV2,
        query: expect.any(Object),
      });

      expect(cacheManager.set).toHaveBeenCalledWith(
        'authRequest:abc123',
        expect.any(Object),
        3600 * 1000,
      );
    });
  });

  describe('verificationCallback', () => {
    it('should call fullVerify and cache response', async () => {
      const fullVerify = jest.fn().mockResolvedValue({
        from: 'mock-proof',
      });
      const newVerifier = jest.fn().mockResolvedValue({ fullVerify });

      (auth.Verifier as any).newVerifier = newVerifier;

      const result = await service.verificationCallback(
        'abc123',
        'mock-token-str',
      );

      expect(newVerifier).toHaveBeenCalled();
      expect(fullVerify).toHaveBeenCalledWith(
        'mock-token-str',
        expect.any(Object),
        expect.any(Object),
      );
      expect(result.from).toBe('mock-proof');
      expect(cacheManager.set).toHaveBeenCalledWith(
        'authResponse:abc123',
        result,
        300000,
      );
    });

    it('should throw error if verification fails', async () => {
      const newVerifier = jest.fn().mockResolvedValue({
        fullVerify: jest.fn().mockRejectedValue(new Error('Bad proof')),
      });

      (auth.Verifier as any).newVerifier = newVerifier;

      await expect(
        service.verificationCallback('abc123', 'bad-token'),
      ).rejects.toThrow('Verification failed');
    });
  });

  describe('getVerificationResult', () => {
    it('should return cached result', async () => {
      cacheManager.get = jest.fn().mockResolvedValue({
        from: 'cached-verification',
      });

      const result = await service.getVerificationResult('abc123');
      expect(result).toEqual({ from: 'cached-verification' });
    });

    it('should return null if no cache', async () => {
      cacheManager.get = jest.fn().mockResolvedValue(null);

      const result = await service.getVerificationResult('abc123');
      expect(result).toBeNull();
    });
  });
});
