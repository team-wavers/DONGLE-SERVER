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
- controller는 service 결과와 예외를 의도한 HTTP 흐름으로 전달해야 한다.

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

관련 테스트:
- [club_reports.service.spec.ts](../../src/v1/club_reports/club_reports.service.spec.ts)
- [club_reports.controller.spec.ts](../../src/v1/club_reports/club_reports.controller.spec.ts)

## HTTP Lifecycle

### 앱 부트스트랩

- Nest 앱은 테스트 환경에서 정상 부팅되어 기본 HTTP 요청을 처리해야 한다.

관련 테스트:
- [app.e2e-spec.ts](../../test/app.e2e-spec.ts)
