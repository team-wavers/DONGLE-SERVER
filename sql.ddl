-- users 테이블
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    login_id        VARCHAR(100) NOT NULL,
    password        VARCHAR(255) NOT NULL,
    role            VARCHAR(10) NOT NULL,
    phone           VARCHAR(100),
    refresh_token   VARCHAR(255),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP
);

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
    president_id     INTEGER,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP,

    CONSTRAINT fk_president
        FOREIGN KEY (president_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);
