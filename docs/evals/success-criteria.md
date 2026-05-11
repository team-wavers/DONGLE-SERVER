# Success Criteria

이 문서는 현재 기본 테스트가 지켜야 하는 성공 기준을 정리한다.

## 기록 원칙

- 여기에는 "무엇이 맞는 동작인가"만 적는다.
- 실행 명령, 우선순위, 보류 사유, 환경 제약은 다른 문서에 적는다.
- 테스트 파일 링크는 현재 기준을 보여주기 위한 참조이며, source of truth는 성공 조건 자체다.

## App

### 기본 응답

- 루트 컨트롤러는 앱의 기본 응답을 반환해야 한다.

관련 테스트:

- [app.controller.spec.ts](../../src/app.controller.spec.ts)

## Clubs

### 동아리 관리

- 동아리 목록, 단건 조회, 생성, 수정, 삭제 흐름은 service 계약을 유지해야 한다.
- 동아리 목록 조회는 삭제되지 않은 동아리만 반환해야 하며, 수정/삭제는 이미 삭제된 동아리를 거부해야 한다.
- controller는 service 결과와 예외를 의도한 HTTP 흐름으로 전달해야 한다.
- 동아리 이미지 업로드는 파일 누락과 허용되지 않은 MIME 타입을 거부하고, 허용된 이미지 파일만 S3 업로드와 service 갱신으로 전달해야 한다.

관련 테스트:

- [clubs.service.spec.ts](../../src/v1/clubs/clubs.service.spec.ts)
- [clubs.controller.spec.ts](../../src/v1/clubs/clubs.controller.spec.ts)

## Users

### 사용자 관리

- 최초 사용자 생성 허용 규칙과 이후 관리자 권한 요구 규칙을 유지해야 한다.
- 시스템 계정은 일반 목록/수정/삭제 흐름에서 보호되어야 한다.
- 사용자 중복, 역할, 식별자 조건은 service 계약대로 처리되어야 한다.

관련 테스트:

- [users.service.spec.ts](../../src/v1/users/users.service.spec.ts)
- [users.controller.spec.ts](../../src/v1/users/users.controller.spec.ts)

## Club Reports

### 활동보고서 관리

- 활동보고서 목록, 단건 조회, 생성, 수정, 삭제 흐름은 service 계약을 유지해야 한다.
- controller는 업로드 파일과 요청 payload를 service 계약에 맞게 전달해야 한다.
- 업로드 이미지는 `image/jpeg`, `image/png`, `image/webp`만 허용해야 한다.

관련 테스트:

- [club_reports.service.spec.ts](../../src/v1/club_reports/club_reports.service.spec.ts)
- [club_reports.controller.spec.ts](../../src/v1/club_reports/club_reports.controller.spec.ts)

## Main Banners

### 메인 배너 관리

- 메인 배너 생성은 `image_url`, `publish_start_at`, `publish_end_at`, `is_active` 필수값을 검증하고 저장 payload로 변환해야 한다.
- 메인 배너 생성과 수정은 선택 입력값인 `link_url`을 저장 payload로 전달해야 하며, 값이 없거나 공백이면 `null`로 정규화해야 한다.
- 메인 배너 수정은 삭제되지 않은 기존 배너만 갱신하고, 대상이 없으면 Bad Request로 거부해야 한다.
- 메인 배너 삭제는 삭제되지 않은 기존 배너만 soft delete 처리하고, 대상이 없으면 Bad Request로 거부해야 한다.
- 활성 목록 조회는 삭제되지 않고 `is_active`가 true이며 현재 시간이 공개 시작일과 종료일 사이에 있는 배너만 최신 공개 시작일 순으로 반환해야 한다.
- 날짜 입력은 날짜만 있는 값, 분/초 단위 날짜-시간, 명시적 timezone 값을 지원하고 timezone이 없으면 Seoul 기준으로 파싱해야 한다.
- 날짜 형식이 올바르지 않거나 공개 시작일이 종료일과 같거나 늦으면 Bad Request로 거부해야 한다.
- `is_active`는 boolean 타입만 허용해야 한다.

관련 테스트:

