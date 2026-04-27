import { Test, TestingModule } from '@nestjs/testing';
import { S3Service } from '../../common/lib/s3-uploads';
import { ClubReportsService } from '../club_reports/club_reports.service';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';

describe('ClubsController', () => {
    let controller: ClubsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ClubsController],
            providers: [
                {
                    provide: ClubsService,
                    useValue: {},
                },
                {
                    provide: ClubReportsService,
                    useValue: {},
                },
                {
                    provide: S3Service,
                    useValue: {},
                },
            ],
        }).compile();

        controller = module.get<ClubsController>(ClubsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
