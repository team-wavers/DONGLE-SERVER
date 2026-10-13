import { BadRequestException } from '@nestjs/common';
import { normalizeKoreanPhone } from './normalize-korean-phone';

describe('normalizeKoreanPhone', () => {
    it.each([
        ['01012345678', '010-1234-5678'],
        ['010-1234-5678', '010-1234-5678'],
        ['010 1234 5678', '010-1234-5678'],
        ['0111234567', '011-123-4567'],
        ['011-123-4567', '011-123-4567'],
    ])('%s를 %s로 정규화한다', (input, expected) => {
        expect(normalizeKoreanPhone(input)).toBe(expected);
    });

    it.each(['010123456', '010123456789', '02012345678', '010.1234.5678', ''])(
        '%s는 거부한다',
        (input) => {
            expect(() => normalizeKoreanPhone(input)).toThrow(
                new BadRequestException('올바른 휴대폰 번호 형식이 아닙니다.'),
            );
        },
    );
});
