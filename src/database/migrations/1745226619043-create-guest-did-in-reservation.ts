import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGuestDidInReservation1745226619043 implements MigrationInterface {
    name = 'CreateGuestDidInReservation1745226619043'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD "guest_did" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "listings"
            ALTER COLUMN "location_details"
            SET DEFAULT '{"unit": "", "building": "", "district": "", "city": "", "details": ""}'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "listings"
            ALTER COLUMN "location_details"
            SET DEFAULT '{"city": "", "unit": "", "details": "", "building": "", "district": ""}'
        `);
        await queryRunner.query(`
            ALTER TABLE "reservations" DROP COLUMN "guest_did"
        `);
    }

}
