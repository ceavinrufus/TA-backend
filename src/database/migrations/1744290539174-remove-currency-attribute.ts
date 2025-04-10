import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCurrencyAttribute1744290539174
  implements MigrationInterface
{
  name = 'RemoveCurrencyAttribute1744290539174';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "prices" DROP COLUMN "currency"
        `);
    await queryRunner.query(`
            ALTER TABLE "payments" DROP COLUMN "currency"
        `);
    await queryRunner.query(`
            ALTER TABLE "reservations" DROP COLUMN "currency"
        `);
    await queryRunner.query(`
            ALTER TABLE "reservations" DROP COLUMN "user_billing_detail"
        `);
    await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD "guest_wallet_address" character varying
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reservations" DROP COLUMN "guest_wallet_address"
        `);
    await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD "user_billing_detail" json
        `);
    await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD "currency" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "payments"
            ADD "currency" character varying NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "prices"
            ADD "currency" character varying NOT NULL
        `);
  }
}
