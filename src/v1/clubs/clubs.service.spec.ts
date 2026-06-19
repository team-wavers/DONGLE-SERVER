import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, UpdateResult } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { Club } from './entities/club.entity';
import { ClubsService } from './clubs.service';

const makeUpdateResult = (affected: number): UpdateResult => ({
    affected,
    generatedMaps: [],
    raw: [],
});

describe('ClubsService', () => {
    let service: ClubsService;
    let clubRepository: {
        create: jest.Mock;
        find: jest.Mock;
        findOne: jest.Mock;
        save: jest.Mock;
        update: jest.Mock;
    };
    let authService: {
        validateOneTimeKey: jest.Mock;
    };
    let usersService: {
        findOne: jest.Mock;
    };

    beforeEach(async () => {
        authService = {
            validateOneTimeKey: jest.fn(),
        };
        usersService = {
            findOne: jest.fn(),
        };
        clubRepository = {
            create: jest.fn((payload) => payload),
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ClubsService,
                {
                    provide: getRepositoryToken(Club),
                    useValue: clubRepository,
                },
                {
                    provide: ConfigService,
                    useValue: {},
                },
                {
                    provide: AuthService,
                    useValue: authService,
                },
                {
                    provide: UsersService,
                    useValue: usersService,
                },
            ],
        }).compile();

        service = module.get<ClubsService>(ClubsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('create는 모집일을 공통 날짜 포맷으로 파싱해 Seoul 기준 Date payload로 저장한다', async () => {
        authService.validateOneTimeKey.mockResolvedValue(true);
        clubRepository.save.mockImplementation(async (club) => club);

        await expect(
            service.create({
                key: 'one-time-key',
                name: '동아리',
                category: '학술',
                recruit_start: '2026-05-01 09:00:00',
                recruit_end: '2026-05-31',
            }),
        ).resolves.toMatchObject({
            recruit_start: new Date('2026-05-01T09:00:00+09:00'),
            recruit_end: new Date('2026-05-31T00:00:00+09:00'),
        });

        expect(clubRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                recruit_start: new Date('2026-05-01T09:00:00+09:00'),
                recruit_end: new Date('2026-05-31T00:00:00+09:00'),
            }),
        );
    });

    it('create는 문서화되지 않은 모집일 포맷을 거부한다', async () => {
        authService.validateOneTimeKey.mockResolvedValue(true);

        await expect(
            service.create({
                key: 'one-time-key',
                name: '동아리',
                category: '학술',
                recruit_start: '2026-05-01T00:00:00.000Z',
            }),
        ).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            message: '날짜 형식이 올바르지 않습니다.',
        });

        expect(clubRepository.create).not.toHaveBeenCalled();
    });

    it('findAll은 삭제되지 않은 동아리만 조회한다', async () => {
        const clubs = [{ id: 1, name: '동아리', deleted_at: null }];
        clubRepository.find.mockResolvedValue(clubs);

        await expect(service.findAll()).resolves.toBe(clubs);

        expect(clubRepository.find).toHaveBeenCalledWith({
            where: { deleted_at: IsNull() },
        });
    });

    it('findOne은 삭제되지 않은 동아리 단건을 조회한다', async () => {
        const club = { id: 1, name: '동아리', deleted_at: null };
        clubRepository.findOne.mockResolvedValue(club);

        await expect(service.findOne(1)).resolves.toBe(club);

        expect(clubRepository.findOne).toHaveBeenCalledWith({
            where: { id: 1, deleted_at: IsNull() },
            relations: ['president', 'reports'],
        });
    });

    it('findOne은 대상이 없으면 Not Found를 던진다', async () => {
        clubRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne(404)).rejects.toMatchObject({
            status: HttpStatus.NOT_FOUND,
            message: '해당 동아리가 존재하지 않습니다.',
        });
    });

    it('update는 삭제되지 않은 동아리만 수정한다', async () => {
        const updateClubDto = {
            name: '수정된 동아리',
            recruit_start: '2026-06-01 09:30:00',
        };
        const result = makeUpdateResult(1);
        clubRepository.update.mockResolvedValue(result);

        await expect(service.update(1, updateClubDto)).resolves.toBe(result);

        expect(clubRepository.update).toHaveBeenCalledWith(
            { id: 1, deleted_at: IsNull() },
            {
                name: '수정된 동아리',
                recruit_start: new Date('2026-06-01T09:30:00+09:00'),
            },
        );
    });

    it('update는 이미 삭제된 동아리를 거부한다', async () => {
        clubRepository.update.mockResolvedValue(makeUpdateResult(0));

        await expect(service.update(1, { name: '수정된 동아리' })).rejects.toEqual(
            new HttpException(
                '해당 동아리가 존재하지 않습니다.',
                HttpStatus.BAD_REQUEST,
            ),
        );

        expect(clubRepository.update).toHaveBeenCalledWith(
            { id: 1, deleted_at: IsNull() },
            { name: '수정된 동아리' },
        );
    });

    it('delete는 삭제되지 않은 동아리만 삭제 처리한다', async () => {
        const result = makeUpdateResult(1);
        clubRepository.update.mockResolvedValue(result);

        await expect(service.delete(1)).resolves.toBe(result);

        expect(clubRepository.update).toHaveBeenCalledWith(
            { id: 1, deleted_at: IsNull() },
            { deleted_at: expect.any(Date) },
        );
    });

    it('delete는 이미 삭제된 동아리를 거부한다', async () => {
        clubRepository.update.mockResolvedValue(makeUpdateResult(0));

        await expect(service.delete(1)).rejects.toEqual(
            new HttpException(
                '해당 동아리가 존재하지 않습니다.',
                HttpStatus.BAD_REQUEST,
            ),
        );

        expect(clubRepository.update).toHaveBeenCalledWith(
            { id: 1, deleted_at: IsNull() },
            { deleted_at: expect.any(Date) },
        );
    });
});