- [main_banners.service.spec.ts](../../src/v1/main_banners/main_banners.service.spec.ts)

### 메인 배너 이미지 업로드

- 이미지 업로드 controller는 `file` 누락을 Bad Request로 거부해야 한다.
- 이미지 업로드 controller는 `image/jpeg`, `image/png`, `image/webp`만 허용하고 그 외 MIME은 Bad Request로 거부해야 한다.
- 정상 이미지 업로드는 S3 업로드 결과를 `image_url` payload로 반환해야 한다.

관련 테스트:

- [main_banners.controller.spec.ts](../../src/v1/main_banners/main_banners.controller.spec.ts)

## Auth

### 로그인과 refresh token

- 로그인은 사용자 검증 실패 시 토큰을 생성하거나 refresh token을 저장하지 않고 거부해야 한다.
- 로그인 성공 시 access/refresh token을 생성하고 생성된 refresh token을 사용자 저장소에 저장해야 한다.
- refresh token 재발급은 만료/invalid token, 저장된 token 불일치, 사용자 없음 상태를 거부해야 한다.
- refresh token 재발급 성공 시 token rotation을 수행하고 새 refresh token을 사용자 저장소에 저장해야 한다.

관련 테스트:

- [auth.service.spec.ts](../../src/v1/auth/auth.service.spec.ts)

### JWT payload 검증

- JWT payload는 사용자 존재 여부와 `login_id`/`name`/`role` 일치 여부를 검증해야 한다.
- president payload의 `club_id`는 현재 관리 중인 동아리 ID와 일치해야 한다.
- president가 아닌 사용자의 payload에는 `club_id`가 포함되면 안 된다.
- 정상 payload는 인증 컨텍스트에서 사용할 사용자 식별 정보로 변환되어야 한다.

관련 테스트:

- [jwt.strategy.spec.ts](../../src/v1/auth/strategies/jwt.strategy.spec.ts)

## DTO Validation

### 전역 요청 payload 검증

- 앱 부트스트랩은 전역 `ValidationPipe`를 등록해 DTO 데코레이터 기반 런타임 검증을 수행해야 한다.
- 전역 검증은 DTO에 정의되지 않은 body 필드를 거부하고, 라우트/쿼리 primitive 값 변환을 허용해야 한다.
- `CreateClubDto`는 `key`, `name`, `category`를 필수 문자열로 받고, `sns`, `tags`, `is_recruiting`, `location`, `recruit_start`, `recruit_end`, `description`, `main_activities`, `president_id`는 선택 필드이되 선언된 런타임 타입을 지켜야 한다.
- `UpdateClubDto`는 `CreateClubDto`의 모든 필드를 선택 필드로 만들되 타입 규칙을 유지해야 한다.
- `CreateUserDto`는 `name`, `login_id`, `password`, `role`, `phone`을 필수 문자열로 받고, `refresh_token`은 선택 문자열로 받아야 한다.
- `UpdateUserDto`는 `CreateUserDto`의 모든 필드를 선택 필드로 만들되 타입 규칙을 유지해야 한다.
- `UpsertMainBannerDto`는 `image_url`, `publish_start_at`, `publish_end_at`을 필수 문자열로 받고 `is_active`를 필수 boolean으로 받아야 한다.
- auth 요청 DTO는 `LoginDto.login_id`, `LoginDto.password`, `RefreshTokenDto.refreshToken`, `VerifyTokenDto.token`을 필수 문자열로 받아야 한다.
- `CreateClubReportDto`는 route parameter에서 주입되는 `club_id`를 선택 number로 두고, `title`, `content`, `image_urls`를 각각 필수 문자열/문자열 배열로 검증해야 한다.
- DTO에는 persistence 전용 TypeORM column metadata를 두지 않고 entity에만 유지해야 한다.

관련 테스트:

- [dto-validation.spec.ts](../../src/v1/dto-validation.spec.ts)

## HTTP Lifecycle

### 앱 부트스트랩

- Nest 앱은 테스트 환경에서 정상 부팅되어 기본 HTTP 요청을 처리해야 한다.

관련 테스트:

- [app.e2e-spec.ts](../../test/app.e2e-spec.ts)
