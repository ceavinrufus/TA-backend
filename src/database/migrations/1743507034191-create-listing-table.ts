import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateListingTable1743507034191 implements MigrationInterface {
  name = 'CreateListingTable1743507034191';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."listings_status_enum" AS ENUM(
                'LISTING_DRAFT',
                'LISTING_IN_REVIEW',
                'LISTING_REJECTED',
                'LISTING_COMPLETED',
                'LISTING_DELETED'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "listings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "slug" character varying(255),
                "name" character varying(50),
                "address" character varying(255),
                "region_id" integer,
                "latitude" numeric(10, 8),
                "longitude" numeric(11, 8),
                "earliest_check_in_time" TIME WITH TIME ZONE,
                "latest_check_in_time" TIME WITH TIME ZONE,
                "check_out_time" TIME WITH TIME ZONE,
                "description" text,
                "postal_code" character varying(10),
                "property_type" character varying(255),
                "place_type" character varying(255),
                "guest_number" smallint,
                "bedrooms" smallint,
                "beds" smallint,
                "bathrooms" smallint,
                "default_availability" boolean,
                "default_price" double precision,
                "phone" character varying(20),
                "country_code" character varying(5),
                "region_name" character varying(255),
                "status" "public"."listings_status_enum",
                "pictures" text array NOT NULL DEFAULT '{}',
                "tags" text array NOT NULL DEFAULT '{}',
                "rules" text array NOT NULL DEFAULT '{}',
                "security_agreement" text array NOT NULL DEFAULT '{}',
                "amenities" text array NOT NULL DEFAULT '{}',
                "location_details" jsonb NOT NULL DEFAULT '{"unit": "", "building": "", "district": "", "city": "", "details": ""}',
                "is_instant_booking" boolean,
                "is_no_free_cancellation" boolean,
                "cancellation_policy" character varying(20),
                "same_day_booking_cutoff_time" TIME WITH TIME ZONE,
                "max_booking_night" integer,
                "min_booking_night" integer,
                "booking_window" character varying(10),
                "buffer_period" character varying(40),
                "restricted_check_in" smallint array NOT NULL DEFAULT '{}',
                "restricted_check_out" smallint array NOT NULL DEFAULT '{}',
                "host_id" uuid NOT NULL,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_23a9f6b054ab6ba43132dfec40c" UNIQUE ("slug"),
                CONSTRAINT "PK_listing_id" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_listing_slug" ON "listings" ("slug")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_listing_host_id" ON "listings" ("host_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "listings"
            ADD CONSTRAINT "FK_listing_host_id" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "listings" DROP CONSTRAINT "FK_listing_host_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_listing_host_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_listing_slug"
        `);
    await queryRunner.query(`
            DROP TABLE "listings"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."listings_status_enum"
        `);
  }
}
