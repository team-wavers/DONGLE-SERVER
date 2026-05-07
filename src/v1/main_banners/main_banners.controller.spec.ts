import { HttpStatus } from '@nestjs/common';
import { S3Service } from '../../common/lib/s3-uploads';
import { MainBannersController } from './main_banners.controller';
import { MainBannersService } from './main_banners.service';

describe('MainBannersController', () => {
    let controller: MainBannersController;
    let s3Service: jest.Mocked<Pick<S3Service, 'upload'>>;

    beforeEach(() => {
        s3Service = {
            upload: jest.fn(),
        };

        controller = new MainBannersController(
            {} as MainBannersService,
            s3Service as unknown as S3Service,
        );
    });

    describe('uploadImage', () => {
        const file = (mimetype: string): Express.Multer.File =>
            ({
                buffer: Buffer.from('banner-image'),
                mimetype,
                originalname: 'banner.webp',
            }) as Express.Multer.File;

        it('file이 없으면 Bad Request를 던지고 S3를 호출하지 않는다', async () => {
            await expect(
                controller.uploadImage(
                    undefined as unknown as Express.Multer.File,
                ),
            ).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                message: '파일이 필요합니다.',
            });
            expect(s3Service.upload).not.toHaveBeenCalled();
        });

        it('허용되지 않는 MIME이면 Bad Request를 던지고 S3를 호출하지 않는다', async () => {
            await expect(
                controller.uploadImage(file('image/gif')),
            ).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                message: '허용되지 않는 이미지 형식입니다. (jpg, png, webp)',
            });
            expect(s3Service.upload).not.toHaveBeenCalled();
        });

        it.each(['image/jpeg', 'image/png', 'image/webp'])(
            '%s 이미지는 S3에 업로드하고 image_url payload를 반환한다',
            async (mimetype) => {
                s3Service.upload.mockResolvedValue(
                    `https://cdn.example.com/main-banners/${mimetype}`,
                );
                const uploadFile = file(mimetype);

                const result = await controller.uploadImage(uploadFile);

                expect(s3Service.upload).toHaveBeenCalledWith(
                    uploadFile.buffer,
                    'main-banners',
                    mimetype,
                );
                expect(result).toEqual({
                    image_url: `https://cdn.example.com/main-banners/${mimetype}`,
                });
            },
        );
    });
});
