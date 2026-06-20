import {
    BadRequestException,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import {
    extractHttpExceptionMessage,
    formatHttpExceptionDetail,
} from './extract-http-exception-detail';

describe('extractHttpExceptionMessage', () => {
    it('한글 string exception body를 그대로 반환한다', () => {
        const exception = new HttpException(
            '날짜 형식이 올바르지 않습니다.',
            HttpStatus.BAD_REQUEST,
        );

        expect(extractHttpExceptionMessage(exception)).toBe(
            '날짜 형식이 올바르지 않습니다.',
        );
    });

    it('message 배열 exception body를 공백으로 join한다', () => {
        const exception = new BadRequestException([
            'title은(는) 문자열이어야 합니다.',
            'unknown은(는) 허용되지 않은 필드입니다.',
        ]);

        expect(extractHttpExceptionMessage(exception)).toBe(
            'title은(는) 문자열이어야 합니다. unknown은(는) 허용되지 않은 필드입니다.',
        );
    });

    it('Nest 기본 generic 메시지는 상태별 사용자 메시지로 대체한다', () => {
        const exception = new BadRequestException();

        expect(extractHttpExceptionMessage(exception)).toBe(
            '잘못된 요청입니다.',
        );
    });

    it('message string object body를 반환한다', () => {
        const exception = new BadRequestException({
            message: '유효하지 않은 토큰입니다.',
            error: 'Bad Request',
            statusCode: 400,
        });

        expect(extractHttpExceptionMessage(exception)).toBe(
            '유효하지 않은 토큰입니다.',
        );
    });
});

describe('formatHttpExceptionDetail', () => {
    it('예외 클래스, 상태코드, 원본 response를 문자열로 반환한다', () => {
        const exception = new BadRequestException({
            message: '유효하지 않은 토큰입니다.',
            error: 'Bad Request',
            statusCode: 400,
        });

        expect(formatHttpExceptionDetail(exception)).toBe(
            'BadRequestException: status=400; response={"message":"유효하지 않은 토큰입니다.","error":"Bad Request","statusCode":400}',
        );
    });
});
