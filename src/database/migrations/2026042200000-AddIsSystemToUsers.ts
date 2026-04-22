import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsSystemToUsers2026042200000 implements MigrationInterface {
    name = 'AddIsSystemToUsers2026042200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE users
            DROP COLUMN IF EXISTS is_system
        `);
    }
}
