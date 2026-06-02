# 데이터베이스 백업 최초 세팅 가이드

이 문서는 Lightsail 인스턴스 안에서 운영 PostgreSQL을 직접 실행하는 상황에서, S3 기반 백업 정책을 처음부터 세팅하는 절차를 정리한다.

## 성공 기준

- 매일 운영 DB dump가 S3 `daily/` prefix에 업로드된다.
- 일요일에는 같은 dump가 S3 `weekly/` prefix에도 업로드된다.
- 백업 실패 시 webhook 알림이 발송된다.
- S3 lifecycle이 `daily` 7일, `weekly` 84일 보관을 적용한다.
- 월 1회 dev DB restore 리허설을 수행할 수 있다.

## 1. 운영 값 확정

먼저 운영 환경 값을 확정한다.

| 항목 | 예시 | 비고 |
| --- | --- | --- |
| 운영 DB 이름 | `dongle_prod` | `PROD_DB` |
| PostgreSQL host | `localhost` | `PG_HOST` |
| PostgreSQL port | `5432` | `PG_PORT` |
| PostgreSQL 백업 유저 | `postgres` | `PG_USER` |
| S3 bucket | `dongle-prod-db-backups` | 전용 bucket 권장 |
| S3 prefix | `dongle-server/postgres` | 앱/환경별로 분리 |
| 실행 시각 | 매일 03:30 KST | 트래픽 낮은 시간 |
| 알림 webhook | Slack/Discord 등 | 실패 알림용 |

운영 DB 이름과 PostgreSQL 유저가 다르면 이후 명령의 환경변수 값을 바꾼다.

## 2. S3 bucket 생성

S3 bucket은 운영 백업 전용으로 만들고 public access를 차단한다.

AWS 콘솔에서 생성해도 되고, CLI를 쓴다면 예시는 아래와 같다.

```bash
aws s3api create-bucket \
  --bucket dongle-prod-db-backups \
  --region ap-northeast-2 \
  --create-bucket-configuration LocationConstraint=ap-northeast-2

aws s3api put-public-access-block \
  --bucket dongle-prod-db-backups \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-versioning \
  --bucket dongle-prod-db-backups \
  --versioning-configuration Status=Enabled
```

삭제/변조 방지가 중요한 환경이면 Object Lock을 검토한다. Object Lock은 bucket 생성 시점에만 활성화할 수 있으므로 나중에 켤 수 없다는 점을 먼저 결정한다.

## 3. S3 lifecycle 설정

`daily`는 7일, `weekly`는 84일 보관한다.

`/tmp/dongle-backup-lifecycle.json`을 만든다.

```json
{
  "Rules": [
    {
      "ID": "expire-daily-postgres-backups",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "dongle-server/postgres/daily/"
      },
      "Expiration": {
        "Days": 7
      },
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 7
      }
    },
    {
      "ID": "expire-weekly-postgres-backups",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "dongle-server/postgres/weekly/"
      },
      "Expiration": {
        "Days": 84
      },
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 84
      }
    }
  ]
}
```

적용한다.

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket dongle-prod-db-backups \
  --lifecycle-configuration file:///tmp/dongle-backup-lifecycle.json
```

## 4. 서버 권한 설정

가능하면 Lightsail 인스턴스에 IAM role을 연결해 장기 access key를 서버에 두지 않는다. access key를 써야 한다면 백업 전용 IAM user를 만들고 권한을 최소화한다.

예시 policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListBackupPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::dongle-prod-db-backups",
      "Condition": {
        "StringLike": {
          "s3:prefix": [
            "dongle-server/postgres/*"
          ]
        }
      }
    },
    {
      "Sid": "UploadBackupObjects",
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::dongle-prod-db-backups/dongle-server/postgres/*"
    }
  ]
}
```

서버 credential에는 기본적으로 `s3:DeleteObject`를 주지 않는다. 삭제는 S3 lifecycle이 처리한다.

## 5. 서버 패키지 확인

운영 서버에서 `pg_dump`, AWS CLI, `curl`이 있어야 한다.

```bash
pg_dump --version
aws --version
curl --version
```

없으면 서버 OS에 맞게 설치한다. `pg_dump`는 운영 PostgreSQL major version과 같거나 더 최신인 client를 사용한다.

## 6. 백업 환경파일 생성

cron에 비밀값을 길게 노출하지 않도록 root 또는 배포 유저만 읽을 수 있는 환경파일을 만든다.

```bash
cat > /home/ec2-user/dongle-backup.env <<'EOF'
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PROD_DB=dongle_prod
LOCAL_BACKUP_DIR=/home/ec2-user/db-backups/prod
S3_BUCKET=dongle-prod-db-backups
S3_PREFIX=dongle-server/postgres
BACKUP_NOTIFY_WEBHOOK_URL=https://example.com/webhook
BACKUP_NOTIFY_PAYLOAD_KEY=text
BACKUP_NOTIFY_ON_SUCCESS=false
BACKUP_ALERT_NAME=DONGLE PostgreSQL backup
EOF

chmod 600 /home/ec2-user/dongle-backup.env
mkdir -p /home/ec2-user/db-backups/prod
```

