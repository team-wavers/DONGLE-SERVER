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
                if (err instanceof HttpException) {
                    const status = err.getStatus();
                    const body = err.getResponse();
                    const error =
                        typeof body === 'string'
                            ? { message: body }
                            : (body as object);
                    throw new HttpException(
                        { isSuccess: false, error },
                        status,
                    );
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
