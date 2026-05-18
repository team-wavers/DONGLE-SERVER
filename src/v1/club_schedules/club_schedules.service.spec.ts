import { HttpStatus, NotFoundException } from '@nestjs/common';
import { Repository, UpdateResult } from 'typeorm';
import { ClubSchedulesService } from './club_schedules.service';
import { ClubSchedule } from './entities/club_schedule.entity';

const seoulDate = (value: string) => new Date(`${value}+09:00`);

describe('ClubSchedulesService', () => {
    let service: ClubSchedulesService;
    let repository: {
        create: jest.Mock;
        save: jest.Mock;
        find: jest.Mock;
        findOne: jest.Mock;
        update: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let queryBuilder: {
        leftJoinAndSelect: jest.Mock;
        where: jest.Mock;
        andWhere: jest.Mock;
        orderBy: jest.Mock;
        getMany: jest.Mock;
    };

    const validDto = {
        title: '정기 모임',
        type: 'regular_meeting' as const,
        start_at: '2026-05-20 19:00:00',
        end_at: '2026-05-20 21:00:00',
        is_public: true,
        location: '학생회관',
        description: '5월 정기 모임',
        external_url: 'https://forms.example.com/schedule',
    };

    const schedule = {
        id: 7,
        title: '정기 모임',
        type: 'regular_meeting',
        start_at: seoulDate('2026-05-20T19:00:00'),
        end_at: seoulDate('2026-05-20T21:00:00'),
        is_public: true,
        club: { id: 1, name: '동아리' },
    } as ClubSchedule;

    beforeEach(() => {
        queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
        };
        repository = {
            create: jest.fn((payload) => ({ id: 1, ...payload })),
            save: jest.fn(async (entity) => entity),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(() => queryBuilder),
        };

        service = new ClubSchedulesService(
            repository as unknown as Repository<ClubSchedule>,
        );
    });

    describe('create', () => {
        it('필수값과 날짜를 검증한 뒤 Seoul 기준 Date payload를 저장한다', async () => {
            const result = await service.create(1, validDto);

            const expectedPayload = {
                title: '정기 모임',
                type: 'regular_meeting',
                start_at: seoulDate('2026-05-20T19:00:00'),
                end_at: seoulDate('2026-05-20T21:00:00'),
                is_public: true,
                location: '학생회관',
                description: '5월 정기 모임',
                external_url: 'https://forms.example.com/schedule',
                club: { id: 1 },
            };

            expect(repository.create).toHaveBeenCalledWith(expectedPayload);
            expect(repository.save).toHaveBeenCalledWith({
                id: 1,
                ...expectedPayload,
            });
            expect(result).toEqual({ id: 1, ...expectedPayload });
        });

        it('선택 문자열 값이 없거나 공백이면 null payload로 저장한다', async () => {
            await service.create(1, {
                ...validDto,
                location: ' ',
                description: '',
                external_url: '   ',
            });

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    location: null,
                    description: null,
                    external_url: null,
                }),
            );
        });

        it.each([
            ['title', { ...validDto, title: ' ' }, 'title은 필수입니다.'],
            [
                'type',
                { ...validDto, type: 'etc' as never },
                '일정 유형이 올바르지 않습니다.',
            ],
            [
                'start_at',
                { ...validDto, start_at: '' },
                '시작일시와 종료일시는 필수입니다.',
            ],
            [
                'is_public',
                { ...validDto, is_public: 'true' as unknown as boolean },
                'is_public은 boolean 타입이어야 합니다.',
            ],
        ])(
            '%s 값이 올바르지 않으면 Bad Request를 던진다',
            async (_field, dto, message) => {
                await expect(service.create(1, dto)).rejects.toMatchObject({
                    status: HttpStatus.BAD_REQUEST,
                    message,
                });
                expect(repository.create).not.toHaveBeenCalled();
            },
        );

        it('시작일시가 종료일시와 같거나 늦으면 Bad Request를 던진다', async () => {
            await expect(
                service.create(1, {
                    ...validDto,
                    start_at: '2026-05-20 21:00:00',
                    end_at: '2026-05-20 21:00:00',
                }),
            ).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                message: '시작일시는 종료일시보다 이전이어야 합니다.',
            });
        });
    });

    describe('findAllByClubId', () => {
        it('회장용 동아리 일정 목록을 status 필터와 함께 조회한다', async () => {
            repository.find.mockResolvedValue([schedule]);

            const result = await service.findAllByClubId(1, {
                status: 'public',
            });

            expect(repository.find).toHaveBeenCalledWith({
                where: expect.objectContaining({
                    club: { id: 1 },
                    is_public: true,
                }),
                order: { start_at: 'ASC' },
            });
            expect(result).toEqual([schedule]);
        });
    });

    describe('findPublicByClubId', () => {
        it('사용자용 공개 일정은 공개, 미삭제 조건으로 조회한다', async () => {
            repository.find.mockResolvedValue([schedule]);

            const result = await service.findPublicByClubId(1);

            expect(repository.find).toHaveBeenCalledWith({
                where: expect.objectContaining({
                    club: { id: 1 },
                    is_public: true,
                }),
                order: { start_at: 'ASC' },
            });
            expect(result).toEqual([schedule]);
        });
    });

    describe('update', () => {
        it('본인 동아리 일정만 수정하고 수정된 단건을 반환한다', async () => {
            repository.findOne.mockResolvedValueOnce(schedule);
            repository.findOne.mockResolvedValueOnce({
                ...schedule,
                title: '변경된 일정',
            });
            repository.update.mockResolvedValue({
                affected: 1,
            } as UpdateResult);

            const result = await service.update(1, 7, {
                title: ' 변경된 일정 ',
                external_url: ' ',
            });

            expect(repository.update).toHaveBeenCalledWith(
                expect.objectContaining({ id: 7 }),
                {
                    title: '변경된 일정',
                    external_url: null,
                },
            );
            expect(result.title).toBe('변경된 일정');
        });

        it('대상 일정이 없으면 Not Found를 던진다', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(
                service.update(1, 404, { title: '변경' }),
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(repository.update).not.toHaveBeenCalled();
        });
    });

    describe('admin operations', () => {
        it('관리자 목록 필터를 query builder에 적용한다', async () => {
            queryBuilder.getMany.mockResolvedValue([schedule]);

            const result = await service.findAllForAdmin({
                clubName: '동아리',
                category: '학술',
                type: 'event',
                isPublic: 'true',
            });

            expect(repository.createQueryBuilder).toHaveBeenCalledWith(
                'schedule',
            );
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'club.name ILIKE :clubName',
                { clubName: '%동아리%' },
            );
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'schedule.is_public = :isPublic',
                { isPublic: true },
            );
            expect(result).toEqual([schedule]);
        });

        it('관리자가 공개 상태를 수정한다', async () => {
            repository.findOne.mockResolvedValue(schedule);
            repository.update.mockResolvedValue({
                affected: 1,
            } as UpdateResult);

            await service.updateAdminStatus(7, {
                is_public: false,
            });

            expect(repository.update).toHaveBeenCalledWith(
                expect.objectContaining({ id: 7 }),
                { is_public: false },
            );
        });

        it('관리자 삭제는 soft delete 처리한다', async () => {
            repository.findOne.mockResolvedValue(schedule);
            repository.update.mockResolvedValue({
                affected: 1,
            } as UpdateResult);

            await service.removeForAdmin(7);

            expect(repository.update).toHaveBeenCalledWith(
                expect.objectContaining({ id: 7 }),
                expect.objectContaining({ deleted_at: expect.any(Date) }),
            );
        });
    });
});
