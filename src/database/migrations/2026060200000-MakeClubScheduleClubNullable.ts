import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeClubScheduleClubNullable2026060200000
    implements MigrationInterface
{
    name = 'MakeClubScheduleClubNullable2026060200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE club_schedules
            ALTER COLUMN club_id DROP NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM club_schedules
            WHERE club_id IS NULL
        `);
        await queryRunner.query(`
            ALTER TABLE club_schedules
            ALTER COLUMN club_id SET NOT NULL
        `);
    }
}
