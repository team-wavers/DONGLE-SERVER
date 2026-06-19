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

# 백업 알림 설정입니다. webhook을 설정하지 않으면 알림을 보내지 않습니다.
BACKUP_NOTIFY_WEBHOOK_URL="${BACKUP_NOTIFY_WEBHOOK_URL:-}"
BACKUP_NOTIFY_PAYLOAD_KEY="${BACKUP_NOTIFY_PAYLOAD_KEY:-text}"
BACKUP_NOTIFY_ON_SUCCESS="${BACKUP_NOTIFY_ON_SUCCESS:-false}"
BACKUP_ALERT_NAME="${BACKUP_ALERT_NAME:-DONGLE PostgreSQL backup}"

# weekly 백업은 기본적으로 일요일에 생성합니다. 수동 검증 시 FORCE_WEEKLY=true로 실행하세요.
WEEKLY_DAY="${WEEKLY_DAY:-0}"
FORCE_WEEKLY="${FORCE_WEEKLY:-false}"

started_at_epoch="$(date +%s)"
current_step="initializing"
dump_file=""
daily_uri=""
weekly_uri=""
weekly_executed="false"

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

json_escape() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  value="${value//$'\r'/\\r}"
  value="${value//$'\t'/\\t}"
  printf '%s' "$value"
}

notify_backup() {
  local status="$1"
  local exit_code="$2"

  if [[ -z "$BACKUP_NOTIFY_WEBHOOK_URL" ]]; then
    return
  fi

  if [[ "$status" == "success" && "$BACKUP_NOTIFY_ON_SUCCESS" != "true" ]]; then
    return
  fi

  local payload_key="$BACKUP_NOTIFY_PAYLOAD_KEY"
  if [[ "$payload_key" != "text" && "$payload_key" != "content" ]]; then
    payload_key="text"
  fi

  local finished_at_epoch
  finished_at_epoch="$(date +%s)"
  local duration_seconds=$((finished_at_epoch - started_at_epoch))
  local host_name
  host_name="$(hostname 2>/dev/null || echo "unknown-host")"
  local message

  message="[$BACKUP_ALERT_NAME] $status
host: $host_name
db: $PROD_DB
step: $current_step
exit_code: $exit_code
duration_seconds: $duration_seconds
local_backup: ${dump_file:-not-created}
daily_s3: ${daily_uri:-not-uploaded}
weekly_executed: $weekly_executed
weekly_s3: ${weekly_uri:-not-uploaded}"

  local escaped_message
  escaped_message="$(json_escape "$message")"

  curl \
    --fail \
    --silent \
    --show-error \
    --request POST \
    --header "Content-Type: application/json" \
    --data "{\"$payload_key\":\"$escaped_message\"}" \
    "$BACKUP_NOTIFY_WEBHOOK_URL" >/dev/null 2>&1 || true
}

on_exit() {
  local exit_code="$1"

  if [[ "$exit_code" -eq 0 ]]; then
    notify_backup "success" "$exit_code"
  else
    notify_backup "failed" "$exit_code"
  fi
}

trap 'on_exit "$?"' EXIT

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
if [[ -n "$BACKUP_NOTIFY_WEBHOOK_URL" ]]; then
  require_command curl
fi

mkdir -p "$LOCAL_BACKUP_DIR"

timestamp="$(date +%Y%m%d_%H%M%S)"
date_key="$(date +%Y-%m-%d)"
week_key="$(date +%G-W%V)"
day_of_week="$(date +%w)"
dump_file="$LOCAL_BACKUP_DIR/${PROD_DB}_${timestamp}.dump"
daily_uri="s3://$S3_BUCKET/$S3_PREFIX/daily/$date_key/${PROD_DB}_${timestamp}.dump"
weekly_uri="s3://$S3_BUCKET/$S3_PREFIX/weekly/$week_key/${PROD_DB}_${timestamp}.dump"

echo "운영 DB 백업을 생성합니다..."
current_step="dump"
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
current_step="upload-daily"
upload_to_s3 "$dump_file" "$daily_uri"

if [[ "$FORCE_WEEKLY" == "true" || "$day_of_week" == "$WEEKLY_DAY" ]]; then
  echo "weekly 백업을 S3에 업로드합니다..."
  current_step="upload-weekly"
  upload_to_s3 "$dump_file" "$weekly_uri"
  weekly_executed="true"
else
  echo "weekly 백업일이 아니므로 weekly 업로드를 건너뜁니다."
fi

echo "로컬 백업 파일을 정리합니다..."
current_step="cleanup-local"
find "$LOCAL_BACKUP_DIR" -type f -name "${PROD_DB}_*.dump" -mtime +2 -delete
current_step="completed"

cat <<EOF
완료했습니다.

로컬 백업: $dump_file
daily S3: $daily_uri
weekly 실행: $([[ "$FORCE_WEEKLY" == "true" || "$day_of_week" == "$WEEKLY_DAY" ]] && echo "true" || echo "false")
EOF
