import { HttpException, HttpStatus } from '@nestjs/common';

export const IMAGE_UPLOAD_MAX_FILE_SIZE = 10 * 1024 * 1024;

export const IMAGE_UPLOAD_INTERCEPTOR_OPTIONS = {
    limits: {
        fileSize: IMAGE_UPLOAD_MAX_FILE_SIZE,
    },
};

export const ALLOWED_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
] as const;

export function validateImageUploadFile(
    file?: Express.Multer.File,
): asserts file is Express.Multer.File {
    if (!file) {
        throw new HttpException('파일이 필요합니다.', HttpStatus.BAD_REQUEST);
    }

    if (
        !ALLOWED_IMAGE_MIME_TYPES.includes(
            file.mimetype as AllowedImageMimeType,
        )
    ) {
        throw new HttpException(
            '허용되지 않는 이미지 형식입니다. (jpg, png, webp)',
            HttpStatus.BAD_REQUEST,
        );
    }
}

type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];
