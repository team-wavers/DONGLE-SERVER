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

    if (!Buffer.isBuffer(file.buffer) || !matchesImageSignature(file)) {
        throw new HttpException(
            '이미지 내용과 형식이 일치하지 않습니다.',
            HttpStatus.BAD_REQUEST,
        );
    }
}

type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

function matchesImageSignature(file: Express.Multer.File): boolean {
    const buffer = file.buffer;

    switch (file.mimetype as AllowedImageMimeType) {
        case 'image/jpeg':
            return (
                buffer.length >= 3 &&
                buffer[0] === 0xff &&
                buffer[1] === 0xd8 &&
                buffer[2] === 0xff
            );
        case 'image/png':
            return (
                buffer.length >= 8 &&
                buffer.subarray(0, 8).equals(
                    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
                )
            );
        case 'image/webp':
            return (
                buffer.length >= 12 &&
                buffer.subarray(0, 4).equals(Buffer.from('RIFF', 'ascii')) &&
                buffer.subarray(8, 12).equals(Buffer.from('WEBP', 'ascii'))
            );
    }
}
