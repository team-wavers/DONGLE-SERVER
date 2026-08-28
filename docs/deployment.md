# 백엔드 배포 가이드

이 프로젝트는 GitHub Actions에서 빌드한 산출물을 Lightsail 서버로 전송한 뒤, PM2로 재기동하는 방식으로 배포합니다.

## 브랜치와 서버 경로

- `develop` -> `/home/ec2-user/dongle.server.dev`
- `main` -> `/home/ec2-user/dongle.server.prod`

## GitHub Actions 워크플로우

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-dev.yml`
- `.github/workflows/deploy-prod.yml`

`ci.yml`은 PR 단계에서 아래 순서로 동작합니다.

1. 의존성 설치
2. `yarn build`
3. `yarn lint:check`
4. `yarn test --runInBand`
5. `yarn migration:check`

개발 배포 워크플로우는 아래 순서로 동작합니다.

1. 의존성 설치
2. `yarn verify:fast`
3. `yarn build`
4. `yarn migration:check`
5. `dist`, `package.json`, `yarn.lock`, PM2 설정 파일 압축
6. GitHub Environment 시크릿 `ENV_FILE`로 `.env.development` 렌더링
7. `.env.sample` 기준 필수 키 존재 여부 검증
8. 원격 서버에 env 파일 업로드 (임시 파일로 전송 후 원자적 교체, 기존 파일은 `.bak`으로 보관)
9. Lightsail로 릴리즈 업로드
10. 서버에서 압축 해제
11. `yarn install --frozen-lockfile --production=true`
12. `NODE_ENV=development yarn migration:show`
13. `NODE_ENV=development yarn migration:run`
14. `pm2 startOrReload ... --update-env`
15. 내부 헬스체크 확인
16. 외부 헬스체크 확인

운영 배포 워크플로우는 아래 순서로 동작합니다.

1. `verify:fast` job에서 의존성 설치
2. `verify:fast` job에서 배포 산출물 생성 전 `yarn verify:fast`
3. migration 검증 job에서 의존성 설치
4. migration 검증 job에서 `yarn build`
5. migration 검증 job에서 `yarn migration:check`
6. 배포 job에서 의존성 설치
7. 배포 job에서 `yarn build`
8. `dist`, `package.json`, `yarn.lock`, PM2 설정 파일 압축
9. GitHub Environment 시크릿 `ENV_FILE`로 `.env.production` 렌더링
10. `.env.sample` 기준 필수 키 존재 여부 검증
11. 원격 서버에 env 파일 업로드 (임시 파일로 전송 후 원자적 교체, 기존 파일은 `.bak`으로 보관)
12. Lightsail로 릴리즈 업로드
13. 서버에서 압축 해제
14. `yarn install --frozen-lockfile --production=true`
15. `NODE_ENV=production yarn migration:show`
16. `NODE_ENV=production yarn migration:run`
17. `pm2 startOrReload ... --update-env`
18. 내부 헬스체크 확인
19. 외부 헬스체크 확인

운영 배포에서는 `verify:fast` job이 `verify:docs`, `type`, `test`를 필수 gate로 실행합니다. migration 검증은 별도 job으로 분리하되, TypeORM 설정이 빌드 산출물의 `dist/database/data-source.js`를 사용하므로 반드시 `yarn build` 이후 `yarn migration:check` 순서로 실행합니다. 개발 배포도 같은 이유로 `yarn build` 이후 `yarn migration:check`를 실행합니다.

운영 배포는 GitHub Environment `production` 승인 후 진행됩니다. 저장소 설정에서 `Settings > Environments > production`을 만들고 `Required reviewers`를 지정해야 합니다.

수동 실행(`workflow_dispatch`)도 브랜치 정책을 따릅니다.

- 개발 배포는 `develop` ref에서만 실행됩니다.
- 운영 배포는 `main` ref에서만 실행됩니다.

## GitHub Secrets

저장소 레벨 필수값:

- `LIGHTSAIL_HOST`
- `LIGHTSAIL_USER`
- `LIGHTSAIL_SSH_KEY`
- `DEV_EXTERNAL_HEALTHCHECK_URL`
- `PROD_EXTERNAL_HEALTHCHECK_URL`

GitHub Environment(`development`, `production`)별 필수값:

- `ENV_FILE`: 해당 환경의 `.env.development`/`.env.production` 전체 내용 (`.env.sample`과 같은 `KEY=VALUE` 형식, 멀티라인). `Settings > Environments`에서 `development`, `production` 두 Environment를 만들고 각각에 등록합니다.

프론트에서 쓰던 `LIGHTSAIL_HOST`, `LIGHTSAIL_SSH_KEY`는 그대로 재사용해도 됩니다.
백엔드에서는 SSH 접속용 사용자 계정인 `LIGHTSAIL_USER`를 추가로 두는 것을 권장합니다.

## 서버에 미리 준비할 것

### 1. 런타임 설치

- Node.js 22
- Yarn
- PM2
- curl

예시:

```bash
nvm install 22
nvm alias default 22
npm install -g yarn pm2
```

### 2. 디렉토리 생성

```bash
mkdir -p /home/ec2-user/dongle.server.dev
mkdir -p /home/ec2-user/dongle.server.prod
```

### 3. 환경변수 파일 배치

`.env.development`, `.env.production`은 서버에서 수동으로 만들지 않습니다. 배포 워크플로우가 매 배포마다 GitHub Environment 시크릿 `ENV_FILE`(개발: `development` Environment, 운영: `production` Environment)의 내용을 그대로 서버의 `.env.development`/`.env.production`에 렌더링합니다.

- `ENV_FILE`은 `.env.sample`과 같은 `KEY=VALUE` 형식으로, 실제 값을 채운 파일 전체 내용입니다.
- 업로드 전에 `.env.sample`에 정의된 모든 키가 `ENV_FILE`에 값과 함께 있는지 CI가 자동으로 검증합니다. 하나라도 비어 있거나 빠지면 배포가 실패하고 서버 파일은 건드리지 않습니다.
- 서버 반영은 임시 파일(`.new`)로 전송 후 원자적으로 교체하며, 교체 전 기존 파일은 `.bak`으로 보관합니다. 배포가 실패해 롤백되면 `.bak`도 함께 복원됩니다.

**새 환경변수를 추가할 때**는 아래 두 가지만 갱신하면 됩니다. 워크플로우 파일(`deploy-dev.yml`/`deploy-prod.yml`)은 고칠 필요가 없습니다.

1. `.env.sample`에 새 키를 추가한다 (필수 키 검증의 기준이 됨).
2. GitHub `development`/`production` Environment의 `ENV_FILE` 시크릿에 실제 값을 채워 추가한다.

**최초 도입 시 주의**: `ENV_FILE` 시크릿을 Environment에 먼저 등록한 뒤에 이 워크플로우를 실행해야 합니다. 등록 전에 배포가 돌면 필수 키 검증 단계에서 실패해서 서버 파일까지는 안 건드리지만, 마이그레이션을 만들거나 값을 급하게 채워 넣다가 기존에 서버에 있던 값과 다르게 등록하면 검증은 통과한 채로 잘못된 값이 서버에 올라갈 수 있으므로, 최초 적용 전에 서버의 기존 값과 `ENV_FILE` 내용을 한 번 대조해보는 것을 권장합니다.

## PM2 설정

- 개발: `ecosystem.dev.config.js`
- 운영: `ecosystem.prod.config.js`

운영 서버는 포트 `5000`, 개발 서버는 포트 `5001`을 사용하도록 맞춰두는 것을 권장합니다.

최초 실행 예시:

```bash
cd /home/ec2-user/dongle.server.prod
pm2 start ecosystem.prod.config.js --update-env
pm2 save
pm2 startup
```

## 헬스체크

배포 완료 후 아래 경로가 200 응답을 반환해야 합니다.

- 개발: `http://127.0.0.1:5001/v1/healthCheck`
- 운영: `http://127.0.0.1:5000/v1/healthCheck`

