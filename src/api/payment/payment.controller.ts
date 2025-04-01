import { Uuid } from '@/common/types/common.type';
import { ApiAuth } from '@/decorators/http.decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { CreatePaymentDto } from './dto/create-payment.req.dto';
import { PaymentResDto } from './dto/payment.res.dto';
import { UpdatePaymentDto } from './dto/update-payment.req.dto';
import { PaymentService } from './payment.service';

@ApiTags('payments')
@Controller({
  path: 'payments',
  version: '1',
})
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiAuth({
    type: PaymentResDto,
    summary: 'Create a new payment',
    statusCode: HttpStatus.CREATED,
  })
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentResDto> {
    return await this.paymentService.create(createPaymentDto);
  }

  @Get()
  @ApiAuth({
    type: PaymentResDto,
    summary: 'List all payments',
  })
  async findAll(): Promise<PaymentResDto[]> {
    return await this.paymentService.findAll();
  }

  @Get(':id')
  @ApiAuth({
    type: PaymentResDto,
    summary: 'Find a payment by id',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Payment ID',
  })
  async findOne(@Param('id') id: Uuid): Promise<PaymentResDto> {
    return await this.paymentService.findOne(id);
  }

  @Patch(':id')
  @ApiAuth({
    type: PaymentResDto,
    summary: 'Update a payment by id',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Payment ID',
  })
  async update(
    @Param('id') id: Uuid,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ): Promise<PaymentResDto> {
    return await this.paymentService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  @ApiAuth({
    summary: 'Delete a payment by id',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Payment ID',
  })
  async remove(@Param('id') id: Uuid): Promise<void> {
    return await this.paymentService.remove(id);
  }
}
