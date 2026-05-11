# Test Inventory

현재 기본 테스트와 E2E 잔존 범위를 정리한다.

## 기록 원칙

- 이 문서는 "무엇을 어떤 계층에서 검증 중인가"를 적는다.
- 왜 그렇게 판단했는지는 `roadmap.md`와 `known-gaps.md`에 남긴다.
- 기대 동작 자체는 `success-criteria.md`를 기준으로 본다.

## 기본 테스트

| 영역         | 파일                                                                                         | 검증 방식   | 비고                                               |
| ------------ | -------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------- |
| app          | [app.controller.spec.ts](../../src/app.controller.spec.ts)                                   | code-graded | 기본 컨트롤러 응답                                 |
| clubs        | [clubs.controller.spec.ts](../../src/v1/clubs/clubs.controller.spec.ts)                      | code-graded | 동아리 controller 계약, 이미지 업로드 validation   |
| clubs        | [clubs.service.spec.ts](../../src/v1/clubs/clubs.service.spec.ts)                            | code-graded | 동아리 service 계약, 삭제된 동아리 제외/거부       |
| users        | [users.service.spec.ts](../../src/v1/users/users.service.spec.ts)                            | code-graded | 사용자 service 계약                                |
| users        | [users.controller.spec.ts](../../src/v1/users/users.controller.spec.ts)                      | code-graded | 사용자 controller 계약                             |
| club reports | [club_reports.service.spec.ts](../../src/v1/club_reports/club_reports.service.spec.ts)       | code-graded | 활동보고서 service 계약                            |
| club reports | [club_reports.controller.spec.ts](../../src/v1/club_reports/club_reports.controller.spec.ts) | code-graded | 활동보고서 controller 계약                         |
| validation   | [dto-validation.spec.ts](../../src/v1/dto-validation.spec.ts)                                | code-graded | 요청 DTO 필수/선택/타입 런타임 validation 계약     |
| main banners | [main_banners.service.spec.ts](../../src/v1/main_banners/main_banners.service.spec.ts)       | code-graded | 메인 배너 service 생성/수정/삭제/관리자 목록/활성 목록/검증 계약 |
| main banners | [main_banners.controller.spec.ts](../../src/v1/main_banners/main_banners.controller.spec.ts) | code-graded | 메인 배너 조회 위임, 이미지 업로드 controller 계약 |
| auth         | [auth.service.spec.ts](../../src/v1/auth/auth.service.spec.ts)                               | code-graded | 로그인 실패/성공, refresh token 실패/rotation 계약 |
| auth         | [jwt.strategy.spec.ts](../../src/v1/auth/strategies/jwt.strategy.spec.ts)                    | code-graded | JWT payload 사용자 정보/club_id 검증 계약          |

## 잔존 E2E

| 영역 | 파일                                          | 현재 목적                                     | 상태 |
| ---- | --------------------------------------------- | --------------------------------------------- | ---- |
| app  | [app.e2e-spec.ts](../../test/app.e2e-spec.ts) | Nest 앱 부트스트랩과 기본 HTTP lifecycle 확인 | 유지 |
