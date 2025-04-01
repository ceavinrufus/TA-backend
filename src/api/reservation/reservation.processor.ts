import { Uuid } from '@/common/types/common.type';
import { ReservationStatus } from '@/constants/entity.enum';
import { JobName } from '@/constants/job.constant';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { ReservationEntity } from './entities/reservation.entity';

@Processor('reservationQueue')
export class ReservationProcessor extends WorkerHost {
  constructor(
    @InjectRepository(ReservationEntity)
    private reservationRepository: Repository<ReservationEntity>,
  ) {
    super();
  }

  async process(job: Job<{ reservationId: Uuid }>): Promise<any> {
    const { name, data } = job;

    if (name === JobName.EXPIRE_RESERVATION) {
      return this.handleExpiration(data);
    }
  }

  private async handleExpiration(data: { reservationId: Uuid }) {
    const { reservationId } = data;

    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new Error(`Reservation with ID ${reservationId} not found`);
    }

    if (
      reservation.status !== ReservationStatus.ORDER_WAITING_PAYMENT &&
      reservation.status !== ReservationStatus.ORDER_CREATED
    ) {
      throw new Error(
        `Reservation status must be ORDER_WAITING_PAYMENT or ORDER_CREATED, got ${reservation.status}`,
      );
    }

    try {
      await this.reservationRepository.update(reservationId, {
        status: ReservationStatus.ORDER_CANCELED,
        cancel_reason: 'CANCEL_TIME_OUT_INVOICE',
      });
    } catch (error) {
      throw new Error(`Failed to update reservation status: ${error.message}`);
    }
    console.log(
      `Reservation ${reservationId} status updated to CANCELED due to timeout.`,
    );
  }
}
