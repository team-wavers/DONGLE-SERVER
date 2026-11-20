import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateClubReportDto } from './dto/create-club_report.dto';
import { UpdateClubReportDto } from './dto/update-club_report.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ClubReport } from '../club_reports/entities/club_report.entity';
import { Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { RecentClubReportDto } from './dto/recent-club-report.dto';

interface RecentClubReportRow {
    id: number;
    title: string | null;
    created_at: Date;
    club_id: number;
    club_name: string;
    image_urls: Array<string | null> | null;
    content: string | null;
}

const REPORT_IMAGE_SRC_PATTERN = /<img[^>]*\ssrc=["']([^"']+)["'][^>]*>/i;

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

    async findRecentPublic(): Promise<RecentClubReportDto[]> {
        // 먼저 카드 네 건을 고른 뒤 본문을 읽어 전 동아리의 본문을 응답 계층으로 가져오지 않는다.
        const reports: RecentClubReportRow[] =
            await this.clubReportRepository.query(
                `WITH recent AS (
                SELECT id, created_at, club_id, club_name
                FROM (
                    SELECT DISTINCT ON (report.club_id)
                        report.id, report.created_at, report.club_id,
                        club.name AS club_name
                    FROM club_reports report
                    INNER JOIN clubs club ON club.id = report.club_id
                    WHERE report.deleted_at IS NULL
                        AND club.deleted_at IS NULL
                    ORDER BY report.club_id, report.created_at DESC, report.id DESC
                ) latest_by_club
                ORDER BY created_at DESC, id DESC
                LIMIT $1
            )
            SELECT report.id, report.title, recent.created_at,
                recent.club_id, recent.club_name, report.image_urls, report.content
            FROM recent
            INNER JOIN club_reports report ON report.id = recent.id
            ORDER BY recent.created_at DESC, recent.id DESC`,
                [4],
            );

        return reports.map((report) => ({
            id: report.id,
            title: report.title ?? '',
            createdAt: report.created_at.toISOString(),
            club_id: report.club_id,
            club_name: report.club_name,
            thumbnail_url:
                report.image_urls?.find(
                    (url): url is string =>
                        typeof url === 'string' && url.trim().length > 0,
                ) ??
                report.content?.match(REPORT_IMAGE_SRC_PATTERN)?.[1] ??
                null,
        }));
    }

    async findOneByClubId(clubId: number, reportId: number) {
        const report = await this.clubReportRepository.findOne({
            where: { id: reportId, club: { id: clubId } },
            relations: ['club'],
        });

        if (!report) {
            throw new NotFoundException('해당 활동보고서가 존재하지 않습니다.');
        }

        return report;
    }

    async updateByClubId(
        clubId: number,
        reportId: number,
        updateClubReportDto: UpdateClubReportDto,
    ) {
        const result = await this.clubReportRepository
            .createQueryBuilder()
            .update(ClubReport)
            .set(this.toUpdateData(updateClubReportDto))
            .where('id = :reportId', { reportId })
            .andWhere('club_id = :clubId', { clubId })
            .execute();

        if (result.affected === 0) {
            throw new NotFoundException('해당 활동보고서가 존재하지 않습니다.');
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
            throw new NotFoundException('해당 활동보고서가 존재하지 않습니다.');
        }

        return result;
    }

    private toUpdateData(
        updateClubReportDto: UpdateClubReportDto,
    ): QueryDeepPartialEntity<ClubReport> {
        const cleanData = Object.fromEntries(
            Object.entries(updateClubReportDto).filter(
                ([, value]) => value !== undefined,
            ),
        ) as QueryDeepPartialEntity<ClubReport>;

        if (Object.keys(cleanData).length === 0) {
            throw new BadRequestException('수정할 정보가 없습니다.');
        }

        return cleanData;
    }
}
