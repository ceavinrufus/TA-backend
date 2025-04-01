import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserTable1743506098698 implements MigrationInterface {
  name = 'CreateUserTable1743506098698';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(50),
                "email" character varying,
                "wallet_address" character varying NOT NULL DEFAULT '',
                "is_verified" boolean NOT NULL DEFAULT false,
                "is_anonymous" boolean NOT NULL DEFAULT false,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_user_wallet_address" ON "users" ("wallet_address")
            WHERE "deleted_at" IS NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."UQ_user_wallet_address"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
  }
}
