import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClubsService } from './clubs.service';
import { ClubsController } from './clubs.controller';
import { Club } from './entities/club.entity';
import { ClubReportsModule } from '../club_reports/club_reports.module';
import { S3Service } from '../../lib/s3-uploads';

@Module({
    imports: [TypeOrmModule.forFeature([Club]), ClubReportsModule],
    controllers: [ClubsController],
    providers: [ClubsService, S3Service],
    exports: [ClubsService],
})
export class ClubsModule {}
