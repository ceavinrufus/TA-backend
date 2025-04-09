import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRoleAttributes1744211284880 implements MigrationInterface {
  name = 'AddUserRoleAttributes1744211284880';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD "is_host" boolean NOT NULL DEFAULT false
        `);
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD "is_admin" boolean NOT NULL DEFAULT false
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "is_admin"
        `);
    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "is_host"
        `);
  }
}
