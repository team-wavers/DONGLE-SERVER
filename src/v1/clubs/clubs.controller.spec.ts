import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { S3Service } from '../../common/lib/s3-uploads';
import { ClubReportsService } from '../club_reports/club_reports.service';
import { ROLES } from '../auth/constants/roles';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';

describe('ClubsController', () => {
    let controller: ClubsController;
    let clubsService: {
        updateIconUrl: jest.Mock;
    };
    let s3Service: {
        upload: jest.Mock;
    };

    const presidentRequest = {
        user: {
            role: ROLES.PRESIDENT,
            club_id: 1,
        },
    };

    const imageFile = (mimetype = 'image/png'): Express.Multer.File =>
        ({
            buffer: Buffer.from('image'),
            mimetype,
        }) as Express.Multer.File;

    beforeEach(async () => {
        clubsService = {
            updateIconUrl: jest.fn(),
        };
        s3Service = {
            upload: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ClubsController],
            providers: [
                {
                    provide: ClubsService,
                    useValue: clubsService,
                },
                {
                    provide: ClubReportsService,
                    useValue: {},
                },
                {
                    provide: S3Service,
                    useValue: s3Service,
                },
            ],
        }).compile();

        controller = module.get<ClubsController>(ClubsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('uploadIcon', () => {
        it('throws bad request when file is missing', async () => {
            await expect(
                controller.uploadIcon(1, undefined, presidentRequest),
            ).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
            });
            expect(s3Service.upload).not.toHaveBeenCalled();
            expect(clubsService.updateIconUrl).not.toHaveBeenCalled();
        });

        it('throws bad request when MIME type is not allowed', async () => {
            await expect(
                controller.uploadIcon(
                    1,
                    imageFile('image/gif'),
                    presidentRequest,
                ),
            ).rejects.toBeInstanceOf(HttpException);
            expect(s3Service.upload).not.toHaveBeenCalled();
            expect(clubsService.updateIconUrl).not.toHaveBeenCalled();
        });

        it('uploads an allowed image and updates icon URL', async () => {
            s3Service.upload.mockResolvedValue('https://example.com/icon.png');
            clubsService.updateIconUrl.mockResolvedValue({
                id: 1,
                icon_url: 'https://example.com/icon.png',
            });
            const file = imageFile('image/webp');

            await expect(
                controller.uploadIcon(1, file, presidentRequest),
            ).resolves.toEqual({
                id: 1,
                icon_url: 'https://example.com/icon.png',
            });
            expect(s3Service.upload).toHaveBeenCalledWith(
                file.buffer,
                'club-icons',
                'image/webp',
            );
            expect(clubsService.updateIconUrl).toHaveBeenCalledWith(
                1,
                'https://example.com/icon.png',
            );
        });
    });

    describe('uploadReportImage', () => {
        it('throws bad request when file is missing', async () => {
            await expect(
                controller.uploadReportImage(1, undefined, presidentRequest),
            ).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
            });
            expect(s3Service.upload).not.toHaveBeenCalled();
        });

        it('throws bad request when MIME type is not allowed', async () => {
            await expect(
                controller.uploadReportImage(
                    1,
                    imageFile('application/pdf'),
                    presidentRequest,
                ),
            ).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
            });
            expect(s3Service.upload).not.toHaveBeenCalled();
        });

        it('uploads an allowed image and returns its URL', async () => {
            s3Service.upload.mockResolvedValue(
                'https://example.com/report.png',
            );
            const file = imageFile('image/jpeg');

            await expect(
                controller.uploadReportImage(1, file, presidentRequest),
            ).resolves.toBe('https://example.com/report.png');
            expect(s3Service.upload).toHaveBeenCalledWith(
                file.buffer,
                'club-reports',
                'image/jpeg',
            );
        });
    });
});
