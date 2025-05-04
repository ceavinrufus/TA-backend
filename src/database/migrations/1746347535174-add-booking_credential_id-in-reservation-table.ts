import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingCredentialIdInReservationTable1746347535174
  implements MigrationInterface
{
  name = 'AddBookingCredentialIdInReservationTable1746347535174';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD "booking_credential_id" character varying
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reservations" DROP COLUMN "booking_credential_id"
        `);
  }
}
