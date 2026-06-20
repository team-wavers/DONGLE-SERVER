import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { formatValidationErrors } from './format-validation-errors';

export const createValidationPipe = () =>
    new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
        exceptionFactory: (errors) =>
            new BadRequestException(formatValidationErrors(errors)),
    });
