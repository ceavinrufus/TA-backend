import { ListingEntity } from '@/api/listing/entities/listing.entity';
import { Uuid } from '@/common/types/common.type';
import { ListingStatus } from '@/constants/entity.enum';
import { faker } from '@faker-js/faker';
import { setSeederFactory } from 'typeorm-extension';

export default setSeederFactory(ListingEntity, () => {
  const listing = new ListingEntity();

  listing.name = faker.company.name();
  listing.address = faker.location.streetAddress();
  listing.latitude = faker.location.latitude();
  listing.longitude = faker.location.longitude();
  listing.earliest_check_in_time = '12:00:00Z';
  listing.latest_check_in_time = '12:00:00Z';
  listing.check_out_time = '14:00:00Z';
  listing.description = faker.lorem.paragraph();
  listing.postal_code = faker.location.zipCode();
  listing.property_type = 'HOUSE';
  listing.place_type = 'PRIVATE_ROOM';
  listing.guest_number = faker.number.int({ min: 1, max: 10 });
  listing.bedrooms = faker.number.int({ min: 1, max: 5 });
  listing.beds = faker.number.int({ min: 1, max: 5 });
  listing.bathrooms = faker.number.int({ min: 1, max: 3 });
  listing.default_availability = faker.datatype.boolean();
  listing.default_price = parseFloat(faker.commerce.price());
  listing.phone = faker.phone.number();
  listing.country_code = faker.location.countryCode();
  listing.region_name = faker.location.state();
  listing.status = faker.helpers.arrayElement(Object.values(ListingStatus));
  listing.pictures = [faker.image.url()];
  listing.tags = [faker.lorem.word()];
  listing.security_agreement = [faker.lorem.sentence()];
  listing.amenities = [faker.lorem.word()];
  listing.host_id = '85411325-25bb-4b3a-9ab1-6bf4c13bb2f7' as Uuid;

  return listing;
});
