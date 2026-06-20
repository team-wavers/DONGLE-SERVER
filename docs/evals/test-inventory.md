# Test Inventory

현재 기본 테스트와 E2E 잔존 범위를 정리한다.

## 기록 원칙

- 이 문서는 "무엇을 어떤 계층에서 검증 중인가"를 적는다.
- 왜 그렇게 판단했는지는 `roadmap.md`와 `known-gaps.md`에 남긴다.
- 기대 동작 자체는 `success-criteria.md`를 기준으로 본다.

## 기본 테스트

| 영역           | 파일                                                                                               | 검증 방식   | 비고                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------- |
| app            | [app.controller.spec.ts](../../src/app.controller.spec.ts)                                         | code-graded | 기본 컨트롤러 응답                                                     |
| common helpers | [date-time.spec.ts](../../src/common/lib/date-time.spec.ts)                                        | code-graded | Seoul 기준 날짜 파싱, 명시적 timezone 처리, 날짜 범위 검증             |
| common helpers | [format-validation-errors.spec.ts](../../src/common/format-validation-errors.spec.ts)              | code-graded | ValidationError 한글 메시지 변환, nested field, 커스텀 message override |
| common helpers | [extract-http-exception-detail.spec.ts](../../src/common/extract-http-exception-detail.spec.ts)  | code-graded | HttpException response body에서 사용자용 message와 개발자용 detail 문자열 추출 |
| common response | [response.interceptor.spec.ts](../../src/common/response.interceptor.spec.ts)                    | code-graded | 에러 응답 envelope의 message/detail 분리 계약                          |
| clubs          | [clubs.controller.spec.ts](../../src/v1/clubs/clubs.controller.spec.ts)                            | code-graded | 동아리 controller 계약, 활동보고서 단건 위임, 이미지 업로드 validation |
| clubs          | [clubs.service.spec.ts](../../src/v1/clubs/clubs.service.spec.ts)                                  | code-graded | 동아리 service 계약, 단건 Not Found, 삭제된 동아리 제외/거부           |
| users          | [users.service.spec.ts](../../src/v1/users/users.service.spec.ts)                                  | code-graded | 사용자 service 계약, 단건 Not Found                                    |
| users          | [users.controller.spec.ts](../../src/v1/users/users.controller.spec.ts)                            | code-graded | 사용자 controller 계약, 단건 위임                                      |
| club reports   | [club_reports.service.spec.ts](../../src/v1/club_reports/club_reports.service.spec.ts)             | code-graded | 활동보고서 service 계약, 동아리 하위 단건/수정/삭제 Not Found          |
| club reports   | [club_reports.controller.spec.ts](../../src/v1/club_reports/club_reports.controller.spec.ts)       | code-graded | 활동보고서 controller 계약                                             |
| club schedules | [club_schedules.service.spec.ts](../../src/v1/club_schedules/club_schedules.service.spec.ts)       | code-graded | 일정 service 생성/수정/공통 일정 생성/공개 조회/전체 공개 기간 조회/관리자 내용 수정/공개 상태 변경/삭제/필터/응답 매핑 계약 |
| club schedules | [club_schedules.controller.spec.ts](../../src/v1/club_schedules/club_schedules.controller.spec.ts) | code-graded | public/관리자 일정 controller 계약                                     |
| validation     | [dto-validation.spec.ts](../../src/v1/dto-validation.spec.ts)                                      | code-graded | 요청 DTO 필수/선택/타입 런타임 validation 계약; 400 message 한글화는 common helper spec 참조 |
| main banners   | [main_banners.service.spec.ts](../../src/v1/main_banners/main_banners.service.spec.ts)             | code-graded | 메인 배너 service 생성/수정/삭제/관리자 목록/활성 목록/검증 계약       |
| main banners   | [main_banners.controller.spec.ts](../../src/v1/main_banners/main_banners.controller.spec.ts)       | code-graded | 메인 배너 조회 위임, 이미지 업로드 controller 계약                     |
| auth           | [auth.service.spec.ts](../../src/v1/auth/auth.service.spec.ts)                                     | code-graded | 로그인 실패/성공, refresh token 실패/rotation 계약                     |
| auth           | [jwt.strategy.spec.ts](../../src/v1/auth/strategies/jwt.strategy.spec.ts)                          | code-graded | JWT payload 사용자 정보/club_id 검증 계약                              |

## 잔존 E2E

| 영역 | 파일                                          | 현재 목적                                     | 상태 |
| ---- | --------------------------------------------- | --------------------------------------------- | ---- |
| app  | [app.e2e-spec.ts](../../test/app.e2e-spec.ts) | Nest 앱 부트스트랩과 기본 HTTP lifecycle 확인 | 유지 |
