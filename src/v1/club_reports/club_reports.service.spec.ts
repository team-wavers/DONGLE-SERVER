import { Test, TestingModule } from '@nestjs/testing';
import { ClubReportsService } from './club_reports.service';

describe('ClubReportsService', () => {
    let service: ClubReportsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ClubReportsService],
        }).compile();

        service = module.get<ClubReportsService>(ClubReportsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
