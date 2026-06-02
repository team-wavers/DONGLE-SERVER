import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { S3Service } from '../../common/lib/s3-uploads';
import { ClubReportsService } from '../club_reports/club_reports.service';
import { ROLES } from '../auth/constants/roles';
import { ClubSchedulesService } from '../club_schedules/club_schedules.service';
import { CreateClubScheduleDto } from '../club_schedules/dto/create-club-schedule.dto';
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
        updateByClubId: jest.Mock;
        removeByClubId: jest.Mock;
    };
    let clubSchedulesService: {
        findPublicByClubId: jest.Mock;
        findAllByClubId: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        removeByClubId: jest.Mock;
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
            updateByClubId: jest.fn(),
            removeByClubId: jest.fn(),
        };
        clubSchedulesService = {
            findPublicByClubId: jest.fn(),
            findAllByClubId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            removeByClubId: jest.fn(),
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
                    provide: ClubSchedulesService,
                    useValue: clubSchedulesService,
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

    describe('club reports ownership', () => {
        it('활동보고서 수정은 route clubId와 reportId로 service에 위임한다', async () => {
            const dto = {
                club_id: 1,
                title: '수정된 제목',
                content: '수정된 본문',
                image_urls: ['https://example.com/image.png'],
            };
            clubReportsService.updateByClubId.mockResolvedValue({
                affected: 1,
            });

            const result = await controller.updateReport(
                1,
                7,
                dto,
                presidentRequest,
            );

            expect(clubReportsService.updateByClubId).toHaveBeenCalledWith(
                1,
                7,
                dto,
            );
            expect(result).toEqual({ affected: 1 });
        });

        it('활동보고서 삭제는 route clubId와 reportId로 service에 위임한다', async () => {
            clubReportsService.removeByClubId.mockResolvedValue({
                affected: 1,
            });

            const result = await controller.deleteReport(
                1,
                7,
                presidentRequest,
            );

            expect(clubReportsService.removeByClubId).toHaveBeenCalledWith(
                1,
                7,
            );
            expect(result).toEqual({ affected: 1 });
        });

        it('다른 동아리 활동보고서 수정은 Forbidden을 던진다', async () => {
            await expect(
                controller.updateReport(
                    2,
                    7,
                    {
                        club_id: 2,
                        title: '수정된 제목',
                        content: '수정된 본문',
                        image_urls: [],
                    },
                    presidentRequest,
                ),
            ).rejects.toMatchObject({
                status: HttpStatus.FORBIDDEN,
            });
            expect(clubReportsService.updateByClubId).not.toHaveBeenCalled();
        });
    });

    describe('schedules', () => {
        it('공개 일정 조회를 service에 위임한다', async () => {
            const schedules = [{ id: 1, is_public: true }];
            clubSchedulesService.findPublicByClubId.mockResolvedValue(
                schedules,
            );

            const result = await controller.findPublicSchedulesByClubId(1);

            expect(
                clubSchedulesService.findPublicByClubId,
            ).toHaveBeenCalledWith(1);
            expect(result).toBe(schedules);
        });

        it('회장용 일정 목록 조회는 본인 동아리만 허용하고 service에 위임한다', async () => {
            const query = { status: 'upcoming' as const };
            const schedules = [{ id: 1 }];
            clubSchedulesService.findAllByClubId.mockResolvedValue(schedules);

            const result = await controller.findSchedulesByClubId(
                1,
                query,
                presidentRequest,
            );

            expect(clubSchedulesService.findAllByClubId).toHaveBeenCalledWith(
                1,
                query,
            );
            expect(result).toBe(schedules);
        });

        it('회장용 일정 생성은 route clubId로 service에 위임한다', async () => {
            const dto: CreateClubScheduleDto = {
                title: '정기 모임',
                type: 'regular_meeting' as const,
                start_at: '2026-05-20 19:00:00',
                end_at: '2026-05-20 21:00:00',
                is_public: true,
            };
            clubSchedulesService.create.mockResolvedValue({ id: 1 });

            const result = await controller.createSchedule(
                1,
                dto,
                presidentRequest,
            );

            expect(clubSchedulesService.create).toHaveBeenCalledWith(1, dto);
            expect(result).toEqual({ id: 1 });
        });

        it('다른 동아리 일정 생성은 Forbidden을 던진다', async () => {
            await expect(
                controller.createSchedule(
                    2,
                    {
                        title: '정기 모임',
                        type: 'regular_meeting',
                        start_at: '2026-05-20 19:00:00',
                        end_at: '2026-05-20 21:00:00',
                        is_public: true,
                    },
                    presidentRequest,
                ),
            ).rejects.toMatchObject({
                status: HttpStatus.FORBIDDEN,
            });
            expect(clubSchedulesService.create).not.toHaveBeenCalled();
        });

        it('회장용 일정 수정과 삭제를 service에 위임한다', async () => {
            clubSchedulesService.update.mockResolvedValue({ id: 7 });
            clubSchedulesService.removeByClubId.mockResolvedValue({
                affected: 1,
            });

            await expect(
                controller.updateSchedule(
                    1,
                    7,
                    { title: '변경' },
                    presidentRequest,
                ),
            ).resolves.toEqual({ id: 7 });
            await expect(
                controller.deleteSchedule(1, 7, presidentRequest),
            ).resolves.toEqual({ affected: 1 });

            expect(clubSchedulesService.update).toHaveBeenCalledWith(1, 7, {
                title: '변경',
            });
            expect(clubSchedulesService.removeByClubId).toHaveBeenCalledWith(
                1,
                7,
            );
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