Discord webhook을 쓰는 경우 `BACKUP_NOTIFY_PAYLOAD_KEY=content`로 둔다.

## 7. 수동 백업 검증

운영 앱 디렉터리로 이동해 먼저 daily 백업을 수동 실행한다.

```bash
cd /home/ec2-user/dongle.server.prod
set -a
. /home/ec2-user/dongle-backup.env
set +a
bash scripts/backup-prod-db.sh
```

S3에 올라갔는지 확인한다.

```bash
aws s3 ls s3://dongle-prod-db-backups/dongle-server/postgres/daily/ --recursive
```

weekly 업로드도 강제로 검증한다.

```bash
cd /home/ec2-user/dongle.server.prod
set -a
. /home/ec2-user/dongle-backup.env
set +a
FORCE_WEEKLY=true bash scripts/backup-prod-db.sh

aws s3 ls s3://dongle-prod-db-backups/dongle-server/postgres/weekly/ --recursive
```

이 단계에서 실패하면 cron을 등록하지 말고 DB 접속, S3 권한, webhook URL을 먼저 고친다.

## 8. Cron 등록

`crontab -e`로 매일 03:30에 실행되도록 등록한다.

```cron
30 3 * * * mkdir -p /home/ec2-user/db-backups/prod && cd /home/ec2-user/dongle.server.prod && set -a && . /home/ec2-user/dongle-backup.env && set +a && bash scripts/backup-prod-db.sh >> /home/ec2-user/db-backups/backup.log 2>&1
```

서버 timezone이 UTC라면 KST 03:30은 전날 UTC 18:30이다. 서버 timezone을 확인하고 원하는 실행 시각에 맞춘다.

```bash
date
timedatectl 2>/dev/null || true
```

cron 등록 후 다음 날 아래를 확인한다.

```bash
tail -n 80 /home/ec2-user/db-backups/backup.log
aws s3 ls s3://dongle-prod-db-backups/dongle-server/postgres/daily/ --recursive
```

## 9. 실패 알림 테스트

실패 알림은 일부러 잘못된 bucket을 넣어 테스트한다.

```bash
cd /home/ec2-user/dongle.server.prod
set -a
. /home/ec2-user/dongle-backup.env
set +a
S3_BUCKET=missing-bucket-for-alert-test bash scripts/backup-prod-db.sh
```

webhook 채널에 `failed` 알림이 도착해야 한다. 테스트 후 실제 cron 환경파일의 bucket 값은 바꾸지 않는다.

성공 알림까지 받고 싶으면 환경파일에 아래 값을 둔다.

```bash
BACKUP_NOTIFY_ON_SUCCESS=true
```

## 10. 월 1회 Restore 리허설

restore 리허설은 dev DB를 덮어쓰는 작업이다. 운영 DB에는 절대 실행하지 않는다.

최신 weekly 백업을 찾는다.

```bash
aws s3 ls s3://dongle-prod-db-backups/dongle-server/postgres/weekly/ --recursive
```

dev 서버 또는 dev DB에 접근 가능한 서버에서 dump를 다운로드한다.

```bash
aws s3 cp \
  s3://dongle-prod-db-backups/dongle-server/postgres/weekly/YYYY-WW/dongle_prod_YYYYMMDD_HHMMSS.dump \
  /home/ec2-user/db-backups/restore-test.dump
```

dev DB를 재생성하고 복원한다.

```bash
export DEV_DB=dongle_dev
export DEV_OWNER_USER=dongle_dev_user

dropdb --if-exists "$DEV_DB"
createdb --owner "$DEV_OWNER_USER" "$DEV_DB"

pg_restore \
  --role "$DEV_OWNER_USER" \
  --no-owner \
  --no-acl \
  --dbname "$DEV_DB" \
  /home/ec2-user/db-backups/restore-test.dump
```

개발 앱 기준 migration 상태와 health check를 확인한다.

```bash
cd /home/ec2-user/dongle.server.dev
NODE_ENV=development yarn migration:show
NODE_ENV=development yarn migration:run

curl -s http://127.0.0.1:3000/v1/healthCheck
```

## 11. 리허설 기록

월 1회 아래 형식으로 운영 노트에 남긴다.

```md
## YYYY-MM-DD restore rehearsal

- 백업 URI:
- dump 크기:
- restore 대상 DB:
- pg_restore 결과:
- migration 확인 결과:
- health check 결과:
- 총 소요 시간:
- 발견한 문제:
- 후속 조치:
```

## 12. 운영 점검 체크리스트

- 매일 S3 `daily/`에 새 object가 생긴다.
- 매주 S3 `weekly/`에 새 object가 생긴다.
- `backup.log`에 실패가 누적되지 않는다.
- 실패 알림 webhook 채널이 유지된다.
- S3 lifecycle rule이 삭제를 담당한다.
- 월 1회 restore 리허설이 기록된다.
- 운영 DB 스키마 변경 전후로 백업이 정상 생성되는지 확인한다.
