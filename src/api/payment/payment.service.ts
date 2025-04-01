import { Uuid } from '@/common/types/common.type';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';
import { CreatePaymentDto } from './dto/create-payment.req.dto';
import { PaymentResDto } from './dto/payment.res.dto';
import { UpdatePaymentDto } from './dto/update-payment.req.dto';
import { PaymentEntity } from './entities/payment.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<PaymentResDto> {
    const payment = this.paymentRepository.create(createPaymentDto);
    const savedPayment = await this.paymentRepository.save(payment);
    return plainToInstance(PaymentResDto, savedPayment);
  }

  async findAll(): Promise<PaymentResDto[]> {
    const payments = await this.paymentRepository.find();
    return plainToInstance(PaymentResDto, payments);
  }

  async findOne(id: Uuid): Promise<PaymentResDto> {
    const payment = await this.paymentRepository.findOneByOrFail({ id });
    return plainToInstance(PaymentResDto, payment);
  }

  async update(
    id: Uuid,
    updatePaymentDto: UpdatePaymentDto,
  ): Promise<PaymentResDto> {
    await this.paymentRepository.findOneByOrFail({ id });
    await this.paymentRepository.update(id, updatePaymentDto);
    const updatedPayment = await this.paymentRepository.findOneByOrFail({ id });
    return plainToInstance(PaymentResDto, updatedPayment);
  }

  async remove(id: Uuid): Promise<void> {
    await this.paymentRepository.findOneByOrFail({ id });
    await this.paymentRepository.softDelete({ id });
  }
}
