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
        private readonly clubReportRepository: Repository<ClubReport>,
    ) {}

    async create(createClubReportDto: CreateClubReportDto) {
        const { club_id, ...reportData } = createClubReportDto;

        const report = this.clubReportRepository.create({
            ...reportData,
            club: { id: club_id }, // Club 엔티티의 참조를 설정
        });

        return await this.clubReportRepository.save(report);
    }

    async findAll() {
        const reports = await this.clubReportRepository.find({
            relations: ['club'],
            order: { createdAt: 'DESC' },
        });
        return reports;
    }

    async findAllByClubId(clubId: number) {
        const reports = await this.clubReportRepository.find({
            where: { club: { id: clubId } },
            order: { createdAt: 'DESC' },
        });
        return reports;
    }

    async update(id: number, updateClubReportDto: CreateClubReportDto) {
        return await this.clubReportRepository.update(id, updateClubReportDto);
    }

    async remove(id: number) {
        return await this.clubReportRepository.delete(id);
    }
}
