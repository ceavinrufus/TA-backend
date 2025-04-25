import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGuestDidInReservation1745226619043
  implements MigrationInterface
{
  name = 'CreateGuestDidInReservation1745226619043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD "guest_did" character varying
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reservations" DROP COLUMN "guest_did"
        `);
  }
}