외부 도메인에서는 Nginx를 통해 API 도메인으로 프록시하는 구성을 권장합니다.

개발 배포 워크플로우는 내부 헬스체크 성공 후 `DEV_EXTERNAL_HEALTHCHECK_URL`로 전달된 외부 URL도 최대 15회 재시도하며 확인합니다.
운영 배포 워크플로우는 내부 헬스체크 성공 후 `PROD_EXTERNAL_HEALTHCHECK_URL`로 전달된 외부 URL도 최대 15회 재시도하며 확인합니다.

## 운영 DB를 개발 DB로 복원

`scripts/sync-prod-to-dev.sh`는 `postgres` 같은 관리자 계정으로 운영 DB dump를 만들고, 개발 DB를 삭제 후 재생성한 뒤 복원합니다. 개발 앱과 migration이 사용하는 DB 유저는 `DEV_OWNER_USER`로 두고, 개발 DB와 복원된 객체 owner를 이 유저 기준으로 맞춥니다.

`PG_HOST="localhost"`처럼 TCP 접속을 사용하는 환경에서 PostgreSQL이 `md5` 또는 `scram-sha-256` password auth를 요구하면 cron이나 비대화형 shell은 비밀번호 프롬프트에 응답할 수 없습니다. 실행 환경에는 아래 중 하나를 먼저 설정합니다.

