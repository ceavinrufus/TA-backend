import { AvailabilityEntity } from '@/api/availability/entities/availability.entity';
import { PriceEntity } from '@/api/price/entities/price.entity';
import { ReservationEntity } from '@/api/reservation/entities/reservation.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Uuid } from '@/common/types/common.type';
import { ListingStatus } from '@/constants/entity.enum';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

@Entity({ name: 'listings' })
export class ListingEntity extends AbstractEntity {
  constructor(data?: Partial<ListingEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_listing_id' })
  id!: Uuid;

  @Column({ length: 255, nullable: true, unique: true })
  @Index('IDX_listing_slug', { unique: true })
  slug: string;

  @Column({
    length: 50,
    nullable: true,
  })
  name: string;

  @Column({ length: 255, nullable: true })
  address: string;

  @Column({ type: 'int', nullable: true })
  region_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'time with time zone', nullable: true })
  earliest_check_in_time: string;

  @Column({ type: 'time with time zone', nullable: true })
  latest_check_in_time: string;

  @Column({ type: 'time with time zone', nullable: true })
  check_out_time: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 10, nullable: true })
  postal_code: string;

  @Column({ length: 255, nullable: true })
  property_type: string;

  @Column({ length: 255, nullable: true })
  place_type: string;

  @Column({ type: 'int2', nullable: true })
  guest_number: number;

  @Column({ type: 'int2', nullable: true })
  bedrooms: number;

  @Column({ type: 'int2', nullable: true })
  beds: number;

  @Column({ type: 'int2', nullable: true })
  bathrooms: number;

  @Column({ type: 'boolean', nullable: true })
  default_availability: boolean;

  @Column({ type: 'float', nullable: true })
  default_price: number;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 5, nullable: true })
  country_code: string;

  @Column({ length: 255, nullable: true })
  region_name: string;

  @Column({
    type: 'enum',
    enum: ListingStatus,
    nullable: true,
  })
  status: ListingStatus;

  @Column('text', { array: true, default: [] })
  pictures: string[];

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column('text', { array: true, default: [] })
  rules: string[];

  @Column('text', { array: true, default: [] })
  security_agreement: string[];

  @Column('text', { array: true, default: [] })
  amenities: string[];

  @Column({
    type: 'jsonb',
    default: () =>
      '\'{"unit": "", "building": "", "district": "", "city": "", "details": ""}\'',
  })
  location_details: {
    unit: string;
    building: string;
    district: string;
    city: string;
    details: string;
  };

  @Column({ type: 'boolean', nullable: true })
  is_instant_booking: boolean;

  @Column({ type: 'boolean', nullable: true })
  is_no_free_cancellation: boolean;

  @Column({ length: 20, nullable: true })
  cancellation_policy: string;

  // Guest can book on the same day as check-in until this time.
  @Column({ type: 'time with time zone', nullable: true })
  same_day_booking_cutoff_time: string;

  @Column({ type: 'int', nullable: true })
  max_booking_night: number;

  @Column({ type: 'int', nullable: true })
  min_booking_night: number;

  @Column({ length: 10, nullable: true })
  booking_window: string;

  @Column({ length: 40, nullable: true })
  buffer_period: string;

  @Column('int2', { array: true, default: [] })
  restricted_check_in: number[];

  @Column('int2', { array: true, default: [] })
  restricted_check_out: number[];

  @Column({ name: 'host_id' })
  @Index('IDX_listing_host_id')
  host_id!: Uuid;

  @JoinColumn({
    name: 'host_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_listing_host_id',
  })
  @ManyToOne(() => UserEntity, (user) => user.listings)
  host: Relation<UserEntity>;

  @OneToMany(() => ReservationEntity, (reservation) => reservation.listing)
  reservations: Relation<ReservationEntity[]>;

  @OneToMany(() => PriceEntity, (price) => price.listing)
  prices: Relation<PriceEntity[]>;

  @OneToMany(() => AvailabilityEntity, (availability) => availability.listing)
  availabilities: Relation<AvailabilityEntity[]>;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    default: null,
  })
  deleted_at: Date;
}
