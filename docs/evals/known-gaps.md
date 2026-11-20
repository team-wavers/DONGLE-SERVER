# Known Gaps

현재 테스트 체계에서 아직 충분히 옮기지 못한 영역을 정리한다.

## 이 문서에 적는 것

- 이미 필요성을 인지했지만 아직 `test`로 옮기지 못한 공백
- 바로 E2E로 만들지 않고 보류 중인 항목
- 테스트 불가 사유가 남아 있는 영역

## 이 문서에 적지 않는 것

- 이미 완료한 작업
- 현재 기본 명령이나 환경 설정 자체의 설명
- 장기 구조 개편 단계

## 우선순위 높은 공백

- 공개 최근 활동의 `DISTINCT ON`, 전체 최신 네 건 제한, soft delete 필터는 실행 SQL 계약과 mapper 단위 테스트로 확인한다. 실행 가능한 로컬 PostgreSQL이 없어 실제 DB 결과와 쿼리 계획은 아직 검증하지 못했다. 배포 DB와 분리된 전용 fixture 연결을 사용할 수 있으면 실제 SQL 결과 검증을 재검토한다. 운영 DB 조회나 새 E2E 인프라 확장은 이번 범위에 포함하지 않는다.

- JWT strategy의 비활성/삭제 사용자 처리
- S3 업로드 helper의 key 생성 및 실패 응답 mapping (공통 MIME/signature 검증은 `upload-file-validation.spec.ts`에서 검사)
- TypeORM entity와 DTO 사이 payload mapping 규칙
- DB 제약과 service validation이 겹치는 중복/무결성 에러 처리

## 의도적으로 남긴 E2E

- Nest 앱 부트스트랩
- 전역 pipe/interceptor/filter가 같이 동작해야 드러나는 HTTP lifecycle
- 실제 DB 또는 외부 스토리지가 필요한 연결 검증

## 지금 하지 않는 것

- E2E를 늘리기 위한 하네스 확장
- stateful DB fixture 인프라 확대
- 외부 S3를 직접 호출하는 통합 테스트 추가

## 재검토 조건

- 기본 테스트만으로 회귀를 잡기 어렵다는 사례가 반복될 때
- CI에서 인증/DB 연결 검증 누락이 잦아질 때
- 실제 HTTP lifecycle 문제를 `test`만으로 재현하기 어려운 영역이 늘어날 때

## 기록 규칙

- `test`로 옮길 수 없는 이유가 있으면 이 문서에 남긴다.
- "나중에 보자" 수준의 막연한 메모는 남기지 않는다.
- 왜 `test`로 안 되는지, 무엇이 E2E 후보인지, 재검토 조건이 무엇인지 같이 적는다.
