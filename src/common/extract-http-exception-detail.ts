import { HttpException, HttpStatus } from '@nestjs/common';

type HttpExceptionResponse =
    | string
    | {
          error?: string;
          message?: string | string[];
          statusCode?: number;
      };

function joinDetailMessages(messages: string[]): string {
    return messages.join(' ');
}

const STATUS_USER_MESSAGES: Partial<Record<HttpStatus, string>> = {
    [HttpStatus.BAD_REQUEST]: '잘못된 요청입니다.',
    [HttpStatus.UNAUTHORIZED]: '인증이 필요합니다.',
    [HttpStatus.FORBIDDEN]: '권한이 없습니다.',
    [HttpStatus.NOT_FOUND]: '요청하신 리소스를 찾을 수 없습니다.',
    [HttpStatus.CONFLICT]: '요청이 충돌되었습니다.',
    [HttpStatus.INTERNAL_SERVER_ERROR]: '서버 내부 오류입니다.',
};

const GENERIC_EXCEPTION_MESSAGES = new Set([
    'Bad Request',
    'Bad Request Exception',
    'Unauthorized',
    'Forbidden',
    'Forbidden resource',
    'Not Found',
    'Internal Server Error',
]);

function statusUserMessage(status: number): string {
    return (
        STATUS_USER_MESSAGES[status as HttpStatus] ??
        '요청이 처리되지 않았습니다.'
    );
}

function extractResponseMessage(exception: HttpException): string {
    const response = exception.getResponse() as HttpExceptionResponse;

    if (typeof response === 'string') {
        return response;
    }

    if (response?.message !== undefined) {
        if (Array.isArray(response.message)) {
            return joinDetailMessages(
                response.message.map((message) => String(message)),
            );
        }

        return String(response.message);
    }

    return String(exception.message ?? exception);
}

export function extractHttpExceptionMessage(exception: HttpException): string {
    const message = extractResponseMessage(exception);

    if (!message || GENERIC_EXCEPTION_MESSAGES.has(message)) {
        return statusUserMessage(exception.getStatus());
    }

    return message;
}

export function formatHttpExceptionDetail(exception: HttpException): string {
    const response = exception.getResponse();
    const responseText =
        typeof response === 'string' ? response : JSON.stringify(response);

    return `${exception.constructor.name}: status=${exception.getStatus()}; response=${responseText}`;
}
