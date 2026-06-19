import { HttpException } from '@nestjs/common';

type HttpExceptionResponse =
    | string
    | {
          message?: string | string[];
      };

function joinDetailMessages(messages: string[]): string {
    return messages.join(' ');
}

export function extractHttpExceptionDetail(exception: HttpException): string {
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
