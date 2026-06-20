import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLinkUrlToMainBanners2026051100000
    implements MigrationInterface
{
    name = 'AddLinkUrlToMainBanners2026051100000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE main_banners
            ADD COLUMN IF NOT EXISTS link_url VARCHAR(2048)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE main_banners
            DROP COLUMN IF EXISTS link_url
        `);
    }
}
