import { DisputeEntity } from '@/api/dispute/entities/dispute.entity';
import { ListingEntity } from '@/api/listing/entities/listing.entity';
import { PaymentEntity } from '@/api/payment/entities/payment.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Uuid } from '@/common/types/common.type';
import { ReservationStatus } from '@/constants/entity.enum';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

@Entity({ name: 'reservations' })
export class ReservationEntity extends AbstractEntity {
  constructor(data?: Partial<ReservationEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_reservation_id',
  })
  id!: Uuid;

  @Column('varchar', { nullable: true })
  booking_number: string;

  @Column('uuid')
  @Index('IDX_reservation_listing_id')
  listing_id: Uuid;

  @JoinColumn({
    name: 'listing_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_reservation_listing_id',
  })
  @ManyToOne(() => ListingEntity, (listing) => listing.reservations, {
    onDelete: 'CASCADE',
  })
  listing: Relation<ListingEntity>;

  @Column('uuid')
  @Index('IDX_reservation_guest_id')
  guest_id: Uuid;

  @Column('uuid')
  @Index('IDX_reservation_host_id')
  host_id: Uuid;

  @Column('varchar', { nullable: true })
  listing_name: string;

  @Column('varchar', { nullable: true })
  listing_address: string;

  // Price for the hotel
  @Column('float', { nullable: true })
  base_price: number;

  // Service fee
  @Column('float', { nullable: true })
  service_fee: number;

  @Column('float', { nullable: true })
  guest_deposit: number;

  @JoinColumn({
    name: 'host_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_reservation_host_id',
  })
  @ManyToOne(() => UserEntity, (user) => user.reservations_got)
  host: Relation<UserEntity>;

  @JoinColumn({
    name: 'guest_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_reservation_guest_id',
  })
  @ManyToOne(() => UserEntity, (user) => user.reservations_made)
  guest: Relation<UserEntity>;

  @OneToMany(() => PaymentEntity, (payment) => payment.reservation)
  payments: Relation<PaymentEntity[]>;

  @Column('int', { nullable: true })
  night_staying: number;

  @Column({ type: 'timestamptz', nullable: true })
  check_in_date: Date;

  @Column({ type: 'timestamptz', nullable: true })
  check_out_date: Date;

  @Column('int', { nullable: true })
  guest_number: number;

  // Total price the guest need to pay
  @Column('float', { nullable: true })
  total_price: number;

  @Column('jsonb', { default: [] })
  guest_info: string[];

  @Column('varchar', { nullable: true })
  guest_wallet_address: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    nullable: true,
  })
  status: ReservationStatus;

  @Column('varchar', { nullable: true })
  cancel_reason: string;

  @Column('uuid', { nullable: true })
  cancelled_by_id: Uuid;

  @Column('varchar', { nullable: true })
  cancellation_transaction_hash: string;

  @OneToOne(() => DisputeEntity, (dispute) => dispute.reservation)
  dispute: Relation<DisputeEntity>;

  @Column('varchar', { nullable: true })
  book_hash: string;

  @Column('varchar', { nullable: true })
  guest_did: string;

  @Column('varchar', { nullable: true })
  booking_credential_id: string;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    default: null,
    nullable: true,
  })
  deleted_at: Date;
}
