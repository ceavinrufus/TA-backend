import { AllConfigType } from '@/config/config.type';
import {
  AgentResolver,
  BjjProvider,
  CredentialStatusResolverRegistry,
  CredentialStatusType,
  CredentialStorage,
  CredentialWallet,
  defaultEthConnectionConfig,
  EthConnectionConfig,
  EthStateStorage,
  ICredentialWallet,
  IDataStorage,
  Identity,
  IdentityStorage,
  IdentityWallet,
  IIdentityWallet,
  InMemoryDataSource,
  InMemoryMerkleTreeStorage,
  InMemoryPrivateKeyStore,
  IssuerResolver,
  KMS,
  KmsKeyType,
  OnChainResolver,
  Profile,
  RHSResolver,
  W3CCredential,
} from '@0xpolygonid/js-sdk';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PolygonIdService } from './polygon-id.service';

@Module({
  providers: [
    {
      provide: 'DataStorage',
      useFactory: (config: ConfigService<AllConfigType>): IDataStorage => {
        const conf: EthConnectionConfig = defaultEthConnectionConfig;
        conf.contractAddress = config.get('polygonId.stateContractAddress', {
          infer: true,
        });
        conf.url = config.get('polygonId.rpcUrl', {
          infer: true,
        });

        return {
          credential: new CredentialStorage(
            new InMemoryDataSource<W3CCredential>(),
          ),
          identity: new IdentityStorage(
            new InMemoryDataSource<Identity>(),
            new InMemoryDataSource<Profile>(),
          ),
          mt: new InMemoryMerkleTreeStorage(40),
          states: new EthStateStorage(conf),
        };
      },
      inject: [ConfigService],
    },
    {
      provide: 'CredentialWallet',
      useFactory: async (
        dataStorage: IDataStorage,
      ): Promise<CredentialWallet> => {
        const resolvers = new CredentialStatusResolverRegistry();
        resolvers.register(
          CredentialStatusType.SparseMerkleTreeProof,
          new IssuerResolver(),
        );
        resolvers.register(
          CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
          new RHSResolver(dataStorage.states),
        );
        resolvers.register(
          CredentialStatusType.Iden3OnchainSparseMerkleTreeProof2023,
          new OnChainResolver([defaultEthConnectionConfig]),
        );
        resolvers.register(
          CredentialStatusType.Iden3commRevocationStatusV1,
          new AgentResolver(),
        );

        return new CredentialWallet(dataStorage, resolvers);
      },
      inject: ['DataStorage'],
    },
    {
      provide: 'IdentityWallet',
      useFactory: async (
        dataStorage: IDataStorage,
        credentialWallet: ICredentialWallet,
      ): Promise<IIdentityWallet> => {
        const memoryKeyStore = new InMemoryPrivateKeyStore();
        const bjjProvider = new BjjProvider(
          KmsKeyType.BabyJubJub,
          memoryKeyStore,
        );
        const kms = new KMS();
        kms.registerKeyProvider(KmsKeyType.BabyJubJub, bjjProvider);

        return new IdentityWallet(kms, dataStorage, credentialWallet);
      },
      inject: ['DataStorage', 'CredentialWallet'],
    },
    // {
    //   provide: 'CircuitStorage',
    //   useFactory: async (
    //     config: ConfigService<AllConfigType>,
    //   ): Promise<ICircuitStorage> => {
    //     const circuitDirectoryPath = path.join(
    //       __dirname,
    //       config.get('polygonId.circuitsPath', {
    //         infer: true,
    //       }),
    //     );

    //     return new FSCircuitStorage({
    //       dirname: circuitDirectoryPath,
    //     });
    //   },
    //   inject: [ConfigService],
    // },
    // {
    //   provide: ProofService,
    //   useFactory: async (
    //     config: ConfigService<AllConfigType>,
    //     identityWallet: IIdentityWallet,
    //     credentialWallet: ICredentialWallet,
    //     dataStorage: IDataStorage,
    //     circuitStorage: ICircuitStorage,
    //   ): Promise<ProofService> => {
    //     return new ProofService(
    //       identityWallet,
    //       credentialWallet,
    //       circuitStorage,
    //       dataStorage.states,
    //       {
    //         ipfsGatewayURL: config.get('polygonId.ipfsUrl', {
    //           infer: true,
    //         }),
    //       },
    //     );
    //   },
    //   inject: [
    //     ConfigService,
    //     'IdentityWallet',
    //     'CredentialWallet',
    //     'DataStorage',
    //     'CircuitStorage',
    //   ],
    // },
    PolygonIdService,
  ],
  exports: [
    'DataStorage',
    'CredentialWallet',
    'IdentityWallet',
    // 'CircuitStorage',
    // ProofService,
    PolygonIdService,
  ],
})
export class PolygonIdModule {}
