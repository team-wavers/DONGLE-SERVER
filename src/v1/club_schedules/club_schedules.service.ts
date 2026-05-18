import {
    HttpException,
    HttpStatus,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    IsNull,
    LessThan,
    MoreThanOrEqual,
    Repository,
    SelectQueryBuilder,
} from 'typeorm';
import {
    parseSeoulDateTime,
    validateDateRange,
} from '../../common/lib/date-time';
import { CreateClubScheduleDto } from './dto/create-club-schedule.dto';
import {
    ClubScheduleAdminQueryDto,
    ClubScheduleCalendarQueryDto,
    ClubSchedulePresidentQueryDto,
} from './dto/club-schedule-query.dto';
import { UpdateClubScheduleAdminStatusDto } from './dto/update-club-schedule-admin-status.dto';
import { UpdateClubScheduleDto } from './dto/update-club-schedule.dto';
import {
    CLUB_SCHEDULE_TYPES,
    ClubSchedule,
} from './entities/club_schedule.entity';

@Injectable()
export class ClubSchedulesService {
    constructor(
        @InjectRepository(ClubSchedule)
        private readonly clubScheduleRepository: Repository<ClubSchedule>,
    ) {}

    async create(clubId: number, dto: CreateClubScheduleDto) {
        const payload = this.toCreatePayload(clubId, dto);
        const schedule = this.clubScheduleRepository.create(payload);
        return await this.clubScheduleRepository.save(schedule);
    }

    async findAllByClubId(
        clubId: number,
        query: ClubSchedulePresidentQueryDto = {},
    ) {
        const baseWhere = {
            club: { id: clubId },
            deleted_at: IsNull(),
        };
        const statusWhere = this.createPresidentStatusWhere(query.status);

        return await this.clubScheduleRepository.find({
            where: {
                ...baseWhere,
                ...statusWhere,
            },
            order: {
                start_at: 'ASC',
            },
        });
    }

    private createPresidentStatusWhere(
        status: ClubSchedulePresidentQueryDto['status'] = 'all',
    ) {
        const now = new Date();

        switch (status) {
            case 'public':
                return { is_public: true };
            case 'private':
                return { is_public: false };
            case 'upcoming':
                return { start_at: MoreThanOrEqual(now) };
            case 'past':
                return { end_at: LessThan(now) };
            case 'all':
            default:
                return {};
        }
    }

    async findPublicByClubId(clubId: number) {
        return await this.clubScheduleRepository.find({
            where: {
                club: { id: clubId },
                deleted_at: IsNull(),
                is_public: true,
            },
            order: {
                start_at: 'ASC',
            },
        });
    }

    async update(
        clubId: number,
        scheduleId: number,
        dto: UpdateClubScheduleDto,
    ) {
        const schedule = await this.findOwnedSchedule(clubId, scheduleId);
        const payload = this.toUpdatePayload(dto, schedule);

        if (Object.keys(payload).length === 0) {
            throw new HttpException(
                '수정할 정보가 없습니다.',
                HttpStatus.BAD_REQUEST,
            );
        }

        await this.clubScheduleRepository.update(
            { id: scheduleId, deleted_at: IsNull() },
            payload,
        );

        return await this.findOwnedSchedule(clubId, scheduleId);
    }

    async removeByClubId(clubId: number, scheduleId: number) {
        await this.findOwnedSchedule(clubId, scheduleId);
        return await this.softDelete(scheduleId);
    }

    async findAllForAdmin(query: ClubScheduleAdminQueryDto = {}) {
        const queryBuilder = this.createAdminQuery(query);
        return await queryBuilder.orderBy('schedule.start_at', 'ASC').getMany();
    }

    async findCalendarForAdmin(query: ClubScheduleCalendarQueryDto) {
        const from = parseSeoulDateTime(query.from);
        const to = parseSeoulDateTime(query.to);
        validateDateRange(
            from,
            to,
            '조회 시작일은 종료일보다 이전이어야 합니다.',
        );

        return await this.clubScheduleRepository
            .createQueryBuilder('schedule')
            .leftJoinAndSelect('schedule.club', 'club')
            .where('schedule.deleted_at IS NULL')
            .andWhere('schedule.start_at <= :to', { to })
            .andWhere('schedule.end_at >= :from', { from })
            .orderBy('schedule.start_at', 'ASC')
            .getMany();
    }

    async findOneForAdmin(scheduleId: number) {
        const schedule = await this.clubScheduleRepository.findOne({
            where: { id: scheduleId, deleted_at: IsNull() },
            relations: ['club'],
        });

        if (!schedule) {
            throw new NotFoundException('해당 일정이 존재하지 않습니다.');
        }

        return schedule;
    }

    async updateAdminStatus(
        scheduleId: number,
        dto: UpdateClubScheduleAdminStatusDto,
    ) {
        if (typeof dto.is_public !== 'boolean') {
            throw new HttpException(
                'is_public은 boolean 타입이어야 합니다.',
                HttpStatus.BAD_REQUEST,
            );
        }

        await this.findOneForAdmin(scheduleId);
        await this.clubScheduleRepository.update(
            { id: scheduleId, deleted_at: IsNull() },
            { is_public: dto.is_public },
        );

        return await this.findOneForAdmin(scheduleId);
    }

    async removeForAdmin(scheduleId: number) {
        await this.findOneForAdmin(scheduleId);
        return await this.softDelete(scheduleId);
    }

