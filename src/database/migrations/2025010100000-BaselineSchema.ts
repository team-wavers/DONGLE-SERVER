import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 기존에 마이그레이션 없이 만들어졌던 핵심 테이블(users, clubs, club_reports,
 * main_banners, club_schedules, one_time_keys)을 기록하는 baseline 마이그레이션.
 * 이미 테이블이 존재하는 운영/dev DB에서는 모든 구문이 IF NOT EXISTS / DO 블록으로
 * 가드되어 있어 안전하게 no-op으로 지나가고, 빈 DB(CI 등)에서는 전체 스키마를 생성한다.
 */
export class BaselineSchema2025010100000 implements MigrationInterface {
    name = 'BaselineSchema2025010100000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "users" (
                "id" SERIAL NOT NULL,
                "name" character varying(100) NOT NULL,
                "login_id" character varying(100) NOT NULL,
                "password" character varying(255) NOT NULL,
                "role" character varying(10) NOT NULL,
                "phone" character varying(100),
                "refresh_token" character varying(255),
                "is_system" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "main_banners" (
                "id" SERIAL NOT NULL,
                "image_url" character varying(255) NOT NULL,
                "link_url" character varying(2048),
                "publish_start_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "publish_end_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_cc11b09cee011aba7c411d0c58d" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "clubs" (
                "id" SERIAL NOT NULL,
                "name" character varying(100) NOT NULL,
                "is_recruiting" boolean NOT NULL DEFAULT false,
                "category" character varying(50) NOT NULL,
                "sns" json,
                "tags" text array,
                "recruit_start" TIMESTAMP WITH TIME ZONE,
                "recruit_end" TIMESTAMP WITH TIME ZONE,
                "description" text,
                "icon_url" character varying(255),
                "location" character varying(100),
                "main_activities" text,
                "president_id" integer,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "REL_34d20f327b8371974ad51f0c65" UNIQUE ("president_id"),
                CONSTRAINT "PK_bb09bd0c8d5238aeaa8f86ee0d4" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "club_reports" (
                "id" SERIAL NOT NULL,
                "content" text,
                "image_urls" text array NOT NULL,
                "title" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "club_id" integer NOT NULL,
                CONSTRAINT "PK_8df589fb5963f58c50bc3f66dad" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "club_schedules" (
                "id" SERIAL NOT NULL,
                "title" character varying(100) NOT NULL,
                "type" character varying(30) NOT NULL,
                "start_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "end_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "is_public" boolean NOT NULL,
                "location" character varying(100),
                "description" text,
                "external_url" character varying(2048),
                "club_id" integer,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_c41d0e9b5864e2e416107952e7b" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "one_time_keys" (
                "id" SERIAL NOT NULL,
                "key" character varying(255) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "expired_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "used_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "deleted_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "PK_db16481dc4d6e588d7409933f5c" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'FK_735fb4220db89d30ec4188557b7'
                ) THEN
                    ALTER TABLE "club_reports"
                    ADD CONSTRAINT "FK_735fb4220db89d30ec4188557b7"
                    FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'FK_34d20f327b8371974ad51f0c651'
                ) THEN
                    ALTER TABLE "clubs"
                    ADD CONSTRAINT "FK_34d20f327b8371974ad51f0c651"
                    FOREIGN KEY ("president_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'FK_ec7f442caa61028ae31ad93e8a9'
                ) THEN
                    ALTER TABLE "club_schedules"
                    ADD CONSTRAINT "FK_ec7f442caa61028ae31ad93e8a9"
                    FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "club_schedules" DROP CONSTRAINT IF EXISTS "FK_ec7f442caa61028ae31ad93e8a9"
        `);
        await queryRunner.query(`
            ALTER TABLE "clubs" DROP CONSTRAINT IF EXISTS "FK_34d20f327b8371974ad51f0c651"
        `);
        await queryRunner.query(`
            ALTER TABLE "club_reports" DROP CONSTRAINT IF EXISTS "FK_735fb4220db89d30ec4188557b7"
        `);
        await queryRunner.query(`DROP TABLE IF EXISTS "one_time_keys"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "club_schedules"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "clubs"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "club_reports"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "main_banners"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    }
}
