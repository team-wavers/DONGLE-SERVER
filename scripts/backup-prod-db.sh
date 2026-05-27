#!/usr/bin/env bash
set -euo pipefail

# 서버 환경에 맞게 이 블록만 수정하세요.
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-postgres}"
PROD_DB="${PROD_DB:-dongle_prod}"
LOCAL_BACKUP_DIR="${LOCAL_BACKUP_DIR:-$HOME/db-backups/prod}"

# S3 설정입니다. 실제 bucket 이름과 credential은 서버 환경에서 관리하세요.
S3_BUCKET="${S3_BUCKET:-change_me_s3_bucket}"
S3_PREFIX="${S3_PREFIX:-dongle-server/postgres}"
AWS_PROFILE="${AWS_PROFILE:-}"

# weekly 백업은 기본적으로 일요일에 생성합니다. 수동 검증 시 FORCE_WEEKLY=true로 실행하세요.
WEEKLY_DAY="${WEEKLY_DAY:-0}"
FORCE_WEEKLY="${FORCE_WEEKLY:-false}"

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
    echo "$name 값을 먼저 설정하세요." >&2
    exit 1
  fi
}

aws_args=()
if [[ -n "$AWS_PROFILE" ]]; then
  aws_args+=(--profile "$AWS_PROFILE")
fi

upload_to_s3() {
  local source_file="$1"
  local target_uri="$2"

  aws "${aws_args[@]}" s3 cp "$source_file" "$target_uri"
}

require_configured_value "PROD_DB" "$PROD_DB"
require_configured_value "S3_BUCKET" "$S3_BUCKET"
require_configured_value "S3_PREFIX" "$S3_PREFIX"

require_command pg_dump
require_command aws
require_command find

mkdir -p "$LOCAL_BACKUP_DIR"

timestamp="$(date +%Y%m%d_%H%M%S)"
date_key="$(date +%Y-%m-%d)"
week_key="$(date +%G-W%V)"
day_of_week="$(date +%w)"
dump_file="$LOCAL_BACKUP_DIR/${PROD_DB}_${timestamp}.dump"
daily_uri="s3://$S3_BUCKET/$S3_PREFIX/daily/$date_key/${PROD_DB}_${timestamp}.dump"
weekly_uri="s3://$S3_BUCKET/$S3_PREFIX/weekly/$week_key/${PROD_DB}_${timestamp}.dump"

echo "운영 DB 백업을 생성합니다..."
pg_dump \
  --host "$PG_HOST" \
  --port "$PG_PORT" \
  --username "$PG_USER" \
  --format custom \
  --no-owner \
  --no-acl \
  --file "$dump_file" \
  "$PROD_DB"

echo "daily 백업을 S3에 업로드합니다..."
upload_to_s3 "$dump_file" "$daily_uri"

if [[ "$FORCE_WEEKLY" == "true" || "$day_of_week" == "$WEEKLY_DAY" ]]; then
  echo "weekly 백업을 S3에 업로드합니다..."
  upload_to_s3 "$dump_file" "$weekly_uri"
else
  echo "weekly 백업일이 아니므로 weekly 업로드를 건너뜁니다."
fi

echo "로컬 백업 파일을 정리합니다..."
find "$LOCAL_BACKUP_DIR" -type f -name "${PROD_DB}_*.dump" -mtime +2 -delete

cat <<EOF
완료했습니다.

로컬 백업: $dump_file
daily S3: $daily_uri
weekly 실행: $([[ "$FORCE_WEEKLY" == "true" || "$day_of_week" == "$WEEKLY_DAY" ]] && echo "true" || echo "false")
EOF
