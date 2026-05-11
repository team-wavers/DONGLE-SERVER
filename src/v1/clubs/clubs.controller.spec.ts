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
        findOne: jest.Mock;
        updateIconUrl: jest.Mock;
    };
    let clubReportsService: {
        findOneByClubId: jest.Mock;
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
            findOne: jest.fn(),
            updateIconUrl: jest.fn(),
        };
        clubReportsService = {
            findOneByClubId: jest.fn(),
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
                    useValue: clubReportsService,
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

    describe('findOne', () => {
        it('동아리 단건 조회를 service에 위임한다', async () => {
            const club = { id: 1, name: '동아리' };
            clubsService.findOne.mockResolvedValue(club);

            const result = await controller.findOne(1);

            expect(clubsService.findOne).toHaveBeenCalledWith(1);
            expect(result).toBe(club);
        });
    });

    describe('findReportById', () => {
        it('동아리 하위 활동보고서 단건 조회를 service에 위임한다', async () => {
            const report = { id: 7, club: { id: 1 } };
            clubReportsService.findOneByClubId.mockResolvedValue(report);

            const result = await controller.findReportById(1, 7);

            expect(clubReportsService.findOneByClubId).toHaveBeenCalledWith(
                1,
                7,
            );
            expect(result).toBe(report);
        });
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
