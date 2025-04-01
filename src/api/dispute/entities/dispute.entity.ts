import { ReservationEntity } from '@/api/reservation/entities/reservation.entity';
import { Uuid } from '@/common/types/common.type';
import { DisputeStatus } from '@/constants/entity.enum';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

@Entity({ name: 'disputes' })
export class DisputeEntity extends AbstractEntity {
  constructor(data?: Partial<DisputeEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('uuid')
  id!: Uuid;

  @Column('uuid')
  @Index('IDX_dispute_reservation_id')
  reservation_id: Uuid;

  @JoinColumn({
    name: 'reservation_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_dispute_reservation_id',
  })
  @OneToOne(() => ReservationEntity)
  reservation: Relation<ReservationEntity>;

  @Column('uuid')
  raised_by_id: Uuid;

  @Column({ type: 'timestamptz' })
  raised_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date;

  @Column({
    type: 'enum',
    enum: DisputeStatus,
  })
  status: DisputeStatus;

  @Column('text', { array: true, default: [] })
  reasons: string[];

  @Column('text', { nullable: true })
  guest_claim: string;

  @Column('text', { nullable: true })
  host_response: string;

  @Column('text', { nullable: true })
  mediator_notes: string;

  @Column('text', { nullable: true })
  resolution_reason: string;

  @Column('varchar', { nullable: true })
  mediator_id: Uuid;

  @Column('text', { array: true, default: [] })
  evidences: string[];

  @Column('varchar', { nullable: true })
  raise_dispute_transaction_hash: string;

  @Column('varchar', { nullable: true })
  resolve_dispute_transaction_hash: string;
}
