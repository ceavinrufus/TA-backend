import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDidInUserTable1746374438512 implements MigrationInterface {
  name = 'AddDidInUserTable1746374438512';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "name"
        `);
    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "email"
        `);
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD "did" character varying
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_user_did" ON "users" ("did")
            WHERE "deleted_at" IS NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."UQ_user_did"
        `);
    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "did"
        `);
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD "email" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD "name" character varying(50)
        `);
  }
}
