import {
    BadRequestException,
    CallHandler,
    ExecutionContext,
    HttpStatus,
} from '@nestjs/common';
import { lastValueFrom, throwError } from 'rxjs';
import { TransformResponseInterceptor } from './response.interceptor';

const createContext = () =>
    ({
        switchToHttp: () => ({
            getResponse: () => ({
                headersSent: false,
            }),
        }),
    }) as ExecutionContext;

const createThrowingHandler = (error: unknown) =>
    ({
        handle: () => throwError(() => error),
    }) as CallHandler;

describe('TransformResponseInterceptor errors', () => {
    it('HttpException의 사용자용 문구를 message에, 진단 문자열을 detail에 담는다', async () => {
        const interceptor = new TransformResponseInterceptor();

        await expect(
            lastValueFrom(
                interceptor.intercept(
                    createContext(),
                    createThrowingHandler(
                        new BadRequestException([
                            'title은(는) 문자열이어야 합니다.',
                            'unknown은(는) 허용되지 않은 필드입니다.',
                        ]),
                    ),
                ),
            ),
        ).rejects.toMatchObject({
            response: {
                isSuccess: false,
                error: {
                    message:
                        'title은(는) 문자열이어야 합니다. unknown은(는) 허용되지 않은 필드입니다.',
                    detail: expect.stringContaining(
                        'BadRequestException: status=400',
                    ),
                },
            },
            status: HttpStatus.BAD_REQUEST,
        });
    });

    it('generic HttpException 메시지는 사용자용 상태 문구로 대체한다', async () => {
        const interceptor = new TransformResponseInterceptor();

        await expect(
            lastValueFrom(
                interceptor.intercept(
                    createContext(),
                    createThrowingHandler(new BadRequestException()),
                ),
            ),
        ).rejects.toMatchObject({
            response: {
                isSuccess: false,
                error: {
                    message: '잘못된 요청입니다.',
                    detail: expect.stringContaining(
                        'BadRequestException: status=400',
                    ),
                },
            },
            status: HttpStatus.BAD_REQUEST,
        });
    });

    it('알 수 없는 에러는 사용자용 500 문구와 문자열 detail로 감싼다', async () => {
        const interceptor = new TransformResponseInterceptor();

        await expect(
            lastValueFrom(
                interceptor.intercept(
                    createContext(),
                    createThrowingHandler(new Error('database failed')),
                ),
            ),
        ).rejects.toMatchObject({
            response: {
                isSuccess: false,
                error: {
                    message: '서버 내부 오류입니다.',
                    detail: 'database failed',
                },
            },
            status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
    });
});
