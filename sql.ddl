-- users 테이블
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    login_id        VARCHAR(100) NOT NULL,
    password        VARCHAR(255) NOT NULL,
    role            VARCHAR(10) NOT NULL,
    phone           VARCHAR(100),
    refresh_token   VARCHAR(255),
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
    recruit_start    DATE,
    recruit_end      DATE,
    description      TEXT,
    main_activities  TEXT,
    president_id    INTEGER,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_clubs_president_id
    ON clubs(president_id);

CREATE TABLE club_reports (
    id          SERIAL PRIMARY KEY,
    content     JSONB          ,
    club_id     INTEGER        NOT NULL,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_club_reports_club_id
    ON club_reports(club_id);
