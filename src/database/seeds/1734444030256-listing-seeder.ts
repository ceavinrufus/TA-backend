import { ListingEntity } from '@/api/listing/entities/listing.entity';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

export class ListingSeeder1734444030256 implements Seeder {
  track = false;

  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<any> {
    const listingFactory = factoryManager.get(ListingEntity);
    await listingFactory.saveMany(5);
  }
}
