import { Injectable } from '@nestjs/common';
import { CreateClubReportDto } from './dto/create-club_report.dto';
import { UpdateClubReportDto } from './dto/update-club_report.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ClubReport } from '../club_reports/entities/club_report.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ClubReportsService {
    constructor(
        @InjectRepository(ClubReport)
        private readonly clubReportRepository: Repository<ClubReport>
    ) {}

    async create(createClubReportDto: CreateClubReportDto) {
        const report = this.clubReportRepository.create(createClubReportDto);
        return report;
    }

    findAll() {
        const reports = this.clubReportRepository.find({
            relations: ['club'],
            order: { createdAt: 'DESC' },
        });
        return reports;
    }

    findOne(id: number) {
        return `This action returns a #${id} clubReport`;
    }

    update(id: number, updateClubReportDto: UpdateClubReportDto) {
        return `This action updates a #${id} clubReport`;
    }

    remove(id: number) {
        return `This action removes a #${id} clubReport`;
    }
}
