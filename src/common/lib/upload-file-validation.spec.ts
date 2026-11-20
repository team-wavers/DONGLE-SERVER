import { HttpException } from '@nestjs/common';
import { validateImageUploadFile } from './upload-file-validation';

const imageFile = (mimetype: string, buffer: Buffer): Express.Multer.File =>
    ({ mimetype, buffer }) as Express.Multer.File;

describe('validateImageUploadFile', () => {
    it.each([
        ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])],
        [
            'image/png',
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        ],
        [
            'image/webp',
            Buffer.from([
                0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45,
                0x42, 0x50,
            ]),
        ],
    ])('accepts %s when its content signature matches', (mimetype, buffer) => {
        expect(() =>
            validateImageUploadFile(imageFile(mimetype, buffer)),
        ).not.toThrow();
    });

    it.each([
        [
            'image/jpeg',
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        ],
        ['image/png', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])],
        ['image/webp', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])],
        ['image/png', Buffer.from('not an image')],
    ])(
        'rejects %s when its content signature does not match',
        (mimetype, buffer) => {
            expect(() =>
                validateImageUploadFile(imageFile(mimetype, buffer)),
            ).toThrow(HttpException);
        },
    );
});
