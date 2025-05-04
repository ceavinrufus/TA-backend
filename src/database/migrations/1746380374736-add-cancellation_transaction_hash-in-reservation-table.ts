import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancellationTransactionHashInReservationTable1746380374736
  implements MigrationInterface
{
  name = 'AddCancellationTransactionHashInReservationTable1746380374736';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD "cancellation_transaction_hash" character varying
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reservations" DROP COLUMN "cancellation_transaction_hash"
        `);
  }
}
