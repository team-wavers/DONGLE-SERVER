import { ValidationError } from 'class-validator';

const BUILTIN_MESSAGE_PATTERNS: Partial<Record<string, RegExp>> = {
    isString: /must be a string/i,
    isNumber: /must be a number/i,
    isBoolean: /must be a boolean/i,
    isBooleanString: /must be a boolean string/i,
    isArray: /must be an array/i,
    isDate: /must be a Date/i,
    isObject: /must be an object/i,
    isIn: /must be one of the following values/i,
    maxLength: /must be shorter than or equal to|must be at most/i,
    whitelistValidation: /should not exist/i,
    isNotEmpty: /should not be empty/i,
};

const CONSTRAINT_TEMPLATES: Partial<
    Record<string, (field: string, constraints?: string[]) => string>
> = {
    isString: (field) => `${field}은(는) 문자열이어야 합니다.`,
    isNumber: (field) => `${field}은(는) 숫자여야 합니다.`,
    isBoolean: (field) => `${field}은(는) true 또는 false여야 합니다.`,
    isBooleanString: (field) =>
        `${field}은(는) true 또는 false 문자열이어야 합니다.`,
    isArray: (field) => `${field}은(는) 배열이어야 합니다.`,
    isDate: (field) => `${field}은(는) 날짜 형식이어야 합니다.`,
    isObject: (field) => `${field}은(는) 객체여야 합니다.`,
    isIn: (field) => `${field} 값이 올바르지 않습니다.`,
    maxLength: (field, constraints) =>
        `${field}은(는) ${constraints?.[0] ?? ''}자 이하여야 합니다.`,
    whitelistValidation: (field) =>
        `${field}은(는) 허용되지 않은 필드입니다.`,
    isNotEmpty: (field) => `${field}은(는) 필수입니다.`,
};

function isBuiltInValidationMessage(
    constraintKey: string,
    message: string,
): boolean {
    const pattern = BUILTIN_MESSAGE_PATTERNS[constraintKey];
    return pattern ? pattern.test(message) : false;
}

function parseMaxLengthLimit(message: string): string | undefined {
    const match =
        message.match(/equal to (\d+) characters?/i) ??
        message.match(/at most (\d+) characters?/i);

    return match?.[1];
}

function formatConstraintMessage(
    field: string,
    constraintKey: string,
    message: string,
    constraintValues?: string[],
): string {
    if (!isBuiltInValidationMessage(constraintKey, message)) {
        return message;
    }

    const parsedMaxLength =
        constraintKey === 'maxLength' && !constraintValues?.length
            ? parseMaxLengthLimit(message)
            : undefined;
    const resolvedConstraintValues =
        parsedMaxLength !== undefined ? [parsedMaxLength] : constraintValues;

    const template = CONSTRAINT_TEMPLATES[constraintKey];
    if (template) {
        return template(field, resolvedConstraintValues);
    }

    return `${field} 값이 올바르지 않습니다.`;
}

function getConstraintValues(
    error: ValidationError,
    constraintKey: string,
): string[] | undefined {
    const context = error.contexts?.[constraintKey];
    if (context?.constraint === undefined) {
        return undefined;
    }

    return Array.isArray(context.constraint)
        ? context.constraint.map(String)
        : [String(context.constraint)];
}

function collectValidationMessages(
    errors: ValidationError[],
    parentPath = '',
): string[] {
    return errors.flatMap((error) => {
        const field = parentPath
            ? `${parentPath}.${error.property}`
            : error.property;
        const messages: string[] = [];

        if (error.constraints) {
            for (const [constraintKey, message] of Object.entries(
                error.constraints,
            )) {
                messages.push(
                    formatConstraintMessage(
                        field,
                        constraintKey,
                        message,
                        getConstraintValues(error, constraintKey),
                    ),
                );
            }
        }

        if (error.children?.length) {
            messages.push(...collectValidationMessages(error.children, field));
        }

        return messages;
    });
}

export function formatValidationErrors(errors: ValidationError[]): string[] {
    return collectValidationMessages(errors);
}
