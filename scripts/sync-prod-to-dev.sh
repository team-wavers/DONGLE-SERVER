#!/usr/bin/env bash
set -euo pipefail

# 서버 환경에 맞게 이 블록만 수정하세요.
PG_HOST="localhost"
PG_PORT="5432"
PG_USER="postgres"
PROD_DB="dongle_prod"
DEV_DB="dongle_dev"
BACKUP_DIR="$HOME/db-backups"

# 개발 DB의 객체 owner입니다. 앱과 migration이 사용하는 DB 유저와 맞추세요.
DEV_OWNER_USER="dongle_dev"

# 복원 후 개발 endpoint가 현재 개발 코드 기준 스키마로 동작하도록 migration을 실행합니다.
APP_DIR="/home/ec2-user/dongle.server.dev"
APP_NODE_ENV="development"
RUN_MIGRATIONS="true"

# 선택 사항입니다. 복원 후 개인정보/토큰 정리 SQL이 필요 없으면 비워두세요.
# 예시: SANITIZE_SQL="./scripts/sanitize-dev.sql"
SANITIZE_SQL=""

DATE="$(date +%Y%m%d_%H%M%S)"
PROD_DUMP_FILE="$BACKUP_DIR/${PROD_DB}_for_dev_sync_${DATE}.dump"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "필수 명령을 찾을 수 없습니다: $1" >&2
    exit 1
  fi
}

require_configured_value() {
  local name="$1"
  local value="$2"

  if [[ -z "$value" || "$value" == change_me_* ]]; then
    echo "스크립트 상단에서 $name 값을 먼저 설정하세요." >&2
    exit 1
  fi
}

require_command pg_dump
require_command pg_restore
require_command dropdb
require_command createdb
require_command psql

if [[ "$RUN_MIGRATIONS" == "true" ]]; then
  require_command yarn
fi

require_configured_value "PROD_DB" "$PROD_DB"
require_configured_value "DEV_DB" "$DEV_DB"
require_configured_value "DEV_OWNER_USER" "$DEV_OWNER_USER"

if [[ "$PROD_DB" == "$DEV_DB" ]]; then
  echo "PROD_DB와 DEV_DB는 서로 달라야 합니다." >&2
  exit 1
fi

if [[ -n "$SANITIZE_SQL" && ! -f "$SANITIZE_SQL" ]]; then
  echo "SANITIZE_SQL 파일이 존재하지 않습니다: $SANITIZE_SQL" >&2
  exit 1
fi

if [[ "$RUN_MIGRATIONS" == "true" ]]; then
  require_configured_value "APP_DIR" "$APP_DIR"
  require_configured_value "APP_NODE_ENV" "$APP_NODE_ENV"

  if [[ ! -d "$APP_DIR" ]]; then
    echo "APP_DIR 디렉터리가 존재하지 않습니다: $APP_DIR" >&2
    exit 1
  fi
fi

mkdir -p "$BACKUP_DIR"

cat <<EOF
개발 DB를 운영 DB 데이터로 덮어씁니다.

운영 DB:   $PROD_DB
개발 DB:   $DEV_DB
백업 경로: $BACKUP_DIR
개발 owner: $DEV_OWNER_USER

실행 순서:
1. 운영 DB dump를 생성합니다.
2. 개발 DB를 삭제 후 DEV_OWNER_USER 소유로 재생성합니다.
3. 운영 DB dump를 DEV_OWNER_USER role로 개발 DB에 복원합니다.
4. SANITIZE_SQL이 설정되어 있으면 실행합니다.
5. RUN_MIGRATIONS=true이면 개발 앱 기준 TypeORM migration을 실행합니다.
EOF

read -r -p "계속하려면 OVERWRITE_DEV 를 입력하세요: " CONFIRM
if [[ "$CONFIRM" != "OVERWRITE_DEV" ]]; then
  echo "중단했습니다."
  exit 1
fi

echo "운영 DB dump를 생성합니다..."
pg_dump \
  --host "$PG_HOST" \
  --port "$PG_PORT" \
  --username "$PG_USER" \
  --format custom \
  --no-owner \
  --no-acl \
  --file "$PROD_DUMP_FILE" \
  "$PROD_DB"

echo "개발 DB를 삭제 후 재생성합니다..."
dropdb \
  --host "$PG_HOST" \
  --port "$PG_PORT" \
  --username "$PG_USER" \
  --force \
  "$DEV_DB"

createdb \
  --host "$PG_HOST" \
  --port "$PG_PORT" \
  --username "$PG_USER" \
  --owner "$DEV_OWNER_USER" \
  "$DEV_DB"

echo "운영 DB dump를 개발 DB에 복원합니다..."
pg_restore \
  --host "$PG_HOST" \
  --port "$PG_PORT" \
  --username "$PG_USER" \
  --dbname "$DEV_DB" \
  --role "$DEV_OWNER_USER" \
  --no-owner \
  --no-acl \
  "$PROD_DUMP_FILE"

if [[ -n "$SANITIZE_SQL" ]]; then
  echo "정리 SQL을 실행합니다..."
  psql \
    --host "$PG_HOST" \
    --port "$PG_PORT" \
    --username "$PG_USER" \
    --dbname "$DEV_DB" \
    --file "$SANITIZE_SQL"
fi

if [[ "$RUN_MIGRATIONS" == "true" ]]; then
  echo "개발 DB TypeORM migration 상태를 확인합니다..."
  (
    cd "$APP_DIR"
    NODE_ENV="$APP_NODE_ENV" yarn migration:show </dev/null
  )

  echo "개발 DB 미적용 TypeORM migration을 실행합니다..."
  (
    cd "$APP_DIR"
    NODE_ENV="$APP_NODE_ENV" yarn migration:run </dev/null
  )
fi

cat <<EOF
완료했습니다.

운영 DB dump: $PROD_DUMP_FILE
개발 owner: $DEV_OWNER_USER
Migration 실행: $RUN_MIGRATIONS
EOF
