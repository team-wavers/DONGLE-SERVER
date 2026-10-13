import { BadRequestException } from '@nestjs/common';

const INVALID_PHONE_MESSAGE = '올바른 휴대폰 번호 형식이 아닙니다.';

export function normalizeKoreanPhone(input: string): string {
    if (typeof input !== 'string') {
        throw new BadRequestException(INVALID_PHONE_MESSAGE);
    }

    const digits = input.replace(/[\s-]/g, '');
    if (!/^01[016789]\d{7,8}$/.test(digits)) {
        throw new BadRequestException(INVALID_PHONE_MESSAGE);
    }

    return digits.length === 10
        ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
        : `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
