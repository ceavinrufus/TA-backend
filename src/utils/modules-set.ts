import { ApiModule } from '@/api/api.module';
import authConfig from '@/api/auth/config/auth.config';
import { BackgroundModule } from '@/background/background.module';
import appConfig from '@/config/app.config';
import { AllConfigType } from '@/config/config.type';
import databaseConfig from '@/database/config/database.config';
import { TypeOrmConfigService } from '@/database/typeorm-config.service';
import { MailModule } from '@/mail/mail.module';
import redisConfig from '@/redis/config/redis.config';
import polygonIdConfig from '@/shared/polygon-id/config/polygon-id-config';
import { SharedModule } from '@/shared/shared.module';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { ModuleMetadata } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { redisStore } from 'cache-manager-ioredis-yet';
import { LoggerModule } from 'nestjs-pino';
import { DataSource, DataSourceOptions } from 'typeorm';
import loggerFactory from './logger-factory';

function generateModulesSet() {
  const imports: ModuleMetadata['imports'] = [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        authConfig,
        redisConfig,
        polygonIdConfig,
      ],
      envFilePath: ['.env'],
    }),
  ];
  let customModules: ModuleMetadata['imports'] = [];

  const dbModule = TypeOrmModule.forRootAsync({
    useClass: TypeOrmConfigService,
    dataSourceFactory: async (options: DataSourceOptions) => {
      if (!options) {
        throw new Error('Invalid options passed');
      }

      return new DataSource(options).initialize();
    },
  });

  const bullModule = BullModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: (configService: ConfigService<AllConfigType>) => {
      return {
        connection: {
          host: configService.getOrThrow('redis.host', {
            infer: true,
          }),
          port: configService.getOrThrow('redis.port', {
            infer: true,
          }),
          password: configService.getOrThrow('redis.password', {
            infer: true,
          }),
          tls: configService.get('redis.tlsEnabled', { infer: true }),
        },
      };
    },
    inject: [ConfigService],
  });

  const loggerModule = LoggerModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: loggerFactory,
  });

  const cacheModule = CacheModule.registerAsync({
    imports: [ConfigModule],
    useFactory: async (configService: ConfigService<AllConfigType>) => {
      return {
        store: await redisStore({
          host: configService.getOrThrow('redis.host', {
            infer: true,
          }),
          port: configService.getOrThrow('redis.port', {
            infer: true,
          }),
          password: configService.getOrThrow('redis.password', {
            infer: true,
          }),
          tls: configService.get('redis.tlsEnabled', { infer: true }),
        }),
      };
    },
    isGlobal: true,
    inject: [ConfigService],
  });

  const modulesSet = process.env.MODULES_SET || 'monolith';

  switch (modulesSet) {
    case 'monolith':
      customModules = [
        ApiModule,
        SharedModule,
        bullModule,
        BackgroundModule,
        cacheModule,
        dbModule,
        loggerModule,
        MailModule,
      ];
      break;
    case 'api':
      customModules = [
        ApiModule,
        SharedModule,
        bullModule,
        cacheModule,
        dbModule,
        loggerModule,
        MailModule,
      ];
      break;
    case 'background':
      customModules = [
        SharedModule,
        bullModule,
        BackgroundModule,
        cacheModule,
        dbModule,
        loggerModule,
      ];
      break;
    default:
      console.error(`Unsupported modules set: ${modulesSet}`);
      break;
  }

  return imports.concat(customModules);
}

export default generateModulesSet;
