import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClubReport } from './entities/club_report.entity';
import { ClubReportsService } from './club_reports.service';

describe('ClubReportsService', () => {
    let service: ClubReportsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ClubReportsService,
                {
                    provide: getRepositoryToken(ClubReport),
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<ClubReportsService>(ClubReportsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
