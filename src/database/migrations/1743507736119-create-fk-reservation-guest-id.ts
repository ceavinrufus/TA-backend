import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFkReservationGuestId1743507736119
  implements MigrationInterface
{
  name = 'CreateFkReservationGuestId1743507736119';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD CONSTRAINT "FK_reservation_guest_id" FOREIGN KEY ("guest_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reservations" DROP CONSTRAINT "FK_reservation_guest_id"
        `);
  }
}
