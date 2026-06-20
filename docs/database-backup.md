# 데이터베이스 백업 운영 가이드

이 문서는 Lightsail 인스턴스 로컬 PostgreSQL을 유지하면서 운영 데이터 손실 리스크를 줄이기 위한 현재 백업 정책, 점검, 장애 대응 절차를 정리한다.

## 목표

- 운영 DB를 매일 `pg_dump --format custom`으로 백업한다.
- 백업 파일은 S3에 업로드하고 로컬 디스크에는 최근 파일만 남긴다.
- S3 보관 정책은 `daily` 7일, `weekly` 12주를 기준으로 한다.
- 백업 실패는 webhook 알림으로 당일 인지할 수 있게 한다.
- 월 1회 dev DB에 restore 리허설을 수행해 백업이 실제로 복구 가능한지 확인한다.

## 현재 운영 기준

- RPO: 최대 24시간. 마지막 daily 백업 이후 데이터는 손실될 수 있다.
- RTO: 수동 복구 기준. 새 DB 준비, dump 다운로드, `pg_restore`, migration 확인, 앱 reload 시간이 필요하다.
- PITR/WAL 백업은 현재 범위에 없다. 특정 시점 복구가 필요해지면 managed DB 또는 WAL archive 전략을 별도로 도입한다.
- 운영 서버 경로: `/home/ec2-user/dongle.server.prod`
- 백업 환경파일: `/home/ec2-user/dongle-backup.env`
- 로컬 백업 디렉터리: `/home/ec2-user/db-backups/prod`
- cron 로그: `/home/ec2-user/db-backups/backup.log`

## 백업 스크립트

운영 서버에서 아래 스크립트를 사용한다.

```bash
bash /home/ec2-user/dongle.server.prod/scripts/backup-prod-db.sh
```

스크립트는 기본값으로 아래 흐름을 수행한다.

1. `pg_dump --format custom --no-owner --no-acl`로 운영 DB dump를 생성한다.
2. `s3://$S3_BUCKET/$S3_PREFIX/daily/YYYY-MM-DD/`에 업로드한다.
3. 일요일 또는 `FORCE_WEEKLY=true`일 때 `weekly/YYYY-WW/`에도 업로드한다.
4. 로컬 백업 디렉터리에서 2일보다 오래된 dump 파일을 삭제한다.

운영 서버에서는 `/home/ec2-user/dongle-backup.env`에 백업 환경변수를 둔다.

```bash
PG_HOST=""
PG_PORT=""
PG_USER=""
PROD_DB=""
LOCAL_BACKUP_DIR=""
S3_BUCKET=""
S3_PREFIX=""
BACKUP_NOTIFY_WEBHOOK_URL=""
BACKUP_NOTIFY_PAYLOAD_KEY=""
BACKUP_NOTIFY_ON_SUCCESS=""
BACKUP_ALERT_NAME=""
```

PostgreSQL이 password auth를 요구하면 `PGPASSWORD`를 환경파일에 두거나, `chmod 600` 된 `.pgpass` 또는 `PGPASSFILE`을 서버에 둔다. cron은 비밀번호 프롬프트에 응답할 수 없다.
`AWS_PROFILE`을 쓰지 않고 `aws configure` 기본 credential 또는 환경변수 credential을 쓰는 경우 `AWS_PROFILE`은 비워둔다.
`BACKUP_NOTIFY_WEBHOOK_URL`을 비워두면 알림을 보내지 않는다.
운영 서버에는 `pg_dump`와 AWS CLI가 설치되어 있어야 한다. 알림을 사용하는 경우 `curl`도 필요하다.

알림 관련 선택값:

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `BACKUP_NOTIFY_WEBHOOK_URL` | 빈 값 | 실패 알림을 받을 webhook URL |
| `BACKUP_NOTIFY_PAYLOAD_KEY` | `text` | webhook payload key. Discord는 `content`를 사용한다. |
| `BACKUP_NOTIFY_ON_SUCCESS` | `false` | `true`이면 성공 알림도 보낸다. |
| `BACKUP_ALERT_NAME` | `DONGLE PostgreSQL backup` | 알림 제목 |

