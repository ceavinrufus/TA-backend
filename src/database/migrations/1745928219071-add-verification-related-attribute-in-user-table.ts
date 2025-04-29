import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVerificationRelatedAttributeInUserTable1745928219071
  implements MigrationInterface
{
  name = 'AddVerificationRelatedAttributeInUserTable1745928219071';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "is_verified"
        `);
    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "is_anonymous"
        `);
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD "is_liveness_verified" boolean NOT NULL DEFAULT false
        `);
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD "is_uniqueness_verified" boolean NOT NULL DEFAULT false
        `);
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD "is_identity_verified" boolean NOT NULL DEFAULT false
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "is_identity_verified"
        `);
    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "is_uniqueness_verified"
        `);
    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "is_liveness_verified"
        `);
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD "is_anonymous" boolean NOT NULL DEFAULT false
        `);
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD "is_verified" boolean NOT NULL DEFAULT false
        `);
  }
}
