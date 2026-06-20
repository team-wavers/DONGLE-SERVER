import { HttpException, HttpStatus } from '@nestjs/common';

export function parseSeoulDateTime(input: string): Date {
    const trimmed = input.trim();
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    const dateTimeMatch =
        /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})?$/.exec(
            trimmed,
        );

    let normalized: string;

    if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        assertValidDateParts(year, month, day, '00', '00', '00');
        normalized = `${year}-${month}-${day}T00:00:00+09:00`;
    } else if (dateTimeMatch) {
        const [, year, month, day, hour, minute, second = '00', timezone] =
            dateTimeMatch;
        assertValidDateParts(year, month, day, hour, minute, second);
        normalized = `${year}-${month}-${day}T${hour}:${minute}:${second}${
            timezone ?? '+09:00'
        }`;
    } else {
        throwInvalidDateFormat();
    }

    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
        throwInvalidDateFormat();
    }

    return date;
}

function assertValidDateParts(
    yearInput: string,
    monthInput: string,
    dayInput: string,
    hourInput: string,
    minuteInput: string,
    secondInput: string,
) {
    const year = Number(yearInput);
    const month = Number(monthInput);
    const day = Number(dayInput);
    const hour = Number(hourInput);
    const minute = Number(minuteInput);
    const second = Number(secondInput);

    const date = new Date(Date.UTC(year, month - 1, day));
    const isValidDate =
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day;
    const isValidTime =
        hour >= 0 &&
        hour <= 23 &&
        minute >= 0 &&
        minute <= 59 &&
        second >= 0 &&
        second <= 59;

    if (!isValidDate || !isValidTime) {
        throwInvalidDateFormat();
    }
}

function throwInvalidDateFormat(): never {
    throw new HttpException(
        '날짜 형식이 올바르지 않습니다.',
        HttpStatus.BAD_REQUEST,
    );
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
