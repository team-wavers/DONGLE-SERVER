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

배포 워크플로우는 아래 순서로 동작합니다.

1. 의존성 설치
2. 개발 배포는 `yarn verify:fast`
3. `yarn build`
4. `dist`, `package.json`, `yarn.lock`, PM2 설정 파일 압축
5. Lightsail로 업로드
6. 서버에서 압축 해제
7. `yarn install --frozen-lockfile --production=true`
8. `NODE_ENV=<environment> yarn migration:run`
9. `pm2 startOrReload ... --update-env`
10. 헬스체크 확인

운영 배포는 GitHub Environment `production` 승인 후 진행됩니다. 저장소 설정에서 `Settings > Environments > production`을 만들고 `Required reviewers`를 지정해야 합니다.

수동 실행(`workflow_dispatch`)도 브랜치 정책을 따릅니다.

- 개발 배포는 `develop` ref에서만 실행됩니다.
- 운영 배포는 `main` ref에서만 실행됩니다.

## GitHub Secrets

필수값:

- `LIGHTSAIL_HOST`
- `LIGHTSAIL_USER`
- `LIGHTSAIL_SSH_KEY`

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

개발 서버:

```bash
cd /home/ec2-user/dongle.server.dev
vi .env.development
```

운영 서버:

```bash
cd /home/ec2-user/dongle.server.prod
vi .env.production
```

앱은 `NODE_ENV`에 따라 [`src/app.module.ts`](/Users/bigsheep/Desktop/projects/DONGLE-SERVER/src/app.module.ts#L17) 에서 `.env.${NODE_ENV}` 파일을 읽습니다.

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

## 주의사항

- `.env.production`, `.env.development`는 저장소에 커밋하지 않습니다.
- 운영 비밀값은 GitHub Secrets보다 서버 내 환경파일로 관리하는 편이 안전합니다.
- 개발 배포 워크플로우는 배포 전에 `yarn verify:fast`를 실행합니다.
- 운영 배포 워크플로우는 현재 배포 우선을 위해 `lint`, `test` 단계를 제외한 상태입니다.
- DB 설정은 `synchronize: false`입니다. 스키마 변경은 TypeORM migration으로 추가하고, 배포 중 앱 재시작 전에 실행합니다.
- 운영 배포 승인 전에 migration 내용을 확인하세요. `down` migration은 롤백 보조용이며, 운영 데이터가 있는 컬럼 삭제는 별도 판단이 필요합니다.