- `export PGPASSWORD="운영 DB 비밀번호"`
- `export PGPASSFILE="/home/ec2-user/.pgpass"` 후 해당 파일을 `chmod 600`으로 제한

비밀번호 없는 peer/local socket 인증을 쓰는 서버가 아니라면 이 설정 없이 `pg_dump`, `dropdb`, `createdb`, `pg_restore` 단계가 실패합니다.

복원된 개발 DB는 운영 DB의 `migrations` 이력과 스키마를 그대로 가져오므로, 현재 개발 앱 코드가 더 최신 스키마를 요구하면 개발 endpoint가 실패할 수 있습니다. 이 스크립트는 기본값으로 복원, owner 정리, 선택적 정리 SQL 실행 후 개발 앱 디렉터리에서 아래 명령을 실행합니다.

```bash
NODE_ENV=development yarn migration:show
NODE_ENV=development yarn migration:run
```

운영 DB 상태를 그대로 비교해야 하는 예외 상황에서는 스크립트 상단의 `RUN_MIGRATIONS="false"`로 바꾼 뒤 실행합니다.
sync 후 migration이 권한 문제로 실패하면 `.env.development`의 `DB_USERNAME`과 `DEV_OWNER_USER`가 같은지, `postgres` 계정이 `createdb --owner`와 `pg_restore --role`을 실행할 권한이 있는지 먼저 확인합니다.

## 운영 DB 백업

로컬 PostgreSQL을 유지하는 동안에는 [데이터베이스 백업 운영 가이드](database-backup.md)에 따라 매일 S3 백업을 생성합니다. 기본 운영 기준은 `daily` 7일, `weekly` 12주 보관, 실패 알림, 월 1회 dev restore 리허설입니다. 서버 재구축과 장애 대응 절차도 같은 운영 가이드에 기록합니다.

## 주의사항

- `.env.production`, `.env.development`는 저장소에 커밋하지 않습니다.
- 운영 비밀값은 GitHub Environment(`development`/`production`)의 `ENV_FILE` 시크릿으로 관리합니다. 값을 바꿀 때는 서버 파일을 직접 고치지 말고 `ENV_FILE` 시크릿을 갱신 기준으로 삼습니다 (다음 배포 때 덮어써지므로).
- 배포 워크플로우는 업로드 전 `.env.sample` 기준으로 필수 키 존재 여부를 검증하고, 서버 파일은 임시 파일 경유 원자적 교체 + `.bak` 백업으로 갱신합니다. 배포가 실패해 롤백되면 이전 env 파일도 함께 복원됩니다.
- 개발 배포 워크플로우는 배포 전에 `yarn verify:fast`와 `yarn migration:check`를 실행합니다.
- 운영 배포 워크플로우는 배포 산출물 생성 전에 `yarn verify:fast`를 필수 gate로 실행하며, `verify:docs`, `type`, `test`를 통과해야 배포 job이 시작됩니다.
- 운영 migration 검증은 별도 job에서 수행하고, `yarn build` 이후 `yarn migration:check` 순서를 유지합니다.
- DB 설정은 `synchronize: false`입니다. 스키마 변경은 TypeORM migration으로 추가하고, 배포 중 앱 재시작 전에 실행합니다.
- 운영 DB를 개발 DB로 복원한 뒤 개발 endpoint를 현재 개발 코드 기준으로 동작시킬 때도 TypeORM migration을 실행합니다.
- 운영 배포 승인 전에 migration 내용을 확인하세요. `down` migration은 롤백 보조용이며, 운영 데이터가 있는 컬럼 삭제는 별도 판단이 필요합니다.
