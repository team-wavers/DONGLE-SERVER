-- users 테이블
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    login_id        VARCHAR(100) NOT NULL,
    password        VARCHAR(255) NOT NULL,
    role            VARCHAR(10) NOT NULL,
    phone           VARCHAR(100),
    refresh_token   VARCHAR(255),
    is_system       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_id
    ON users(id);

CREATE INDEX idx_users_login_id
    ON users(login_id);



-- clubs 테이블
CREATE TABLE clubs (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    is_recruiting    BOOLEAN NOT NULL DEFAULT FALSE,
    category         VARCHAR(50) NOT NULL,
    sns              JSON,
    tags             TEXT[],
    recruit_start    TIMESTAMPTZ,
    recruit_end      TIMESTAMPTZ,
    description      TEXT,
    icon_url         VARCHAR(255),
    location         VARCHAR(100),
    main_activities  TEXT,
    president_id    INTEGER,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_clubs_president_id
    ON clubs(president_id);

CREATE INDEX idx_clubs_id
    ON clubs(id);

CREATE INDEX idx_clubs_name
    ON clubs(name);

CREATE TABLE club_reports (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255)   NOT NULL,
    content     TEXT          NOT NULL,
    image_urls  TEXT[],
    club_id     INTEGER        NOT NULL,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_club_reports_club_id
    ON club_reports(club_id);

CREATE TABLE main_banners (
    id                SERIAL PRIMARY KEY,
    image_url         VARCHAR(255)   NOT NULL,
    publish_start_at  TIMESTAMPTZ    NOT NULL,
    publish_end_at    TIMESTAMPTZ    NOT NULL,
    is_active         BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ,
    CONSTRAINT chk_main_banners_publish_period
        CHECK (publish_start_at < publish_end_at)
);

CREATE INDEX idx_main_banners_publish_start_at
    ON main_banners(publish_start_at);

CREATE INDEX idx_main_banners_is_active
    ON main_banners(is_active);

CREATE TABLE one_time_keys (
    id          SERIAL PRIMARY KEY,
    key         VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    expired_at  TIMESTAMPTZ    NOT NULL,
    used_at     TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_one_time_keys_key
    ON one_time_keys(key);
