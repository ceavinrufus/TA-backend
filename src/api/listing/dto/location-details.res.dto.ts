import { StringField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class LocationDetailsResDto {
  @StringField()
  @Expose()
  unit: string;

  @StringField()
  @Expose()
  building: string;

  @StringField()
  @Expose()
  district: string;

  @StringField()
  @Expose()
  city: string;

  @StringField()
  @Expose()
  details: string;
}