## Cron 설정

운영 서버에서 `crontab -e`로 아래 작업을 등록한다.

```cron
30 3 * * * mkdir -p /home/ec2-user/db-backups/prod && cd /home/ec2-user/dongle.server.prod && set -a && . /home/ec2-user/dongle-backup.env && set +a && bash scripts/backup-prod-db.sh >> /home/ec2-user/db-backups/backup.log 2>&1
```

이 설정은 서버 로컬 시간 기준 매일 03:30에 실행된다. 서버 timezone이 UTC라면 원하는 KST 실행 시간에 맞춰 cron 시간을 조정한다.
cron은 스크립트를 실행하기 전에 로그 리다이렉션을 열므로, 로그 디렉터리인 `/home/ec2-user/db-backups`를 먼저 생성해야 한다.

수동 검증:

```bash
cd /home/ec2-user/dongle.server.prod
set -a && . /home/ec2-user/dongle-backup.env && set +a
bash scripts/backup-prod-db.sh
FORCE_WEEKLY=true bash scripts/backup-prod-db.sh
aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" --recursive
tail -n 100 /home/ec2-user/db-backups/backup.log
```

## S3 Lifecycle

S3 bucket은 private으로 유지하고, 아래 prefix 기준으로 lifecycle rule을 설정한다.

| Prefix | Expiration |
| --- | --- |
| `$S3_PREFIX/daily/` | 7일 |
| `$S3_PREFIX/weekly/` | 84일 |

서버 credential에는 최소한 아래 권한만 부여한다.

- 해당 bucket/prefix에 대한 `s3:PutObject`
- restore 리허설을 같은 credential로 수행한다면 해당 bucket/prefix에 대한 `s3:GetObject`
- 해당 bucket/prefix 확인용 `s3:ListBucket`

백업 업로드 credential과 restore 다운로드 credential을 분리한다면 업로드 credential에는 `s3:GetObject`를 주지 않아도 된다.
삭제는 S3 lifecycle이 처리하므로 서버 credential에 `s3:DeleteObject`는 기본적으로 필요하지 않다.
bucket versioning은 켜 둔다. S3 Object Lock은 bucket 생성 시에만 켤 수 있으므로, 삭제/변조 방지가 필요한 운영 환경이면 처음 bucket을 만들 때 governance mode를 검토한다.

## Restore 리허설

월 1회 최신 weekly 백업을 dev DB에 복원해 백업이 실제로 사용 가능한지 확인한다. dev DB를 덮는 작업이므로 자동 cron에 넣지 않고 수동으로 실행한다.

기본 절차:

1. S3에서 최신 weekly dump를 dev 서버로 다운로드한다.
2. dev DB를 drop/create 한다.
3. `createdb --owner "$DEV_OWNER_USER"`와 `pg_restore --role "$DEV_OWNER_USER" --no-owner --no-acl`로 복원한다.
4. dev 앱 디렉터리에서 `NODE_ENV=development yarn migration:show`를 실행한다.
5. pending migration이 있으면 `NODE_ENV=development yarn migration:run`을 실행한다.
6. dev 앱을 reload하고 `http://127.0.0.1:5001/v1/healthCheck`를 확인한다.

운영 DB를 직접 dev DB로 복원하는 경우에는 [sync-prod-to-dev.sh](../scripts/sync-prod-to-dev.sh)를 사용한다. 이 스크립트도 같은 owner/migration 원칙을 따른다.

리허설 후에는 아래 항목을 운영 기록에 남긴다.

- 실행일
- 사용한 S3 object URI
- dump 파일 크기
- `pg_restore` 성공 여부
- migration 확인 결과
- `http://127.0.0.1:5001/v1/healthCheck` 확인 결과
- 발견한 문제와 조치

## 서버 재구축 체크리스트

운영 서버를 새로 만들거나 백업 작업을 다른 서버로 옮길 때는 아래 항목만 확인한다.

