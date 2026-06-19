import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClubReport } from './entities/club_report.entity';
import { ClubReportsService } from './club_reports.service';

describe('ClubReportsService', () => {
    let service: ClubReportsService;
    let repository: {
        findOne: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let queryBuilder: {
        update: jest.Mock;
        delete: jest.Mock;
        from: jest.Mock;
        set: jest.Mock;
        where: jest.Mock;
        andWhere: jest.Mock;
        execute: jest.Mock;
    };

    beforeEach(async () => {
        queryBuilder = {
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn(),
        };
        repository = {
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => queryBuilder),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ClubReportsService,
                {
                    provide: getRepositoryToken(ClubReport),
                    useValue: repository,
                },
            ],
        }).compile();

        service = module.get<ClubReportsService>(ClubReportsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findOneByClubId', () => {
        it('동아리 하위 활동보고서 단건을 조회한다', async () => {
            const report = { id: 7, club: { id: 1 } };
            repository.findOne.mockResolvedValue(report);

            const result = await service.findOneByClubId(1, 7);

            expect(repository.findOne).toHaveBeenCalledWith({
                where: {
                    id: 7,
                    club: { id: 1 },
                },
                relations: ['club'],
            });
            expect(result).toBe(report);
        });

        it('대상이 없으면 Not Found를 던진다', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(service.findOneByClubId(1, 404)).rejects.toMatchObject(
                {
                    status: HttpStatus.NOT_FOUND,
                    message: '해당 활동보고서가 존재하지 않습니다.',
                },
            );
        });
    });

    describe('updateByClubId', () => {
        it('동아리 하위 활동보고서만 수정한다', async () => {
            queryBuilder.execute.mockResolvedValue({ affected: 1 });

            const result = await service.updateByClubId(1, 7, {
                title: '수정된 제목',
                content: '수정된 본문',
                image_urls: ['https://example.com/image.png'],
            });

            expect(queryBuilder.update).toHaveBeenCalledWith(ClubReport);
            expect(queryBuilder.set).toHaveBeenCalledWith({
                title: '수정된 제목',
                content: '수정된 본문',
                image_urls: ['https://example.com/image.png'],
            });
            expect(queryBuilder.where).toHaveBeenCalledWith(
                'id = :reportId',
                { reportId: 7 },
            );
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'club_id = :clubId',
                { clubId: 1 },
            );
            expect(result).toEqual({ affected: 1 });
        });

        it('동아리 하위 활동보고서가 아니면 수정하지 않고 Not Found를 던진다', async () => {
            queryBuilder.execute.mockResolvedValue({ affected: 0 });

            await expect(
                service.updateByClubId(1, 404, {
                    title: '수정된 제목',
                    content: '수정된 본문',
                    image_urls: [],
                }),
            ).rejects.toMatchObject({
                status: HttpStatus.NOT_FOUND,
                message: '해당 활동보고서가 존재하지 않습니다.',
            });
            expect(repository.update).not.toHaveBeenCalled();
        });

        it('수정할 활동보고서 필드가 없으면 Bad Request를 던진다', async () => {
            await expect(
                service.updateByClubId(1, 7, {}),
            ).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                message: '수정할 정보가 없습니다.',
            });
            expect(queryBuilder.execute).not.toHaveBeenCalled();
        });
    });

    describe('removeByClubId', () => {
        it('동아리 하위 활동보고서만 삭제한다', async () => {
            queryBuilder.execute.mockResolvedValue({ affected: 1 });

            const result = await service.removeByClubId(1, 7);

            expect(queryBuilder.delete).toHaveBeenCalled();
            expect(queryBuilder.from).toHaveBeenCalledWith(ClubReport);
            expect(queryBuilder.where).toHaveBeenCalledWith(
                'id = :reportId',
                { reportId: 7 },
            );
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'club_id = :clubId',
                { clubId: 1 },
            );
            expect(result).toEqual({ affected: 1 });
        });

        it('동아리 하위 활동보고서가 아니면 삭제하지 않고 Not Found를 던진다', async () => {
            queryBuilder.execute.mockResolvedValue({ affected: 0 });

            await expect(service.removeByClubId(1, 404)).rejects.toMatchObject({
                status: HttpStatus.NOT_FOUND,
                message: '해당 활동보고서가 존재하지 않습니다.',
            });
            expect(repository.delete).not.toHaveBeenCalled();
        });
    });
});
