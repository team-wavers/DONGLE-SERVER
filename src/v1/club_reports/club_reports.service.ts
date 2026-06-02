import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateClubReportDto } from './dto/create-club_report.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ClubReport } from '../club_reports/entities/club_report.entity';
import { Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

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

    async findOneByClubId(clubId: number, reportId: number) {
        const report = await this.clubReportRepository.findOne({
            where: { id: reportId, club: { id: clubId } },
            relations: ['club'],
        });

        if (!report) {
            throw new NotFoundException(
                '해당 활동보고서가 존재하지 않습니다.',
            );
        }

        return report;
    }

    async update(id: number, updateClubReportDto: CreateClubReportDto) {
        return await this.clubReportRepository.update(
            id,
            this.toUpdateData(updateClubReportDto),
        );
    }

    async updateByClubId(
        clubId: number,
        reportId: number,
        updateClubReportDto: CreateClubReportDto,
    ) {
        const result = await this.clubReportRepository
            .createQueryBuilder()
            .update(ClubReport)
            .set(this.toUpdateData(updateClubReportDto))
            .where('id = :reportId', { reportId })
            .andWhere('club_id = :clubId', { clubId })
            .execute();

        if (result.affected === 0) {
            throw new NotFoundException(
                '해당 활동보고서가 존재하지 않습니다.',
            );
        }

        return result;
    }

    async remove(id: number) {
        return await this.clubReportRepository.delete(id);
    }

    async removeByClubId(clubId: number, reportId: number) {
        const result = await this.clubReportRepository
            .createQueryBuilder()
            .delete()
            .from(ClubReport)
            .where('id = :reportId', { reportId })
            .andWhere('club_id = :clubId', { clubId })
            .execute();

        if (result.affected === 0) {
            throw new NotFoundException(
                '해당 활동보고서가 존재하지 않습니다.',
            );
        }

        return result;
    }

    private toUpdateData(
        updateClubReportDto: CreateClubReportDto,
    ): QueryDeepPartialEntity<ClubReport> {
        const { club_id, ...updateData } = updateClubReportDto;
        void club_id;

        const cleanData = Object.fromEntries(
            Object.entries(updateData).filter(
                ([, value]) => value !== undefined,
            ),
        ) as QueryDeepPartialEntity<ClubReport>;

        if (Object.keys(cleanData).length === 0) {
            throw new Error('수정할 정보가 없습니다.');
        }

        return cleanData;
    }
}
