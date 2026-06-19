# 초기 관리자 계정 생성 가이드

이 프로젝트는 `users` 테이블이 비어 있을 때에만 첫 사용자를 인증 없이 생성할 수 있습니다.  
최초 사용자 생성 이후에는 `POST /v1/users` 호출 시 관리자(`admin`) 액세스 토큰이 필요합니다.

## 동작 규칙

- 최초 1회: `users` 테이블이 비어 있으면 `POST /v1/users` 무인증 허용
- 최초 사용자 생성 이후: `admin` 권한 사용자만 `POST /v1/users` 가능
- `president` 권한으로는 사용자 생성 불가
- `login_id`, `phone` 중복 시 생성 불가

## 지원하는 역할 값

- `admin`
- `president`

## 시스템 관리자 계정

운영용 숨김 관리자 계정은 별도 역할을 만들지 않고 `role = 'admin'`, `is_system = true`로 관리합니다.

- `/v1/users` 목록/단건 조회에서는 시스템 계정이 반환되지 않습니다.
- 일반 사용자 수정/삭제 API로는 시스템 계정을 수정하거나 삭제할 수 없습니다.
- 로그인과 토큰 갱신은 기존 `/v1/auth/login`, `/v1/auth/refresh` 흐름을 그대로 사용합니다.
- 일반 사용자 생성 API는 `is_system` 값을 받지 않습니다. 시스템 계정은 운영 SQL 또는 seed 스크립트로 생성합니다.

기존 DB에는 먼저 컬럼을 추가해야 합니다.

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;
```

시스템 계정 생성 시 `password`에는 평문이 아니라 bcrypt 해시를 넣습니다.

```sql
INSERT INTO users (name, login_id, password, role, phone, is_system)
VALUES ('운영 관리자', 'internal_admin', '<bcrypt_hash>', 'admin', '00000000000', true);
```

## 1. 서버 실행

운영 환경 파일을 읽도록 `NODE_ENV=production`을 포함해 서버를 실행합니다.

```bash
NODE_ENV=production PORT=5000 node dist/main.js
```

PM2 사용 시 [`ecosystem.prod.config.js`](../ecosystem.prod.config.js)로 기동합니다. 이 설정은 `PORT: 5000`을 포함합니다.

```bash
pm2 start ecosystem.prod.config.js --update-env
```

## 2. 최초 관리자 계정 생성

최초 1회는 아래 요청으로 관리자 계정을 만듭니다.

```bash
curl -X POST http://localhost:5000/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "관리자",
    "login_id": "admin",
    "password": "admin",
    "role": "admin",
    "phone": "01012345678"
  }'
```

요청 필드:

- `name`
- `login_id`
- `password`
- `role`
- `phone`

## 3. 관리자 로그인

최초 생성한 관리자 계정으로 로그인해서 액세스 토큰을 발급받습니다.

```bash
curl -X POST http://localhost:5000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login_id": "admin",
    "password": "change-this-password"
  }'
```

응답의 `access_token`을 이후 사용자 생성에 사용합니다.

## 4. 이후 사용자 생성

최초 생성 이후에는 반드시 관리자 토큰이 필요합니다.

```bash
curl -X POST http://localhost:5000/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "name": "두번째 관리자",
    "login_id": "admin2",
    "password": "change-this-password",
    "role": "admin",
    "phone": "01098765432"
  }'
```

## 운영 체크 포인트

- 최초 관리자 생성 전에는 `users` 테이블이 비어 있어야 합니다.
- 첫 계정을 `president`로 만들면 이후 관리자 생성이 막힐 수 있으므로, 최초 사용자는 `admin`으로 만드는 것이 안전합니다.
- 운영에서는 기본 비밀번호를 바로 변경하는 것이 좋습니다.
- PM2로 올린 경우 환경변수 변경 후 `--update-env` 옵션으로 재시작해야 합니다.

```bash
pm2 restart dongle.server.prod --update-env
```
