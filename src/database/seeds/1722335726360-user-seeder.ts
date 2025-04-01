import { UserEntity } from '@/api/user/entities/user.entity';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

export class UserSeeder1722335726360 implements Seeder {
  track = false;

  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<any> {
    const repository = dataSource.getRepository(UserEntity);

    const adminUser = await repository.findOneBy({ name: 'admin' });
    if (!adminUser) {
      await repository.insert(
        new UserEntity({
          name: 'admin',
          email: 'admin@example.com',
          wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        }),
      );
    }

    const userFactory = factoryManager.get(UserEntity);
    await userFactory.saveMany(5);
  }
}
