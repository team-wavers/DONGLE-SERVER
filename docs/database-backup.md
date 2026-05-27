# 데이터베이스 백업 운영 가이드

이 문서는 Lightsail 인스턴스 로컬 PostgreSQL을 유지하면서 운영 데이터 손실 리스크를 줄이기 위한 백업과 복구 리허설 절차를 정리한다.

## 목표

- 운영 DB를 매일 `pg_dump --format custom`으로 백업한다.
- 백업 파일은 S3에 업로드하고 로컬 디스크에는 최근 파일만 남긴다.
- S3 보관 정책은 `daily` 7일, `weekly` 4주를 기준으로 한다.
- 월 1회 dev DB에 restore 리허설을 수행해 백업이 실제로 복구 가능한지 확인한다.

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

운영 서버에서 설정해야 하는 값:

```bash
export S3_BUCKET="your-backup-bucket"
export S3_PREFIX="dongle-server/postgres"
export AWS_PROFILE="your-profile"
```

`AWS_PROFILE`을 쓰지 않고 instance role 또는 환경변수 credential을 쓰는 경우 `AWS_PROFILE`은 비워둔다.
운영 서버에는 `pg_dump`와 AWS CLI가 설치되어 있어야 한다.

## Cron 설정

운영 서버에서 `crontab -e`로 아래 작업을 등록한다.

```cron
30 3 * * * mkdir -p /home/ec2-user/db-backups && cd /home/ec2-user/dongle.server.prod && S3_BUCKET=your-backup-bucket S3_PREFIX=dongle-server/postgres bash scripts/backup-prod-db.sh >> /home/ec2-user/db-backups/backup.log 2>&1
```

이 설정은 서버 로컬 시간 기준 매일 03:30에 실행된다. 서버 timezone이 UTC라면 원하는 KST 실행 시간에 맞춰 cron 시간을 조정한다.
cron은 스크립트를 실행하기 전에 로그 리다이렉션을 열므로, 로그 디렉터리인 `/home/ec2-user/db-backups`를 먼저 생성해야 한다.
`AWS_PROFILE`이 필요하면 cron 명령의 `bash` 앞에 `AWS_PROFILE=your-profile`을 같이 둔다.

초기 도입 후에는 아래 명령으로 수동 검증한다.

```bash
mkdir -p /home/ec2-user/db-backups
cd /home/ec2-user/dongle.server.prod
bash scripts/backup-prod-db.sh
FORCE_WEEKLY=true bash scripts/backup-prod-db.sh
```

## S3 Lifecycle

S3 bucket은 private으로 유지하고, 아래 prefix 기준으로 lifecycle rule을 설정한다.

| Prefix | Expiration |
| --- | --- |
| `dongle-server/postgres/daily/` | 7일 |
| `dongle-server/postgres/weekly/` | 28일 |

서버 credential에는 최소한 아래 권한만 부여한다.

- 해당 bucket/prefix에 대한 `s3:PutObject`
- 해당 bucket/prefix 확인용 `s3:ListBucket`

삭제는 S3 lifecycle이 처리하므로 서버 credential에 `s3:DeleteObject`는 기본적으로 필요하지 않다.

## Restore 리허설

월 1회 최신 weekly 백업을 dev DB에 복원해 백업이 실제로 사용 가능한지 확인한다. dev DB를 덮는 작업이므로 자동 cron에 넣지 않고 수동으로 실행한다.

기본 절차:

1. S3에서 최신 weekly dump를 dev 서버로 다운로드한다.
2. dev DB를 drop/create 한다.
3. `createdb --owner "$DEV_OWNER_USER"`와 `pg_restore --role "$DEV_OWNER_USER" --no-owner --no-acl`로 복원한다.
4. dev 앱 디렉터리에서 `NODE_ENV=development yarn migration:show`를 실행한다.
5. pending migration이 있으면 `NODE_ENV=development yarn migration:run`을 실행한다.
6. dev 앱을 reload하고 `/v1/healthCheck`를 확인한다.

운영 DB를 직접 dev DB로 복원하는 경우에는 [sync-prod-to-dev.sh](../scripts/sync-prod-to-dev.sh)를 사용한다. 이 스크립트도 같은 owner/migration 원칙을 따른다.

## 실패 대응

- `pg_dump` 실패: DB 이름, 접속 유저, PostgreSQL client 버전을 확인한다.
- S3 업로드 실패: AWS credential, bucket 이름, prefix 권한을 확인한다.
- restore 실패: dump 파일 무결성, `DEV_OWNER_USER`, `pg_restore --role` 권한을 확인한다.
- migration 실패: `.env.development`의 `DB_USERNAME`과 `DEV_OWNER_USER`가 같은지 확인한다.
