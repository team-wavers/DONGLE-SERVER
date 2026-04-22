# Harness Roadmap

이 문서는 하네스 자체를 정비할 때 참고하는 설계 문서다.

## 현재 상태

- 운영 계약은 `AGENTS.md`와 `docs/evals/*`에 둔다.
- 문서 계약 검증은 `yarn verify:docs`가 담당한다.
- 기본 검증 진입점은 `yarn verify:fast`다.

## 보류 항목

- DB fixture 기반 통합 테스트 하네스
- S3 mock 서버 하네스
- 테스트 데이터 seed/cleanup 자동화
- 평가 결과 리포트 포맷 표준화

## 원칙

- 하네스 설계 문서는 작업 중 에이전트가 매번 읽는 운영 계약에 포함하지 않는다.
- 운영 계약 변경은 `docs/evals/*`를 먼저 갱신한다.
- 하네스 확장은 실제 회귀를 줄이는 근거가 생겼을 때 진행한다.