    private async findOwnedSchedule(clubId: number, scheduleId: number) {
        const schedule = await this.clubScheduleRepository.findOne({
            where: {
                id: scheduleId,
                club: { id: clubId },
                deleted_at: IsNull(),
            },
            relations: ['club'],
        });

        if (!schedule) {
            throw new NotFoundException('해당 일정이 존재하지 않습니다.');
        }

        return schedule;
    }

    private async softDelete(scheduleId: number) {
        return await this.clubScheduleRepository.update(
            { id: scheduleId, deleted_at: IsNull() },
            { deleted_at: new Date() },
        );
    }

    private createAdminQuery(query: ClubScheduleAdminQueryDto) {
        const queryBuilder = this.clubScheduleRepository
            .createQueryBuilder('schedule')
            .leftJoinAndSelect('schedule.club', 'club')
            .where('schedule.deleted_at IS NULL');

        if (query.clubName?.trim()) {
            queryBuilder.andWhere('club.name ILIKE :clubName', {
                clubName: `%${query.clubName.trim()}%`,
            });
        }

        if (query.category?.trim()) {
            queryBuilder.andWhere('club.category = :category', {
                category: query.category.trim(),
            });
        }

        if (query.type) {
            queryBuilder.andWhere('schedule.type = :type', {
                type: query.type,
            });
        }

        if (query.isPublic === 'true' || query.isPublic === 'false') {
            queryBuilder.andWhere('schedule.is_public = :isPublic', {
                isPublic: query.isPublic === 'true',
            });
        }

        this.applyDateRange(queryBuilder, query.from, query.to);

        return queryBuilder;
    }

    private applyDateRange(
        queryBuilder: SelectQueryBuilder<ClubSchedule>,
        fromInput?: string,
        toInput?: string,
    ) {
        const from = fromInput ? parseSeoulDateTime(fromInput) : null;
        const to = toInput ? parseSeoulDateTime(toInput) : null;

        if (from && to) {
            validateDateRange(
                from,
                to,
                '조회 시작일은 종료일보다 이전이어야 합니다.',
            );
        }

        if (to) {
            queryBuilder.andWhere('schedule.start_at <= :to', { to });
        }

        if (from) {
            queryBuilder.andWhere('schedule.end_at >= :from', { from });
        }
    }

    private toCreatePayload(clubId: number, dto: CreateClubScheduleDto) {
        this.validateCreateRequired(dto);

        const startAt = parseSeoulDateTime(dto.start_at);
        const endAt = parseSeoulDateTime(dto.end_at);
        this.validateDateOrder(startAt, endAt);

        return {
            title: dto.title.trim(),
            type: dto.type,
            start_at: startAt,
            end_at: endAt,
            is_public: dto.is_public,
            location: dto.location?.trim() || null,
            description: dto.description?.trim() || null,
            external_url: dto.external_url?.trim() || null,
            club: { id: clubId },
        };
    }

    private toUpdatePayload(
        dto: UpdateClubScheduleDto,
        schedule: ClubSchedule,
    ) {
        const payload: Record<string, unknown> = {};

        if (dto.title !== undefined) {
            if (!dto.title.trim()) {
                throw new HttpException(
                    'title은 필수입니다.',
                    HttpStatus.BAD_REQUEST,
                );
            }
            payload.title = dto.title.trim();
        }

        if (dto.type !== undefined) {
            this.validateScheduleType(dto.type);
            payload.type = dto.type;
        }

        const startAt =
            dto.start_at !== undefined
                ? parseSeoulDateTime(dto.start_at)
                : schedule.start_at;
        const endAt =
            dto.end_at !== undefined
                ? parseSeoulDateTime(dto.end_at)
                : schedule.end_at;
        this.validateDateOrder(startAt, endAt);

        if (dto.start_at !== undefined) {
            payload.start_at = startAt;
        }

        if (dto.end_at !== undefined) {
            payload.end_at = endAt;
        }

        if (dto.is_public !== undefined) {
            if (typeof dto.is_public !== 'boolean') {
                throw new HttpException(
                    'is_public은 boolean 타입이어야 합니다.',
                    HttpStatus.BAD_REQUEST,
                );
            }
            payload.is_public = dto.is_public;
        }

        if (dto.location !== undefined) {
            payload.location = dto.location.trim() || null;
        }

        if (dto.description !== undefined) {
            payload.description = dto.description.trim() || null;
        }

        if (dto.external_url !== undefined) {
            payload.external_url = dto.external_url.trim() || null;
        }

        return payload;
    }

    private validateCreateRequired(dto: CreateClubScheduleDto) {
        if (!dto.title?.trim()) {
            throw new HttpException(
                'title은 필수입니다.',
                HttpStatus.BAD_REQUEST,
            );
        }

        this.validateScheduleType(dto.type);

        if (!dto.start_at?.trim() || !dto.end_at?.trim()) {
            throw new HttpException(
                '시작일시와 종료일시는 필수입니다.',
                HttpStatus.BAD_REQUEST,
            );
        }

        if (typeof dto.is_public !== 'boolean') {
            throw new HttpException(
                'is_public은 boolean 타입이어야 합니다.',
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    private validateScheduleType(type: string) {
        if (!CLUB_SCHEDULE_TYPES.includes(type as never)) {
            throw new HttpException(
                '일정 유형이 올바르지 않습니다.',
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    private validateDateOrder(startAt: Date, endAt: Date) {
        validateDateRange(
            startAt,
            endAt,
            '시작일시는 종료일시보다 이전이어야 합니다.',
        );
    }
}
