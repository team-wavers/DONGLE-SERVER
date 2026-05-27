# DONGLE-SERVER

DONGLE 서비스의 NestJS 기반 백엔드 API 서버입니다. 동아리, 사용자, 활동보고서, 메인 배너, 인증, 헬스체크 API를 제공하고 PostgreSQL, TypeORM migration, S3 업로드 연동을 사용합니다.

## 프로젝트 개요

- **런타임**: Node.js 22, NestJS 11, TypeScript
- **데이터베이스**: PostgreSQL + TypeORM (`synchronize: false`)
- **스토리지**: AWS S3 이미지 업로드
- **API prefix**: 주요 API는 `v1` 라우터 아래에 등록됩니다.

## 주요 모듈

- `users`: 사용자 생성, 조회, 수정, 삭제와 관리자/회장 권한 규칙을 담당합니다.
- `clubs`: 동아리 CRUD, 동아리 등록 URL 생성, 아이콘 업로드, 동아리별 활동보고서 흐름을 담당합니다.
- `club_reports`: 활동보고서 데이터의 생성, 조회, 수정, 삭제 계약을 담당합니다.
- `main_banners`: 메인 배너 조회와 관리자용 배너 생성, 수정, 삭제, 이미지 업로드를 담당합니다.
- `auth`: 로그인, access/refresh token 발급 및 검증, 로그아웃, JWT guard/strategy를 담당합니다.
- `health`: 배포와 운영 확인을 위한 `/v1/healthCheck` 응답을 제공합니다.

## 로컬 실행

### 1. 의존성 설치

```bash
yarn install
```

### 2. 환경변수 파일 준비

앱은 `NODE_ENV` 값에 따라 `.env.${NODE_ENV}` 파일을 읽습니다. 로컬 개발 기본 명령인 `yarn start:dev`는 `NODE_ENV=local`로 실행되므로, 저장소 루트에 `.env.local`을 준비합니다.

```bash
cp .env.sample .env.local
```

`.env.sample`에는 필요한 환경변수 키가 정리되어 있습니다. 실제 실행 전 `.env.local`의 빈 값을 로컬 DB, S3, JWT, CORS 설정에 맞게 채워야 합니다. 배포 환경에서는 같은 기준으로 `.env.development` 또는 `.env.production`을 서버에 배치하되, `.env.*` 파일은 저장소에 커밋하지 않습니다.

### 3. 개발 서버 실행

```bash
yarn start:dev
```

일반 시작 명령을 직접 사용할 때는 사용할 환경 파일 이름에 맞춰 `NODE_ENV`를 지정합니다.

```bash
NODE_ENV=local yarn start
```

## 검증

기본 검증 진입점은 `yarn verify:fast`입니다. 이 명령은 문서 계약 확인, 타입 검사, Jest 테스트를 순서대로 실행합니다.

```bash
yarn verify:fast
```

필요하면 하위 명령을 개별 실행할 수 있습니다.

```bash
yarn type
yarn test
yarn test:e2e
```

## Build와 migration

TypeORM CLI는 빌드 산출물의 `dist/database/data-source.js`를 기준으로 migration을 실행합니다. 따라서 migration 명령을 배포 산출물 또는 로컬 빌드 결과에 대해 확인할 때는 먼저 빌드합니다.

```bash
yarn build
yarn migration:check
```

migration 적용, 롤백, 상태 확인은 대상 환경의 `.env.${NODE_ENV}` 파일이 준비된 상태에서 실행합니다.

```bash
NODE_ENV=local yarn migration:show
NODE_ENV=local yarn migration:run
NODE_ENV=local yarn migration:revert
```

배포 전에는 `yarn build` 이후 `yarn migration:check` 순서로 migration 산출물과 설정을 확인한 뒤, 실제 대상 환경에서 `NODE_ENV=<environment> yarn migration:run`을 실행합니다.

## 참고 문서

- [초기 관리자 계정 생성](docs/bootstrap-admin.md)
- [배포 가이드](docs/deployment.md)
- [데이터베이스 백업 운영 가이드](docs/database-backup.md)
- [평가/검증 문서](docs/evals/README.md)
