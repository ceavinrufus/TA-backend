import { ListingEntity } from '@/api/listing/entities/listing.entity';
import { Uuid } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

@Entity({ name: 'availabilities' })
@Index('IDX_availability_id', ['start_date', 'end_date', 'listing_id'], {
  unique: true,
})
export class AvailabilityEntity extends AbstractEntity {
  constructor(data?: Partial<AvailabilityEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryColumn({ type: 'timestamptz' })
  start_date: Date;

  @PrimaryColumn({ type: 'timestamptz' })
  end_date: Date;

  @PrimaryColumn({ type: 'uuid', name: 'listing_id' })
  listing_id: Uuid;

  @JoinColumn({
    name: 'listing_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_availability_listing_id',
  })
  @ManyToOne(() => ListingEntity, (listing) => listing.availabilities)
  listing: Relation<ListingEntity>;

  @Column({ type: 'boolean' })
  availability_override: boolean;
}
