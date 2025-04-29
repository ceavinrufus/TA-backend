import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeTaxToGuestDepositInReservationTable1745864449633
  implements MigrationInterface
{
  name = 'ChangeTaxToGuestDepositInReservationTable1745864449633';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reservations"
                RENAME COLUMN "tax" TO "guest_deposit"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reservations"
                RENAME COLUMN "guest_deposit" TO "tax"
        `);
  }
}
