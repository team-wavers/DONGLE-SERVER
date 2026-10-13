import {
    HttpException,
    HttpStatus,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, IsNull, UpdateResult } from 'typeorm';
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
        isOneTimeKeyValid: jest.Mock;
        consumeOneTimeKey: jest.Mock;
    };
    let usersService: {
        findOne: jest.Mock;
        create: jest.Mock;
    };
    let dataSource: {
        transaction: jest.Mock;
    };
    let transactionManager: {
        getRepository: jest.Mock;
    };
    let transactionClubRepository: {
        create: jest.Mock;
        save: jest.Mock;
    };

    beforeEach(async () => {
        authService = {
            validateOneTimeKey: jest.fn(),
            isOneTimeKeyValid: jest.fn(),
            consumeOneTimeKey: jest.fn(),
        };
        usersService = {
            findOne: jest.fn(),
            create: jest.fn(),
        };
        clubRepository = {
            create: jest.fn((payload) => payload),
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
        };
        transactionClubRepository = {
            create: jest.fn((payload) => payload),
            save: jest.fn(),
        };
        transactionManager = {
            getRepository: jest.fn(() => transactionClubRepository),
        };
        dataSource = {
            transaction: jest.fn((callback) => callback(transactionManager)),
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
                {
                    provide: DataSource,
                    useValue: dataSource,
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

    it.each([
        ['같은', '2026-05-31', '2026-05-31'],
        ['늦은', '2026-06-01', '2026-05-31'],
    ])(
        'create는 모집 시작일이 종료일보다 %s 경우 거부한다',
        async (_, start, end) => {
            await expect(
                service.create({
                    key: 'one-time-key',
                    name: '동아리',
                    category: '학술',
                    president_id: 1,
                    recruit_start: start,
                    recruit_end: end,
                }),
            ).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                message: '모집 시작일은 종료일보다 이전이어야 합니다.',
            });

            expect(authService.validateOneTimeKey).not.toHaveBeenCalled();
            expect(clubRepository.save).not.toHaveBeenCalled();
        },
    );

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

    it('update는 두 모집일의 시작이 종료일보다 늦으면 거부한다', async () => {
        await expect(
            service.update(1, {
                recruit_start: '2026-06-01',
                recruit_end: '2026-05-31',
            }),
        ).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            message: '모집 시작일은 종료일보다 이전이어야 합니다.',
        });

        expect(clubRepository.update).not.toHaveBeenCalled();
    });

    it('create는 null 모집일을 명시적 비우기로 저장한다', async () => {
        authService.validateOneTimeKey.mockResolvedValue(true);
        clubRepository.save.mockImplementation(async (club) => club);

        await expect(
            service.create({
                key: 'one-time-key',
                name: '동아리',
                category: '학술',
                recruit_start: null,
                recruit_end: null,
            }),
        ).resolves.toMatchObject({
            recruit_start: null,
            recruit_end: null,
        });

        expect(clubRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                recruit_start: null,
                recruit_end: null,
            }),
        );
    });

    it('create는 newPresident가 있으면 User 생성과 키 소모, Club 생성을 하나의 트랜잭션으로 처리한다', async () => {
        authService.isOneTimeKeyValid.mockResolvedValue(true);
        authService.consumeOneTimeKey.mockResolvedValue(true);
        usersService.create.mockResolvedValue({ id: 99 });
        transactionClubRepository.save.mockImplementation(
            async (club) => club,
        );

        const result = await service.create({
            key: 'one-time-key',
            name: '동아리',
            category: '학술',
            newPresident: {
                name: '회장',
                login_id: 'president1',
                password: 'password',
                phone: '01000000000',
            },
        });

        expect(authService.isOneTimeKeyValid).toHaveBeenCalledWith(
            'one-time-key',
        );
        expect(dataSource.transaction).toHaveBeenCalled();
        expect(authService.consumeOneTimeKey).toHaveBeenCalledWith(
            'one-time-key',
            transactionManager,
        );
        expect(usersService.create).toHaveBeenCalledWith(
            {
                name: '회장',
                login_id: 'president1',
                password: 'password',
                phone: '01000000000',
                role: 'president',
            },
            transactionManager,
        );
        expect(transactionClubRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ president_id: 99 }),
        );
        expect(result).toMatchObject({ president_id: 99 });
        expect(clubRepository.save).not.toHaveBeenCalled();
    });

    it('create는 키가 이미 만료/사용됐으면 트랜잭션을 시작하지 않는다', async () => {
        authService.isOneTimeKeyValid.mockResolvedValue(false);

        await expect(
            service.create({
                key: 'expired-key',
                name: '동아리',
                category: '학술',
                newPresident: {
                    name: '회장',
                    login_id: 'president1',
                    password: 'password',
                    phone: '01000000000',
                },
            }),
        ).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            message:
                '이미 사용되었거나 유효하지 않은 키입니다. 방금 입력한 아이디로 로그인해 보시고, 안 되면 총동연에 문의해주세요.',
        });

        expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('create는 트랜잭션 안에서 키 소모에 실패해도 새 등록 메시지로 거부한다', async () => {
        authService.isOneTimeKeyValid.mockResolvedValue(true);
        authService.consumeOneTimeKey.mockResolvedValue(false);

        await expect(
            service.create({
                key: 'used-key',
                name: '동아리',
                category: '학술',
                newPresident: {
                    name: '회장',
                    login_id: 'president1',
                    password: 'password1',
                    phone: '01012345678',
                },
            }),
        ).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            message:
                '이미 사용되었거나 유효하지 않은 키입니다. 방금 입력한 아이디로 로그인해 보시고, 안 되면 총동연에 문의해주세요.',
        });
    });

    it('create는 동아리 저장이 실패하면 트랜잭션이 롤백돼 회장 계정도 남지 않는다', async () => {
        authService.isOneTimeKeyValid.mockResolvedValue(true);
        authService.consumeOneTimeKey.mockResolvedValue(true);
        usersService.create.mockResolvedValue({ id: 99 });
        transactionClubRepository.save.mockRejectedValue(
            new Error('club save failed'),
        );

        await expect(
            service.create({
                key: 'one-time-key',
                name: '동아리',
                category: '학술',
                newPresident: {
                    name: '회장',
                    login_id: 'president1',
                    password: 'password',
                    phone: '01000000000',
                },
            }),
        ).rejects.toThrow('club save failed');

        // 실제 롤백은 TypeORM의 dataSource.transaction()이 예외 전파로 처리한다.
        // 여기서는 콜백이 예외를 그대로 던져 트랜잭션이 커밋되지 않는지만 확인한다.
        expect(usersService.create).toHaveBeenCalled();
    });

    it('create는 계정 중복 충돌 뒤 같은 키로 재시도할 수 있다', async () => {
        let keyConsumed = false;
        dataSource.transaction.mockImplementation(async (callback) => {
            const previousKeyConsumed = keyConsumed;
            try {
                return await callback(transactionManager);
            } catch (error) {
                keyConsumed = previousKeyConsumed;
                throw error;
            }
        });
        authService.isOneTimeKeyValid.mockImplementation(
            async () => !keyConsumed,
        );
        authService.consumeOneTimeKey.mockImplementation(async () => {
            if (keyConsumed) return false;
            keyConsumed = true;
            return true;
        });
        usersService.create
            .mockRejectedValueOnce(
                new ConflictException('이미 사용 중인 로그인 아이디입니다.'),
            )
            .mockResolvedValueOnce({ id: 101 });
        transactionClubRepository.save.mockImplementation(async (club) => club);
        const request = {
            key: 'retryable-key',
            name: '동아리',
            category: '학술',
            newPresident: {
                name: '회장',
                login_id: 'president1',
                password: 'password1',
                phone: '01012345678',
            },
        };

        await expect(service.create(request)).rejects.toBeInstanceOf(
            ConflictException,
        );
        await expect(service.create(request)).resolves.toMatchObject({
            president_id: 101,
        });

        expect(authService.consumeOneTimeKey).toHaveBeenNthCalledWith(
            1,
            'retryable-key',
            transactionManager,
        );
        expect(authService.consumeOneTimeKey).toHaveBeenNthCalledWith(
            2,
            'retryable-key',
            transactionManager,
        );
        expect(keyConsumed).toBe(true);
        expect(authService.validateOneTimeKey).not.toHaveBeenCalled();
    });

    it('create는 존재하지 않는 president_id를 거부한다', async () => {
        usersService.findOne.mockRejectedValue(
            new NotFoundException('사용자를 찾을 수 없습니다.'),
        );

        await expect(
            service.create({
                key: 'one-time-key',
                name: '동아리',
                category: '학술',
                president_id: 404,
            }),
        ).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            message: '존재하지 않는 사용자입니다.',
        });

        expect(clubRepository.save).not.toHaveBeenCalled();
        expect(authService.validateOneTimeKey).not.toHaveBeenCalled();
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
            recruit_end: null,
        };
        const result = makeUpdateResult(1);
        clubRepository.update.mockResolvedValue(result);

        await expect(service.update(1, updateClubDto)).resolves.toBe(result);

        expect(clubRepository.update).toHaveBeenCalledWith(
            { id: 1, deleted_at: IsNull() },
            {
                name: '수정된 동아리',
                recruit_start: new Date('2026-06-01T09:30:00+09:00'),
                recruit_end: null,
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
