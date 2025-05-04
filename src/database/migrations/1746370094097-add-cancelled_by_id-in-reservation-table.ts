import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCancelledByIdInReservationTable1746370094097 implements MigrationInterface {
    name = 'AddCancelledByIdInReservationTable1746370094097'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD "cancelled_by_id" uuid
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
            ALTER TABLE "reservations" DROP COLUMN "cancelled_by_id"
        `);
    }

}
