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

@Entity({ name: 'prices' })
@Index('IDX_price_id', ['start_date', 'end_date', 'listing_id'], {
  unique: true,
})
export class PriceEntity extends AbstractEntity {
  constructor(data?: Partial<PriceEntity>) {
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
    foreignKeyConstraintName: 'FK_price_listing_id',
  })
  @ManyToOne(() => ListingEntity, (listing) => listing.prices)
  listing: Relation<ListingEntity>;

  @Column({ type: 'float' })
  price_override: number;

  @Column({ type: 'varchar', length: 50 })
  type: string;
}
