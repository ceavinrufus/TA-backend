import { ReservationEntity } from '@/api/reservation/entities/reservation.entity';
import { Uuid } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

@Entity({ name: 'payments' })
export class PaymentEntity extends AbstractEntity {
  constructor(data?: Partial<PaymentEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_payment_id' })
  id!: Uuid;

  @Column({ type: 'float' })
  amount: number;

  @Column({ type: 'boolean', default: false })
  is_successful: boolean;

  @Column('varchar', { nullable: true })
  transaction_hash: string;

  @Column({ name: 'reservation_id' })
  reservation_id!: Uuid;

  @JoinColumn({
    name: 'reservation_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_payment_reservation_id',
  })
  @ManyToOne(() => ReservationEntity, (reservation) => reservation.payments)
  reservation: Relation<ReservationEntity>;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    default: null,
  })
  deleted_at: Date;
}
