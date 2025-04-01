import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';
import listingFactory from './factories/listing.factory';
import { ListingSeeder1734444030256 } from './seeds/1734444030256-listing-seeder';

const {
  DATABASE_TYPE,
  DATABASE_URL,
  DATABASE_SSL_ENABLED,
  DATABASE_REJECT_UNAUTHORIZED,
  DATABASE_HOST,
  DATABASE_PORT,
  DATABASE_USERNAME,
  DATABASE_PASSWORD,
  DATABASE_SYNCHRONIZE,
  DATABASE_NAME,
  NODE_ENV,
  DATABASE_CA,
  DATABASE_KEY,
  DATABASE_CERT,
  DATABASE_MAX_CONNECTIONS,
} = process.env;

export const AppDataSource = new DataSource({
  type: DATABASE_TYPE,
  url: DATABASE_URL,
  host: DATABASE_HOST,
  port: DATABASE_PORT
    ? parseInt(DATABASE_PORT, 10)
    : 5432,
  username: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,
  database: DATABASE_NAME,
  synchronize: DATABASE_SYNCHRONIZE === 'true',
  dropSchema: false,
  keepConnectionAlive: true,
  logging: NODE_ENV !== 'production',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  poolSize: DATABASE_MAX_CONNECTIONS
    ? parseInt(DATABASE_MAX_CONNECTIONS, 10)
    : 100,
  ssl:
    DATABASE_SSL_ENABLED === 'true'
      ? {
        rejectUnauthorized:
          DATABASE_REJECT_UNAUTHORIZED === 'true',
        ca: Buffer.from(DATABASE_CA, 'base64').toString('utf-8') ?? undefined,
        key: Buffer.from(DATABASE_KEY, 'base64').toString('utf-8') ?? undefined,
        cert: Buffer.from(DATABASE_CERT, 'base64').toString('utf-8') ?? undefined,
      }
      : undefined,
  seeds: [ListingSeeder1734444030256],
  seedTracking: true,
  factories: [listingFactory],
} as DataSourceOptions & SeederOptions);
