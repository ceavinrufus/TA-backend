import { WrapperType } from '@/common/types/types';
import {
  BooleanFieldOptional,
  ClassFieldOptional,
  DateFieldOptional,
  NumberField,
  NumberFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators'; // Use the specific decorators you mentioned
import { ListListingReqDto } from './list-listing.req.dto';

class SortingDto {
  @StringFieldOptional()
  sorting_by?: string;

  @BooleanFieldOptional()
  desc?: boolean;
}

class MapFilterDto {
  @NumberFieldOptional({ each: true, example: [-6.2088, 106.8456] })
  coordinates?: [number, number];

  @NumberFieldOptional()
  zoom_level?: number;

  @NumberFieldOptional()
  max_distance?: number;
}

export class PriceRangeDto {
  @NumberField()
  min: number;

  @NumberField()
  max: number;
}

class FiltersDto {
  @StringFieldOptional({ maxLength: 100 })
  listing_name?: string;

  @StringFieldOptional({ each: true })
  amenities?: string[];

  @ClassFieldOptional(() => PriceRangeDto)
  price_per_night?: WrapperType<PriceRangeDto>;

  @ClassFieldOptional(() => SortingDto)
  sorting?: SortingDto;

  @ClassFieldOptional(() => MapFilterDto)
  map_filter?: MapFilterDto;

  @BooleanFieldOptional()
  free_cancellation?: boolean;

  // @StringFieldOptional({ each: true })
  // beddings?: string[];

  // @StringFieldOptional({ each: true })
  // meal_type?: string[];

  // @StringFieldOptional({ each: true })
  // kinds?: string[];

  // @NumberFieldOptional({ each: true })
  // stars?: number[];

  // @NumberFieldOptional()
  // min_rating?: number;

  // @BooleanFieldOptional()
  // favorites?: boolean;

  // @NumberFieldOptional({ each: true })
  // geo_location?: number[];
}

class GuestDto {
  @NumberFieldOptional()
  adults?: number;

  @NumberFieldOptional({ each: true })
  children?: number[];
}

class ParamsDto {
  @DateFieldOptional()
  check_in?: Date;

  @DateFieldOptional()
  check_out?: Date;

  @ClassFieldOptional(() => GuestDto)
  guests?: GuestDto;

  @NumberFieldOptional()
  region_id?: number;

  @StringFieldOptional()
  slug?: string;
}

export class SearchListingDto {
  @ClassFieldOptional(() => ListListingReqDto)
  pagination: ListListingReqDto;

  @ClassFieldOptional(() => FiltersDto)
  filters?: FiltersDto;

  @ClassFieldOptional(() => ParamsDto)
  params?: ParamsDto;

  @BooleanFieldOptional({ default: true })
  use_cache?: boolean;
}
