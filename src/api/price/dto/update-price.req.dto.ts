import { PartialType } from '@nestjs/swagger';
import { CreatePriceDto } from './create-price.req.dto';

export class UpdatePriceDto extends PartialType(CreatePriceDto) {}
