import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApplyUrlToClubs2026070600000 implements MigrationInterface {
    name = 'AddApplyUrlToClubs2026070600000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE clubs
            ADD COLUMN IF NOT EXISTS apply_url VARCHAR(2048)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE clubs
            DROP COLUMN IF EXISTS apply_url
        `);
    }
}
