import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClubReportsService } from './club_reports.service';
import { ClubReportsController } from './club_reports.controller';
import { ClubReport } from './entities/club_report.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ClubReport])],
    controllers: [ClubReportsController],
    providers: [ClubReportsService],
    exports: [ClubReportsService],
})
export class ClubReportsModule {}
