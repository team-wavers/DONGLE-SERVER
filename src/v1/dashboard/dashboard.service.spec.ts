import { Repository } from 'typeorm';
import { Club } from '../clubs/entities/club.entity';
import { ClubSchedule } from '../club_schedules/entities/club_schedule.entity';
import { MainBanner } from '../main_banners/entities/main_banner.entity';
import { User } from '../users/entities/user.entity';
import { DashboardService } from './dashboard.service';

const seoulDate = (value: string) => new Date(`${value}+09:00`);

describe('DashboardService', () => {
    let service: DashboardService;
    let clubRepository: { count: jest.Mock; find: jest.Mock };
    let userRepository: { count: jest.Mock; find: jest.Mock };
    let mainBannerRepository: { count: jest.Mock };
    let scheduleQueryBuilder: {
        where: jest.Mock;
        andWhere: jest.Mock;
        getCount: jest.Mock;
    };
    let clubScheduleRepository: { createQueryBuilder: jest.Mock };

    beforeEach(() => {
        clubRepository = {
            count: jest.fn().mockResolvedValue(0),
            find: jest.fn().mockResolvedValue([]),
        };
        userRepository = {
            count: jest.fn().mockResolvedValue(0),
            find: jest.fn().mockResolvedValue([]),
        };
        mainBannerRepository = {
            count: jest.fn().mockResolvedValue(0),
        };
        scheduleQueryBuilder = {
            where: jest.fn(),
            andWhere: jest.fn(),
            getCount: jest.fn().mockResolvedValue(0),
        };
        scheduleQueryBuilder.where.mockReturnValue(scheduleQueryBuilder);
        scheduleQueryBuilder.andWhere.mockReturnValue(scheduleQueryBuilder);
        clubScheduleRepository = {
            createQueryBuilder: jest.fn().mockReturnValue(scheduleQueryBuilder),
        };

        service = new DashboardService(
            clubRepository as unknown as Repository<Club>,
            userRepository as unknown as Repository<User>,
            mainBannerRepository as unknown as Repository<MainBanner>,
            clubScheduleRepository as unknown as Repository<ClubSchedule>,
        );
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('동아리 요약', () => {
        it('삭제되지 않은 전체/모집중 개수와 최근 4개를 생성일 역순으로 조회한다', async () => {
            clubRepository.count
                .mockResolvedValueOnce(12)
                .mockResolvedValueOnce(3);
            const recentClubs = [{ id: 1 }];
            clubRepository.find.mockResolvedValue(recentClubs);

            const result = await service.getDashboard();

            expect(clubRepository.count).toHaveBeenNthCalledWith(1, {
                where: { deleted_at: expect.anything() },
            });
            expect(clubRepository.count).toHaveBeenNthCalledWith(2, {
                where: { deleted_at: expect.anything(), is_recruiting: true },
            });
            expect(clubRepository.find).toHaveBeenCalledWith({
                where: { deleted_at: expect.anything() },
                select: ['id', 'name', 'category', 'is_recruiting'],
                order: { created_at: 'DESC' },
                take: 4,
            });
            expect(result.clubs).toEqual({
                total: 12,
                recruiting: 3,
                recent: recentClubs,
            });
        });
    });

    describe('사용자 요약', () => {
        it('삭제되지 않고 시스템 계정이 아닌 사용자만 집계하며 비밀번호/refresh_token은 select하지 않는다', async () => {
            userRepository.count.mockResolvedValue(7);
            const recentUsers = [{ id: 1 }];
            userRepository.find.mockResolvedValue(recentUsers);

            const result = await service.getDashboard();

            const countArgs = userRepository.count.mock.calls[0][0];
            expect(countArgs.where).toEqual(
                expect.objectContaining({
                    deleted_at: expect.anything(),
                    is_system: false,
                }),
            );

            const findArgs = userRepository.find.mock.calls[0][0];
            expect(findArgs.where).toEqual(
                expect.objectContaining({
                    deleted_at: expect.anything(),
                    is_system: false,
                }),
            );
            expect(findArgs.select).toEqual([
                'id',
                'name',
                'login_id',
                'role',
                'created_at',
            ]);
            expect(findArgs.select).not.toContain('password');
            expect(findArgs.select).not.toContain('refresh_token');
            expect(findArgs.order).toEqual({ created_at: 'DESC' });
            expect(findArgs.take).toBe(4);

            expect(result.users).toEqual({ total: 7, recent: recentUsers });
        });
    });

    describe('배너 요약', () => {
        it('삭제되지 않은 전체 배너 수와 활성 배너 수를 집계한다', async () => {
            mainBannerRepository.count
                .mockResolvedValueOnce(5)
                .mockResolvedValueOnce(2);

            const result = await service.getDashboard();

            expect(mainBannerRepository.count).toHaveBeenNthCalledWith(1, {
                where: { deleted_at: expect.anything() },
            });
            expect(mainBannerRepository.count).toHaveBeenNthCalledWith(2, {
                where: { deleted_at: expect.anything(), is_active: true },
            });
            expect(result.banners).toEqual({ total: 5, active: 2 });
        });
    });

    describe('일정 요약', () => {
        it('이번 달 범위는 서울 기준 월초(from 이상)~다음 달 월초(to 미만) 반개방 구간으로 조회한다', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-08-15T03:00:00.000Z'));
            scheduleQueryBuilder.getCount.mockResolvedValue(9);

            const result = await service.getDashboard();

            expect(scheduleQueryBuilder.andWhere).toHaveBeenNthCalledWith(
                1,
                'schedule.start_at < :to',
                { to: seoulDate('2026-09-01T00:00:00') },
            );
            expect(scheduleQueryBuilder.andWhere).toHaveBeenNthCalledWith(
                2,
                'schedule.end_at >= :from',
                { from: seoulDate('2026-08-01T00:00:00') },
            );
            expect(result.schedules).toEqual({ thisMonth: 9 });
        });

        it('12월에는 다음 해 1월 1일을 상한으로 사용한다', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-12-15T03:00:00.000Z'));
            scheduleQueryBuilder.getCount.mockResolvedValue(1);

            await service.getDashboard();

            expect(scheduleQueryBuilder.andWhere).toHaveBeenNthCalledWith(
                1,
                'schedule.start_at < :to',
                { to: seoulDate('2027-01-01T00:00:00') },
            );
            expect(scheduleQueryBuilder.andWhere).toHaveBeenNthCalledWith(
                2,
                'schedule.end_at >= :from',
                { from: seoulDate('2026-12-01T00:00:00') },
            );
        });

        it('다음 달 월초 정각에 시작하는 일정은 이번 달 집계에서 제외된다(상한 미포함 검증)', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-08-15T03:00:00.000Z'));

            await service.getDashboard();

            const [expression] = scheduleQueryBuilder.andWhere.mock.calls[0];
            expect(expression).not.toContain('<=');
            expect(expression).toBe('schedule.start_at < :to');
        });
    });
});
