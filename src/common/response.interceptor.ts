// src/interceptors/transform-response.interceptor.ts
import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    HttpException,
    HttpStatus,
    StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { extractHttpExceptionDetail } from './extract-http-exception-detail';

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
    intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
        const res = ctx.switchToHttp().getResponse<Response>();

        return next.handle().pipe(
            // 1) 성공 응답 포맷
            map((data) => {
                // 파일/스트림/원시 응답은 건너뜀
                if (res.headersSent || data instanceof StreamableFile)
                    return data;
                return { isSuccess: true, result: data ?? null };
            }),

            // 2) 에러 응답 포맷
            catchError((err) => {
                // 이미 HttpException인 경우: 상태코드 보존
                // fix code: message shoule be explain about status code, detail is error message
                if (err instanceof HttpException) {
                    const status = err.getStatus();

                    // 상태코드에 따른 기본 메시지
                    let message = '';
                    switch (status) {
                        case HttpStatus.BAD_REQUEST:
                            message = '잘못된 요청입니다.';
                            break;
                        case HttpStatus.UNAUTHORIZED:
                            message = '인증이 필요합니다.';
                            break;
                        case HttpStatus.FORBIDDEN:
                            message = '권한이 없습니다.';
                            break;
                        case HttpStatus.NOT_FOUND:
                            message = '요청하신 리소스를 찾을 수 없습니다.';
                            break;
                        case HttpStatus.CONFLICT:
                            message = '요청이 충돌되었습니다.';
                            break;
                        case HttpStatus.INTERNAL_SERVER_ERROR:
                            message = '서버 내부 오류입니다.';
                            break;
                        default:
                            message = '요청이 처리되지 않았습니다.';
                    }

                    const error = {
                        message,
                        detail: extractHttpExceptionDetail(err),
                        stack: process.env.NODE_ENV === 'production' ? undefined : err?.stack,
                    };

                    throw new HttpException({ isSuccess: false, error }, status);
                }

                // 알 수 없는 에러: 500
                const error =
                    process.env.NODE_ENV === 'production'
                        ? { message: 'Internal server error' }
                        : {
                              message: 'Internal server error',
                              detail: String(err?.message ?? err),
                              stack: err?.stack,
                          };
                throw new HttpException(
                    { isSuccess: false, error },
                    HttpStatus.INTERNAL_SERVER_ERROR,
                );
            }),
        );
    }
}
