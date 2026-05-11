import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClubReport } from './entities/club_report.entity';
import { ClubReportsService } from './club_reports.service';

describe('ClubReportsService', () => {
    let service: ClubReportsService;
    let repository: {
        findOne: jest.Mock;
    };

    beforeEach(async () => {
        repository = {
            findOne: jest.fn(),
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
});
