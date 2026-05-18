import { HttpStatus } from '@nestjs/common';
import { parseSeoulDateTime, validateDateRange } from './date-time';

const seoulDate = (value: string) => new Date(`${value}+09:00`);

describe('date-time helpers', () => {
    describe('parseSeoulDateTime', () => {
        it.each([
            ['date only', '2026-05-01', seoulDate('2026-05-01T00:00:00')],
            [
                'space separated minute precision',
                '2026-05-01 09:30',
                seoulDate('2026-05-01T09:30:00'),
            ],
            [
                'space separated second precision',
                '2026-05-01 09:30:15',
                seoulDate('2026-05-01T09:30:15'),
            ],
            [
                'T separated minute precision',
                '2026-05-01T09:30',
                seoulDate('2026-05-01T09:30:00'),
            ],
            [
                'T separated second precision',
                '2026-05-01T09:30:15',
                seoulDate('2026-05-01T09:30:15'),
            ],
            [
                'explicit UTC timezone',
                '2026-05-01T00:00:00Z',
                new Date('2026-05-01T00:00:00Z'),
            ],
            [
                'explicit offset timezone',
                '2026-05-01T00:00:00-04:00',
                new Date('2026-05-01T00:00:00-04:00'),
            ],
        ])('%s input을 Date로 변환한다', (_case, input, expected) => {
            expect(parseSeoulDateTime(input)).toEqual(expected);
        });

        it('날짜 형식이 올바르지 않으면 Bad Request를 던진다', () => {
            expect(() => parseSeoulDateTime('invalid-date')).toThrow(
                expect.objectContaining({
                    status: HttpStatus.BAD_REQUEST,
                    message: '날짜 형식이 올바르지 않습니다.',
                }),
            );
        });
    });

    describe('validateDateRange', () => {
        it('시작일시가 종료일시보다 이전이면 통과한다', () => {
            expect(() =>
                validateDateRange(
                    new Date('2026-05-01T00:00:00Z'),
                    new Date('2026-05-02T00:00:00Z'),
                    '시작일시는 종료일시보다 이전이어야 합니다.',
                ),
            ).not.toThrow();
        });

        it('시작일시가 종료일시와 같거나 늦으면 Bad Request를 던진다', () => {
            expect(() =>
                validateDateRange(
                    new Date('2026-05-02T00:00:00Z'),
                    new Date('2026-05-02T00:00:00Z'),
                    '시작일시는 종료일시보다 이전이어야 합니다.',
                ),
            ).toThrow(
                expect.objectContaining({
                    status: HttpStatus.BAD_REQUEST,
                    message: '시작일시는 종료일시보다 이전이어야 합니다.',
                }),
            );
        });
    });
});
