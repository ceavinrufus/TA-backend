import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentAndDisputeTable1743507409434
  implements MigrationInterface
{
  name = 'CreatePaymentAndDisputeTable1743507409434';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."disputes_status_enum" AS ENUM(
                'PENDING',
                'UNDER_REVIEW',
                'RESOLVED_FAVOR_GUEST',
                'RESOLVED_FAVOR_HOST',
                'RESOLVED_COMPROMISE'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "disputes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "reservation_id" uuid NOT NULL,
                "raised_by_id" uuid NOT NULL,
                "raised_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "resolved_at" TIMESTAMP WITH TIME ZONE,
                "status" "public"."disputes_status_enum" NOT NULL,
                "reasons" text array NOT NULL DEFAULT '{}',
                "guest_claim" text,
                "host_response" text,
                "mediator_notes" text,
                "resolution_reason" text,
                "mediator_id" character varying,
                "evidences" text array NOT NULL DEFAULT '{}',
                "raise_dispute_transaction_hash" character varying,
                "resolve_dispute_transaction_hash" character varying,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "REL_53838b21e5c54fb25357a49df9" UNIQUE ("reservation_id"),
                CONSTRAINT "PK_3c97580d01c1a4b0b345c42a107" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_dispute_reservation_id" ON "disputes" ("reservation_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "payments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "amount" double precision NOT NULL,
                "currency" character varying NOT NULL,
                "is_successful" boolean NOT NULL DEFAULT false,
                "transaction_hash" character varying,
                "reservation_id" uuid NOT NULL,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_payment_id" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "disputes"
            ADD CONSTRAINT "FK_dispute_reservation_id" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "payments"
            ADD CONSTRAINT "FK_payment_reservation_id" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "payments" DROP CONSTRAINT "FK_payment_reservation_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "disputes" DROP CONSTRAINT "FK_dispute_reservation_id"
        `);
    await queryRunner.query(`
            DROP TABLE "payments"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_dispute_reservation_id"
        `);
    await queryRunner.query(`
            DROP TABLE "disputes"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."disputes_status_enum"
        `);
  }
}
