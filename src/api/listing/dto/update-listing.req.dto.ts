import { PartialType } from '@nestjs/swagger';
import { CreateListingDto } from './create-listing.req.dto';

export class UpdateListingDto extends PartialType(CreateListingDto) {}
