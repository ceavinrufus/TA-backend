import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReservationTable1743507225004 implements MigrationInterface {
  name = 'CreateReservationTable1743507225004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."reservations_status_enum" AS ENUM(
                'ORDER_CREATED',
                'ORDER_WAITING_PAYMENT',
                'ORDER_PAID_PARTIAL',
                'ORDER_PAID_COMPLETED',
                'ORDER_PROCESSING',
                'ORDER_COMPLETED',
                'ORDER_CANCELED',
                'ORDER_FAIL',
                'REFUND_PENDING',
                'REFUND_COMPLETED',
                'REFUND_FAIL'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "reservations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "booking_number" character varying,
                "listing_id" uuid NOT NULL,
                "guest_id" uuid NOT NULL,
                "host_id" uuid NOT NULL,
                "listing_name" character varying,
                "listing_address" character varying,
                "base_price" double precision,
                "tax" double precision,
                "service_fee" double precision,
                "currency" character varying,
                "night_staying" integer,
                "check_in_date" TIMESTAMP WITH TIME ZONE,
                "check_out_date" TIMESTAMP WITH TIME ZONE,
                "guest_number" integer,
                "total_price" double precision,
                "guest_info" jsonb NOT NULL DEFAULT '[]',
                "user_billing_detail" json,
                "status" "public"."reservations_status_enum",
                "cancel_reason" character varying,
                "book_hash" character varying,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_reservation_id" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_reservation_listing_id" ON "reservations" ("listing_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_reservation_guest_id" ON "reservations" ("guest_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_reservation_host_id" ON "reservations" ("host_id")
        `);

    await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD CONSTRAINT "FK_reservation_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD CONSTRAINT "FK_reservation_host_id" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reservations" DROP CONSTRAINT "FK_reservation_host_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "reservations" DROP CONSTRAINT "FK_reservation_listing_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_reservation_host_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_reservation_guest_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_reservation_listing_id"
        `);
    await queryRunner.query(`
            DROP TABLE "reservations"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."reservations_status_enum"
        `);
  }
}
