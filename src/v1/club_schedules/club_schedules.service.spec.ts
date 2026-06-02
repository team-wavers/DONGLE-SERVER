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
        leftJoin: jest.Mock;
        innerJoinAndSelect: jest.Mock;
        leftJoinAndSelect: jest.Mock;
        where: jest.Mock;
        andWhere: jest.Mock;
        orderBy: jest.Mock;
        withDeleted: jest.Mock;
        getMany: jest.Mock;
        getOne: jest.Mock;
        update: jest.Mock;
        set: jest.Mock;
        execute: jest.Mock;
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
        club_id: 1,
        title: '정기 모임',
        type: 'regular_meeting',
        start_at: seoulDate('2026-05-20T19:00:00'),
        end_at: seoulDate('2026-05-20T21:00:00'),
        is_public: true,
        location: null,
        description: null,
        external_url: null,
        created_at: seoulDate('2026-05-01T00:00:00'),
        updated_at: seoulDate('2026-05-01T00:00:00'),
        deleted_at: null,
        club: { id: 1, name: '동아리', category: '학술' },
    } as unknown as ClubSchedule;

    const commonSchedule = {
        ...schedule,
        id: 9,
        club_id: null,
        title: '공통 행사',
        club: null,
    } as unknown as ClubSchedule;

    beforeEach(() => {
        queryBuilder = {
            leftJoin: jest.fn().mockReturnThis(),
            innerJoinAndSelect: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            withDeleted: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
            getOne: jest.fn(),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            execute: jest.fn(),
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
                club_id: 1,
                club: { id: 1 },
            };

            expect(repository.create).toHaveBeenCalledWith(expectedPayload);
            expect(repository.save).toHaveBeenCalledWith({
                id: 1,
                ...expectedPayload,
            });
            expect(result).toEqual(
                expect.objectContaining({
                    id: 1,
                    club_id: 1,
                    title: '정기 모임',
                    type: 'regular_meeting',
                    start_at: seoulDate('2026-05-20T19:00:00'),
                    end_at: seoulDate('2026-05-20T21:00:00'),
                    is_public: true,
                    location: '학생회관',
                    description: '5월 정기 모임',
                    external_url: 'https://forms.example.com/schedule',
                }),
            );
            expect(result).not.toHaveProperty('club');
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
                'notice type',
                { ...validDto, type: 'notice' as never },
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

        it('관리자 공통 일정은 club_id와 club 없이 생성한다', async () => {
            const result = await service.createCommonForAdmin({
                title: ' 공통 행사 ',
                type: 'event',
                start_at: '2026-06-10 10:00:00',
                end_at: '2026-06-10 12:00:00',
                is_public: true,
                location: ' 중앙광장 ',
            });

            expect(repository.create).toHaveBeenCalledWith({
                title: '공통 행사',
                type: 'event',
                start_at: seoulDate('2026-06-10T10:00:00'),
                end_at: seoulDate('2026-06-10T12:00:00'),
                is_public: true,
                location: '중앙광장',
                description: null,
                external_url: null,
                club_id: null,
                club: null,
            });
            expect(result).toEqual(
                expect.objectContaining({
                    id: 1,
                    club_id: null,
                    club: null,
                    title: '공통 행사',
                }),
            );
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
            expect(result).toEqual([
                expect.objectContaining({
                    id: 7,
                    club_id: 1,
                    title: '정기 모임',
                }),
            ]);
            expect(result[0]).not.toHaveProperty('club');
        });
    });

    describe('findPublicByClubId', () => {
        it('사용자용 공개 일정은 공개, 일정 미삭제, 동아리 미삭제 조건으로 조회한다', async () => {
            const publicSchedule = {
                ...schedule,
                club: { id: 1, name: '동아리', category: '학술' },
            };
            queryBuilder.getMany.mockResolvedValue([publicSchedule]);

            const result = await service.findPublicByClubId(1);

            expect(repository.createQueryBuilder).toHaveBeenCalledWith(
                'schedule',
            );
            expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
                'schedule.club',
                'club',
            );
            expect(queryBuilder.leftJoinAndSelect).not.toHaveBeenCalled();
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'schedule.is_public = :isPublic',
                { isPublic: true },
            );
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'club.deleted_at IS NULL',
            );
            expect(result).toEqual([
                expect.objectContaining({
                    id: 7,
                    club_id: 1,
                    title: '정기 모임',
                }),
            ]);
            expect(result[0]).not.toHaveProperty('club');
        });
    });

    describe('findPublicCalendar', () => {
        it('전체 공개 일정은 기간과 겹치는 동아리 공개 일정과 공통 일정을 조회한다', async () => {
            queryBuilder.getMany.mockResolvedValue([schedule, commonSchedule]);

            const result = await service.findPublicCalendar({
                from: '2026-05-01',
                to: '2026-06-01',
            });

            expect(repository.createQueryBuilder).toHaveBeenCalledWith(
                'schedule',
            );
            expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
                'schedule.club',
                'club',
            );
            expect(queryBuilder.where).toHaveBeenCalledWith(
                'schedule.deleted_at IS NULL',
            );
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'schedule.is_public = :isPublic',
                { isPublic: true },
            );
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                '(schedule.club_id IS NULL OR club.deleted_at IS NULL)',
            );
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'schedule.start_at <= :to',
                { to: seoulDate('2026-06-01T00:00:00') },
            );
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'schedule.end_at >= :from',
                { from: seoulDate('2026-05-01T00:00:00') },
            );
            expect(queryBuilder.orderBy).toHaveBeenCalledWith(
                'schedule.start_at',
                'ASC',
            );
            expect(result).toEqual([
                expect.objectContaining({
                    id: 7,
                    club_id: 1,
                    club: {
                        id: 1,
                        name: '동아리',
                        category: '학술',
                    },
                }),
                expect.objectContaining({
                    id: 9,
                    club_id: null,
                    club: null,
                    title: '공통 행사',
                }),
            ]);
        });

        it('전체 공개 일정 조회 시작일이 종료일보다 늦으면 Bad Request를 던진다', async () => {
            await expect(
                service.findPublicCalendar({
                    from: '2026-06-01',
                    to: '2026-05-01',
                }),
            ).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                message: '조회 시작일은 종료일보다 이전이어야 합니다.',
            });
            expect(queryBuilder.getMany).not.toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('본인 동아리 일정만 수정하고 수정된 단건을 반환한다', async () => {
            repository.findOne.mockResolvedValueOnce(schedule);
            repository.findOne.mockResolvedValueOnce({
                ...schedule,
                title: '변경된 일정',
            });
            queryBuilder.execute.mockResolvedValue({
                affected: 1,
            } as UpdateResult);

            const result = await service.update(1, 7, {
                title: ' 변경된 일정 ',
                external_url: ' ',
            });

            expect(queryBuilder.update).toHaveBeenCalledWith(ClubSchedule);
            expect(queryBuilder.set).toHaveBeenCalledWith({
                title: '변경된 일정',
                external_url: null,
            });
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'club_id = :clubId',
                { clubId: 1 },
            );
            expect(result.title).toBe('변경된 일정');
        });

        it('대상 일정이 없으면 Not Found를 던진다', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(
                service.update(1, 404, { title: '변경' }),
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(queryBuilder.execute).not.toHaveBeenCalled();
        });
    });

    describe('removeByClubId', () => {
        it('본인 동아리 일정만 club_id 조건으로 soft delete 처리한다', async () => {
            repository.findOne.mockResolvedValue(schedule);
            queryBuilder.execute.mockResolvedValue({
                affected: 1,
            } as UpdateResult);

            const result = await service.removeByClubId(1, 7);

            expect(queryBuilder.update).toHaveBeenCalledWith(ClubSchedule);
            expect(queryBuilder.set).toHaveBeenCalledWith({
                deleted_at: expect.any(Date),
            });
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'club_id = :clubId',
                { clubId: 1 },
            );
            expect(result).toEqual({ affected: 1 });
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
            expect(queryBuilder.withDeleted).toHaveBeenCalled();
            expect(queryBuilder.where).toHaveBeenCalledWith(
                'schedule.deleted_at IS NULL',
            );
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'club.name ILIKE :clubName',
                { clubName: '%동아리%' },
            );
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'schedule.is_public = :isPublic',
                { isPublic: true },
            );
            expect(result).toEqual([
                expect.objectContaining({
                    id: 7,
                    club_id: 1,
                    club: {
                        id: 1,
                        name: '동아리',
                        category: '학술',
                    },
                }),
            ]);
        });

        it('관리자 캘린더와 단건 응답에 동아리 요약 정보를 포함한다', async () => {
            queryBuilder.getMany.mockResolvedValue([schedule]);
            queryBuilder.getOne.mockResolvedValue(schedule);

            await expect(
                service.findCalendarForAdmin({
                    from: '2026-05-01',
                    to: '2026-06-01',
                }),
            ).resolves.toEqual([
                expect.objectContaining({
                    club_id: 1,
                    club: {
                        id: 1,
                        name: '동아리',
                        category: '학술',
                    },
                }),
            ]);
            expect(queryBuilder.withDeleted).toHaveBeenCalled();

            await expect(service.findOneForAdmin(7)).resolves.toEqual(
                expect.objectContaining({
                    club_id: 1,
                    club: {
                        id: 1,
                        name: '동아리',
                        category: '학술',
                    },
                }),
            );
            expect(repository.findOne).not.toHaveBeenCalled();
            expect(queryBuilder.where).toHaveBeenCalledWith(
                'schedule.id = :scheduleId',
                { scheduleId: 7 },
            );
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'schedule.deleted_at IS NULL',
            );
        });

        it('관리자 조회에서 동아리가 soft delete되어도 일정과 동아리 요약 정보를 반환한다', async () => {
            const softDeletedClubSchedule = {
                ...schedule,
                club: {
                    id: 1,
                    name: '삭제된 동아리',
                    category: '학술',
                    deleted_at: seoulDate('2026-05-10T00:00:00'),
                },
            };
            queryBuilder.getMany.mockResolvedValue([softDeletedClubSchedule]);

            const result = await service.findAllForAdmin();

            expect(queryBuilder.withDeleted).toHaveBeenCalled();
            expect(result).toEqual([
                expect.objectContaining({
                    club_id: 1,
                    club: {
                        id: 1,
                        name: '삭제된 동아리',
                        category: '학술',
                    },
                }),
            ]);
        });

        it('관리자 조회는 공통 일정을 club null로 반환한다', async () => {
            queryBuilder.getMany.mockResolvedValue([commonSchedule]);
            queryBuilder.getOne.mockResolvedValue(commonSchedule);

            await expect(service.findAllForAdmin()).resolves.toEqual([
                expect.objectContaining({
                    id: 9,
                    club_id: null,
                    club: null,
                    title: '공통 행사',
                }),
            ]);
            await expect(service.findOneForAdmin(9)).resolves.toEqual(
                expect.objectContaining({
                    id: 9,
                    club_id: null,
                    club: null,
                    title: '공통 행사',
                }),
            );
        });

        it('관리자 조회에서 실제 동아리 row가 없으면 Not Found를 던진다', async () => {
            const orphanSchedule = {
                ...schedule,
                club: null,
            } as unknown as ClubSchedule;
            queryBuilder.getMany.mockResolvedValue([orphanSchedule]);
            queryBuilder.getOne.mockResolvedValue(orphanSchedule);

            await expect(service.findAllForAdmin()).rejects.toBeInstanceOf(
                NotFoundException,
            );
            await expect(service.findOneForAdmin(7)).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });

        it('관리자가 공개 상태를 수정한다', async () => {
            queryBuilder.getOne.mockResolvedValue(schedule);
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
            queryBuilder.getOne.mockResolvedValue(schedule);
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
