import { UserEntity } from '@/api/user/entities/user.entity';
import { setSeederFactory } from 'typeorm-extension';

export default setSeederFactory(UserEntity, (fake) => {
  const user = new UserEntity();

  user.wallet_address = fake.finance.ethereumAddress();

  return user;
});
