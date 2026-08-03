import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { parseSeoulDateTime } from '../../common/lib/date-time';
import { Club } from '../clubs/entities/club.entity';
import { ClubSchedule } from '../club_schedules/entities/club_schedule.entity';
import { MainBanner } from '../main_banners/entities/main_banner.entity';
import { User } from '../users/entities/user.entity';

const RECENT_ITEMS_LIMIT = 4;

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Club)
        private readonly clubRepository: Repository<Club>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(MainBanner)
        private readonly mainBannerRepository: Repository<MainBanner>,
        @InjectRepository(ClubSchedule)
        private readonly clubScheduleRepository: Repository<ClubSchedule>,
    ) {}

    async getDashboard() {
        const [clubs, users, banners, schedules] = await Promise.all([
            this.getClubSummary(),
            this.getUserSummary(),
            this.getBannerSummary(),
            this.getScheduleSummary(),
        ]);

        return { clubs, users, banners, schedules };
    }

    private async getClubSummary() {
        const [total, recruiting, recent] = await Promise.all([
            this.clubRepository.count({ where: { deleted_at: IsNull() } }),
            this.clubRepository.count({
                where: { deleted_at: IsNull(), is_recruiting: true },
            }),
            this.clubRepository.find({
                where: { deleted_at: IsNull() },
                select: ['id', 'name', 'category', 'is_recruiting'],
                order: { created_at: 'DESC' },
                take: RECENT_ITEMS_LIMIT,
            }),
        ]);

        return { total, recruiting, recent };
    }

    private async getUserSummary() {
        const [total, recent] = await Promise.all([
            this.userRepository.count({
                where: { deleted_at: IsNull(), is_system: false },
            }),
            this.userRepository.find({
                where: { deleted_at: IsNull(), is_system: false },
                select: ['id', 'name', 'login_id', 'role', 'created_at'],
                order: { created_at: 'DESC' },
                take: RECENT_ITEMS_LIMIT,
            }),
        ]);

        return { total, recent };
    }

    private async getBannerSummary() {
        const [total, active] = await Promise.all([
            this.mainBannerRepository.count({ where: { deleted_at: IsNull() } }),
            this.mainBannerRepository.count({
                where: { deleted_at: IsNull(), is_active: true },
            }),
        ]);

        return { total, active };
    }

    private async getScheduleSummary() {
        const { from, to } = this.getCurrentMonthRangeInSeoul();

        const thisMonth = await this.clubScheduleRepository
            .createQueryBuilder('schedule')
            .where('schedule.deleted_at IS NULL')
            .andWhere('schedule.start_at < :to', { to })
            .andWhere('schedule.end_at >= :from', { from })
            .getCount();

        return { thisMonth };
    }

    private getCurrentMonthRangeInSeoul(): { from: Date; to: Date } {
        const seoulNow = new Date(
            new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }),
        );
        const year = seoulNow.getFullYear();
        const month = seoulNow.getMonth();
        const pad = (value: number) => String(value).padStart(2, '0');

        const from = parseSeoulDateTime(`${year}-${pad(month + 1)}-01`);

        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const to = parseSeoulDateTime(`${nextYear}-${pad(nextMonth + 1)}-01`);

        return { from, to };
    }
}
