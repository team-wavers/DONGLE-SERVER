import { Module } from '@nestjs/common';
import { ClubReportsService } from './club_reports.service';
import { ClubReportsController } from './club_reports.controller';

@Module({
    controllers: [ClubReportsController],
    providers: [ClubReportsService],
})
export class ClubReportsModule {}
