import { CursorPaginationDto } from '@/common/dto/cursor-pagination/cursor-pagination.dto';
import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { buildPaginator } from '@/utils/cursor-pagination';
import { paginate } from '@/utils/offset-pagination';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';
import { CreatePriceDto } from './dto/create-price.req.dto';
import { ListPriceReqDto } from './dto/list-price.req.dto';
import { LoadMorePricesReqDto } from './dto/load-more-prices.req.dto';
import { PriceResDto } from './dto/price.res.dto';
import { UpdatePriceDto } from './dto/update-price.req.dto';
import { PriceEntity } from './entities/price.entity';

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);

  constructor(
    @InjectRepository(PriceEntity)
    private readonly priceRepository: Repository<PriceEntity>,
  ) {}

  async fetchExchangeRate(
    from_currency: string,
    to_currency: string,
  ): Promise<number> {
    try {
      const response = await axios.get(
        'https://min-api.cryptocompare.com/data/price',
        {
          params: {
            fsym: from_currency, // From Symbol
            tsyms: to_currency, // To Symbol(s)
          },
        },
      );

      // The response format is like: { "USD": 16700.32 }
      const rate = response.data[to_currency];

      if (!rate) {
        throw new Error('Rate not found in response');
      }

      this.logger.debug(
        `Exchange rate from ${from_currency} to ${to_currency}: ${rate}`,
      );
      return rate;
    } catch (error) {
      this.logger.error(`Error fetching exchange rate: ${error.message}`);
      throw new Error(
        `Failed to fetch exchange rate from ${from_currency} to ${to_currency}`,
      );
    }
  }

  async create(dto: CreatePriceDto): Promise<PriceResDto> {
    const { price_override, type, start_date, end_date, listing_id } = dto;

    // Check for uniqueness based on composite key
    const existingPrice = await this.priceRepository.findOne({
      where: { start_date, end_date, listing_id },
    });

    if (existingPrice) {
      throw new ValidationException(ErrorCode.E001);
    }

    const newPrice = new PriceEntity({
      price_override,
      type,
      start_date,
      end_date,
      listing_id,
    });

    const savedPrice = await this.priceRepository.save(newPrice);
    this.logger.debug(savedPrice);

    return plainToInstance(PriceResDto, savedPrice);
  }

  async findAll(
    reqDto: ListPriceReqDto,
  ): Promise<OffsetPaginatedDto<PriceResDto>> {
    const query = this.priceRepository
      .createQueryBuilder('price')
      .orderBy('price.start_date', 'ASC');

    const [prices, metaDto] = await paginate<PriceEntity>(query, reqDto, {
      skipCount: false,
      takeAll: false,
    });

    return new OffsetPaginatedDto(
      plainToInstance(PriceResDto, prices),
      metaDto,
    );
  }

  async loadMorePrices(
    reqDto: LoadMorePricesReqDto,
  ): Promise<CursorPaginatedDto<PriceResDto>> {
    const queryBuilder = this.priceRepository.createQueryBuilder('price');
    const paginator = buildPaginator({
      entity: PriceEntity,
      alias: 'price',
      paginationKeys: ['start_date'],
      query: {
        limit: reqDto.limit,
        order: 'ASC',
        afterCursor: reqDto.afterCursor,
        beforeCursor: reqDto.beforeCursor,
      },
    });

    const { data, cursor } = await paginator.paginate(queryBuilder);

    const metaDto = new CursorPaginationDto(
      data.length,
      cursor.afterCursor,
      cursor.beforeCursor,
      reqDto,
    );

    return new CursorPaginatedDto(plainToInstance(PriceResDto, data), metaDto);
  }

  async findOne(
    listing_id: Uuid,
    start_date: Date,
    end_date: Date,
  ): Promise<PriceResDto> {
    const price = await this.priceRepository.findOneByOrFail({
      listing_id,
      start_date,
      end_date,
    });
    return price.toDto(PriceResDto);
  }

  async update(
    listing_id: Uuid,
    start_date: Date,
    end_date: Date,
    updatePriceDto: UpdatePriceDto,
  ) {
    const price = await this.priceRepository.findOneByOrFail({
      listing_id,
      start_date,
      end_date,
    });

    Object.assign(price, updatePriceDto);

    await this.priceRepository.save(price);
  }

  async remove(listing_id: Uuid, start_date: Date, end_date: Date) {
    await this.priceRepository.findOneByOrFail({
      listing_id,
      start_date,
      end_date,
    });
    await this.priceRepository.softDelete({
      listing_id,
      start_date,
      end_date,
    });
  }
}
