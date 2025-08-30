import { Test, TestingModule } from '@nestjs/testing';
import { ClubReportsController } from './club_reports.controller';
import { ClubReportsService } from './club_reports.service';

describe('ClubReportsController', () => {
    let controller: ClubReportsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ClubReportsController],
            providers: [ClubReportsService],
        }).compile();

        controller = module.get<ClubReportsController>(ClubReportsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
