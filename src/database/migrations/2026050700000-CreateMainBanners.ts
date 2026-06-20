import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMainBanners2026050700000 implements MigrationInterface {
    name = 'CreateMainBanners2026050700000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS main_banners (
                id SERIAL NOT NULL,
                image_url VARCHAR(255) NOT NULL,
                publish_start_at TIMESTAMP WITH TIME ZONE NOT NULL,
                publish_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                deleted_at TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_main_banners_id" PRIMARY KEY (id)
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS main_banners
        `);
    }
}
