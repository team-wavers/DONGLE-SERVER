import { HttpException, HttpStatus } from '@nestjs/common';

export function parseSeoulDateTime(input: string): Date {
    const trimmed = input.trim();
    let normalized: string;

    const hasTimezone =
        /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(
            trimmed,
        );

    if (hasTimezone) {
        normalized = trimmed;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        normalized = `${trimmed}T00:00:00+09:00`;
    } else if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(trimmed)) {
        normalized = `${trimmed.replace(' ', 'T')}:00+09:00`;
    } else if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
        normalized = `${trimmed.replace(' ', 'T')}+09:00`;
    } else {
        throw new HttpException(
            '날짜 형식이 올바르지 않습니다.',
            HttpStatus.BAD_REQUEST,
        );
    }

    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
        throw new HttpException(
            '날짜 형식이 올바르지 않습니다.',
            HttpStatus.BAD_REQUEST,
        );
    }

    return date;
}

export function validateDateRange(
    startAt: Date,
    endAt: Date,
    message: string,
) {
    if (startAt >= endAt) {
        throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
}