1. `pg_dump`, AWS CLI, `curl`이 설치되어 있고 `pg_dump` major version이 운영 PostgreSQL 서버 버전 이상인지 확인한다.
2. `/home/ec2-user/dongle.server.prod`에 배포된 코드와 `scripts/backup-prod-db.sh`가 있는지 확인한다.
3. `/home/ec2-user/dongle-backup.env`를 만들고 `chmod 600`으로 보호한다.
4. PostgreSQL 접속 인증이 password auth이면 `PGPASSWORD`, `.pgpass`, `PGPASSFILE` 중 하나를 cron에서도 읽을 수 있게 설정한다.
5. `aws configure` 또는 환경변수 credential로 `s3:PutObject`, `s3:ListBucket`, restore 리허설용 `s3:GetObject` 권한을 확인한다.
6. `set -a && . /home/ec2-user/dongle-backup.env && set +a` 후 `bash scripts/backup-prod-db.sh`와 `FORCE_WEEKLY=true bash scripts/backup-prod-db.sh`를 수동 실행한다.
7. S3 `daily/`, `weekly/` prefix에 새 object가 생겼는지 확인한 뒤 cron을 등록한다.
8. 다음 실행일에 `backup.log`와 S3 object 생성 시각을 확인한다.

## 장애 시 백업과 복구

장애가 발생했지만 운영 DB가 아직 접속 가능하면 복구 작업 전에 현재 상태 dump를 먼저 남긴다. 이 dump는 장애 원인 분석이나 마지막 상태 보존용이며, 정상 백업을 대체하지 않는다.

```bash
cd /home/ec2-user/dongle.server.prod
set -a && . /home/ec2-user/dongle-backup.env && set +a
FORCE_WEEKLY=true bash scripts/backup-prod-db.sh
aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" --recursive | tail
```

운영 DB가 접속 불가능하거나 dump를 만들 수 없으면 S3의 최신 `daily` 또는 `weekly` object를 기준으로 복구한다. 가능하면 `weekly`보다 최신 `daily`를 우선 확인한다.

```bash
set -a && . /home/ec2-user/dongle-backup.env && set +a
aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/daily/" --recursive
aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/weekly/" --recursive
aws s3 cp "s3://$S3_BUCKET/$S3_PREFIX/daily/YYYY-MM-DD/${PROD_DB}_YYYYMMDD_HHMMSS.dump" /home/ec2-user/db-backups/restore-prod.dump
```

새 운영 DB를 준비한 뒤 owner와 migration 원칙을 맞춰 복원한다. 아래 명령은 대상 DB를 비우므로 운영 DB 이름과 접속 대상을 다시 확인한 뒤 실행한다.

```bash
set -a && . /home/ec2-user/dongle-backup.env && set +a
export PROD_OWNER_USER=""

dropdb --if-exists "$PROD_DB"
createdb --owner "$PROD_OWNER_USER" "$PROD_DB"

pg_restore \
  --role "$PROD_OWNER_USER" \
  --no-owner \
  --no-acl \
  --dbname "$PROD_DB" \
  /home/ec2-user/db-backups/restore-prod.dump

cd /home/ec2-user/dongle.server.prod
NODE_ENV=production yarn migration:show
NODE_ENV=production yarn migration:run
pm2 reload dongle.server.prod --update-env
curl -s http://127.0.0.1:5000/v1/healthCheck
```

복구 후에는 사용한 S3 URI, dump 시각, restore 결과, migration 결과, 앱 health check 결과를 운영 기록에 남긴다.

## 실패 대응

- `pg_dump` 실패: DB 이름, 접속 유저, PostgreSQL client 버전, password auth 전달 방식(`PGPASSWORD`, `.pgpass`, `PGPASSFILE`)을 확인한다.
- S3 업로드 실패: AWS credential, bucket 이름, prefix 권한을 확인한다.
- restore 실패: dump 파일 무결성, 대상 DB owner 변수, `pg_restore --role` 권한을 확인한다.
- migration 실패: 대상 앱 환경파일의 DB 유저와 복원된 DB owner가 같은지 확인한다.
