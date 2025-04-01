import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePriceAndAvailabilityTable1743507506161
  implements MigrationInterface
{
  name = 'CreatePriceAndAvailabilityTable1743507506161';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "availabilities" (
                "start_date" TIMESTAMP WITH TIME ZONE NOT NULL,
                "end_date" TIMESTAMP WITH TIME ZONE NOT NULL,
                "listing_id" uuid NOT NULL,
                "availability_override" boolean NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_5239dd75e90b803b855b6ff58d5" PRIMARY KEY ("start_date", "end_date", "listing_id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_availability_id" ON "availabilities" ("start_date", "end_date", "listing_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "prices" (
                "start_date" TIMESTAMP WITH TIME ZONE NOT NULL,
                "end_date" TIMESTAMP WITH TIME ZONE NOT NULL,
                "listing_id" uuid NOT NULL,
                "price_override" double precision NOT NULL,
                "currency" character varying NOT NULL,
                "type" character varying(50) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_2766ead3caebab0e7dbd77f4bdd" PRIMARY KEY ("start_date", "end_date", "listing_id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_price_id" ON "prices" ("start_date", "end_date", "listing_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "availabilities"
            ADD CONSTRAINT "FK_availability_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "prices"
            ADD CONSTRAINT "FK_price_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "prices" DROP CONSTRAINT "FK_price_listing_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "availabilities" DROP CONSTRAINT "FK_availability_listing_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_price_id"
        `);
    await queryRunner.query(`
            DROP TABLE "prices"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_availability_id"
        `);
    await queryRunner.query(`
            DROP TABLE "availabilities"
        `);
  }
}
