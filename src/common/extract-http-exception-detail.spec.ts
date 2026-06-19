import {
    BadRequestException,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { extractHttpExceptionDetail } from './extract-http-exception-detail';

describe('extractHttpExceptionDetail', () => {
    it('한글 string exception body를 그대로 반환한다', () => {
        const exception = new HttpException(
            '날짜 형식이 올바르지 않습니다.',
            HttpStatus.BAD_REQUEST,
        );

        expect(extractHttpExceptionDetail(exception)).toBe(
            '날짜 형식이 올바르지 않습니다.',
        );
    });

    it('message 배열 exception body를 공백으로 join한다', () => {
        const exception = new BadRequestException([
            'title은(는) 문자열이어야 합니다.',
            'unknown은(는) 허용되지 않은 필드입니다.',
        ]);

        expect(extractHttpExceptionDetail(exception)).toBe(
            'title은(는) 문자열이어야 합니다. unknown은(는) 허용되지 않은 필드입니다.',
        );
    });

    it('legacy 영문 message 배열을 그대로 join한다', () => {
        const exception = new BadRequestException({
            message: ['property unknown should not exist'],
            error: 'Bad Request',
            statusCode: 400,
        });

        expect(extractHttpExceptionDetail(exception)).toBe(
            'property unknown should not exist',
        );
    });

    it('message string object body를 반환한다', () => {
        const exception = new BadRequestException({
            message: '유효하지 않은 토큰입니다.',
            error: 'Bad Request',
            statusCode: 400,
        });

        expect(extractHttpExceptionDetail(exception)).toBe(
            '유효하지 않은 토큰입니다.',
        );
    });
});
