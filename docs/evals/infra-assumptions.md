# Infra Assumptions

이 문서는 현재 평가 체계에서 기본 검증 경로와 E2E의 환경 가정을 분리해서 정리한다.

## 기본 경로

- 기본 검증은 `yarn verify:fast`다.
- `verify:fast`는 `verify:docs`, `type`, `Jest`를 포함한다.
- 따라서 기본 경로는 앱 서버 기동, 실제 DB 연결, 외부 스토리지 연결, 외부 네트워크 의존성을 요구하지 않아야 한다.

## 기본 경로 금지 규칙

기본 경로에서는 아래를 금지한다.

- 외부 네트워크 접근
- 실제 앱 서버 기동
- 실제 DB 연결
- 실제 S3 또는 외부 스토리지 호출
- 시간 지연에 의존하는 assertion
- 랜덤값에 의존하는 assertion
- 외부 API 호출

## 기본 경로 허용 범위

기본 경로에서는 아래만 기본 대상으로 본다.

- 로컬 파일 기준 문서 계약 검사
- 타입 검사
- Jest 기반 service/controller/strategy 단위 테스트
- deterministic helper / validation / formatter / parser / payload transform 검증

## 서버 런타임

- Node.js 22 계열을 기준으로 한다.
- Nest 앱은 E2E 또는 통합 검증에서 로컬 프로세스로 부팅할 수 있어야 한다.
- 환경변수는 `.env.*` 또는 테스트용 주입값으로 격리한다.

## 데이터베이스

- 실제 DB 연결이 필요한 테스트는 단위 테스트와 분리한다.
- 테스트 DB를 사용할 경우 운영 DB와 물리적으로 분리해야 한다.
- 스키마 변경 검증은 TypeORM migration 체계가 정리된 뒤 별도 전략으로 다룬다.

## 외부 스토리지

- S3 직접 호출은 기본 검증 경로에 넣지 않는다.
- 업로드 key 생성, MIME 처리, 실패 mapping은 가능한 한 helper/service test로 검증한다.
- 실제 권한 검증이 필요하면 전용 테스트 버킷 또는 mock 서버를 사용한다.

## 인증

- JWT secret과 토큰 만료 정책은 테스트 전용 값으로 고정한다.
- 인증 guard와 strategy의 단위 검증을 우선하고, 실제 HTTP 인증 연결만 E2E 후보로 둔다.

## 기본 경로와 E2E의 경계

- 기본 경로는 코드/로직 검증이다.
- E2E는 실제 연결 검증이다.
- 기본 경로에서 해결 가능한 문제를 E2E로 올리지 않는다.

## 실패 분류 기준

### `yarn verify:fast` 실패

- 우선 code/product 문제로 분류한다.
- 타입 오류, import 오류, test failure부터 먼저 해결한다.

### E2E 실패

- 앱 문제
- HTTP lifecycle 문제
- DB 연결 문제
- 환경 문제

위 항목 중 어디인지 나누기 전까지는 미분류 상태로 둔다.

## E2E 재도입 시 문서화할 항목

- CPU / RAM
- timeout
- startup command
- DB fixture 전략
- 외부 스토리지 의존성
- flake 분류 기준
- infra failure와 product failure의 구분 기준
