import { UserEntity } from '@/api/user/entities/user.entity';
import { setSeederFactory } from 'typeorm-extension';

export default setSeederFactory(UserEntity, (fake) => {
  const user = new UserEntity();

  const firstName = fake.person.firstName();
  const lastName = fake.person.lastName();
  user.name = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
  user.email = fake.internet.email({ firstName, lastName });
  user.wallet_address = fake.finance.ethereumAddress();

  return user;
});
