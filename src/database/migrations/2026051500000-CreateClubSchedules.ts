import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClubSchedules2026051500000 implements MigrationInterface {
    name = 'CreateClubSchedules2026051500000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS club_schedules (
                id SERIAL NOT NULL,
                club_id INTEGER NOT NULL,
                title VARCHAR(100) NOT NULL,
                type VARCHAR(30) NOT NULL,
                start_at TIMESTAMP WITH TIME ZONE NOT NULL,
                end_at TIMESTAMP WITH TIME ZONE NOT NULL,
                is_public BOOLEAN NOT NULL,
                location VARCHAR(100),
                description TEXT,
                external_url VARCHAR(2048),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                deleted_at TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_club_schedules_id" PRIMARY KEY (id),
                CONSTRAINT "FK_club_schedules_club_id" FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS club_schedules
        `);
    }
}
