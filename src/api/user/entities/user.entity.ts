import { ListingEntity } from '@/api/listing/entities/listing.entity';
import { ReservationEntity } from '@/api/reservation/entities/reservation.entity';
import { Uuid } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

@Entity('users')
export class UserEntity extends AbstractEntity {
  constructor(data?: Partial<UserEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_user_id' })
  id!: Uuid;

  @Column({
    length: 50,
    nullable: true,
  })
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: '' })
  @Index('UQ_user_wallet_address', {
    where: '"deleted_at" IS NULL',
    unique: true,
  })
  wallet_address: string;

  @Column({ default: false })
  is_liveness_verified: boolean;

  @Column({ default: false })
  is_uniqueness_verified: boolean;

  @Column({ default: false })
  is_identity_verified: boolean;

  @Column({ default: false })
  is_host: boolean;

  @Column({ default: false })
  is_admin: boolean;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    default: null,
  })
  deleted_at: Date;

  @OneToMany(() => ListingEntity, (listing) => listing.host)
  listings: Relation<ListingEntity[]>;

  @OneToMany(() => ReservationEntity, (reservation) => reservation.host)
  reservations_got: Relation<ReservationEntity[]>;

  @OneToMany(() => ReservationEntity, (reservation) => reservation.guest)
  reservations_made: Relation<ReservationEntity[]>;
}
