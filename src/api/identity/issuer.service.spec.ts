import { PolygonIdService } from '@/shared/polygon-id/polygon-id.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { IssuerService } from './issuer.service';

jest.mock('ethers', () => ({
  ethers: {
    Wallet: jest.fn().mockImplementation(() => ({
      // Mock the signer's provider
      provider: {},
    })),
  },
}));

describe('IssuerService', () => {
  let service: IssuerService;
  let polygonIdService: Record<string, any>;
  let configService: Record<string, any>;

  beforeEach(async () => {
    polygonIdService = {
      getIssuerDID: jest
        .fn()
        .mockReturnValue({ string: () => 'did:polygon:issuer' }),
      getIdentityWallet: jest.fn().mockReturnValue({
        issueCredential: jest
          .fn()
          .mockResolvedValue({ id: 'urn:test-cred-id' }),
        addCredentialsToMerkleTree: jest
          .fn()
          .mockResolvedValue({ oldTreeState: 'oldState' }),
        publishRevocationInfoByCredentialStatusType: jest
          .fn()
          .mockResolvedValue(null),
        generateIden3SparseMerkleTreeProof: jest
          .fn()
          .mockResolvedValue([{ id: 'urn:test-cred-id-with-proof' }]),
      }),
      getCredentialWallet: jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValue(null),
        saveAll: jest.fn().mockResolvedValue(null),
        findById: jest.fn().mockResolvedValue({
          credentialSubject: { id: 'did:example:user' },
          id: 'urn:test-cred-id',
        }),
      }),
      getDataStorage: jest.fn().mockReturnValue({
        states: {
          getRpcProvider: jest.fn().mockReturnValue({}),
          getLatestStateById: jest.fn().mockResolvedValue(null),
        },
      }),
      getProofService: jest.fn().mockReturnValue({
        transitState: jest.fn().mockResolvedValue('tx-id'),
      }),
    };

    configService = {
      getOrThrow: jest.fn((key) => {
        const configMap = {
          'polygonId.rhsUrl': 'http://mock-rhs',
          'polygonId.walletKey': 'mock-key',
          'app.nodeEnv': 'development',
          'app.url': 'http://localhost',
          'app.apiPrefix': 'api',
        };
        return configMap[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuerService,
        { provide: PolygonIdService, useValue: polygonIdService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<IssuerService>(IssuerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('issueCredential', () => {
    it('should issue a credential and return its ID', async () => {
      const result = await service.issueCredential(
        { name: 'Alice' },
        'TestCredential',
        'https://schema.com',
        123456,
      );

      expect(result.data.credential_id).toBe('test-cred-id');
      expect(polygonIdService.getCredentialWallet().save).toHaveBeenCalled();
    });

    it('should handle error in background process gracefully', async () => {
      polygonIdService
        .getIdentityWallet()
        .addCredentialsToMerkleTree.mockRejectedValueOnce(
          new Error('Merkle Tree error'),
        );

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      await service.issueCredential({ id: 'test' }, 'Type', 'schema', 123);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in background blockchain processing:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getFetchRequest', () => {
    it('should return a valid credential offer in development', () => {
      const result = service.getFetchRequest('test-id', 'did:user:123');
      expect(result.body.url).toContain('http://192.168.0.101:8000/');
    });

    it('should return a valid credential offer in production', () => {
      configService.getOrThrow = jest.fn((key) => {
        if (key === 'app.nodeEnv') return 'production';
        if (key === 'app.url') return 'https://prod.site/';
        if (key === 'app.apiPrefix') return 'api';
        return 'http://mock';
      });

      const prodService = new IssuerService(
        configService as any,
        polygonIdService as any,
      );
      const result = prodService.getFetchRequest('abc123', 'did:user:xyz');
      expect(result.body.url).toBe(
        'https://prod.site/api/v1/identity/credentials/abc123',
      );
    });
  });

  describe('getCredential', () => {
    it('should return a formatted credential object', async () => {
      const result = await service.getCredential('test-cred-id');

      expect(result.id).toBe('test-cred-id');
      expect(result.body.credential.id).toBe('urn:test-cred-id');
    });
  });
});
