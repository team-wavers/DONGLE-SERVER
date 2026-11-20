import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getMetadataArgsStorage, In, IsNull, Not } from 'typeorm';
import { Club } from '../clubs/entities/club.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
    let service: UsersService;
    let userRepository: {
        find: jest.Mock;
        findOne: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
        update: jest.Mock;
    };

    beforeEach(async () => {
        userRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn((user) => user),
            save: jest.fn(async (user) => user),
            update: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: getRepositoryToken(User),
                    useValue: userRepository,
                },
                {
                    provide: getRepositoryToken(Club),
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('비밀번호와 refresh token은 기본 entity 조회에서 제외한다', () => {
        const hiddenColumns = getMetadataArgsStorage()
            .columns.filter(({ target }) => target === User)
            .filter(({ options }) => options.select === false)
            .map(({ propertyName }) => propertyName);

        expect(hiddenColumns).toEqual(
            expect.arrayContaining(['password', 'refresh_token']),
        );
    });

    it('로그인 조회는 인증 검증에 필요한 password를 명시적으로 선택한다', async () => {
        userRepository.findOne.mockResolvedValue(null);

        await service.findByLoginId('user1');

        expect(userRepository.findOne).toHaveBeenCalledWith({
            where: { login_id: 'user1', deleted_at: IsNull() },
            select: expect.arrayContaining([
                'id',
                'login_id',
                'name',
                'role',
                'password',
            ]),
        });
    });

    it('토큰 갱신용 사용자 조회는 저장된 refresh token을 명시적으로 선택한다', async () => {
        userRepository.findOne.mockResolvedValue(null);

        await service.findOneIncludingSystemForRefresh(1);

        expect(userRepository.findOne).toHaveBeenCalledWith({
            where: { id: 1, deleted_at: IsNull() },
            select: expect.arrayContaining([
                'id',
                'login_id',
                'name',
                'role',
                'refresh_token',
            ]),
        });
    });

    it('일반 인증 사용자 조회는 refresh token을 명시적으로 선택하지 않는다', async () => {
        userRepository.findOne.mockResolvedValue(null);

        await service.findOneIncludingSystem(1);

        expect(userRepository.findOne).toHaveBeenCalledWith({
            where: { id: 1, deleted_at: IsNull() },
        });
    });

    it('findAll은 사용자 공개 필드만 반환한다', async () => {
        const createdAt = new Date('2026-01-01T00:00:00Z');
        const updatedAt = new Date('2026-01-02T00:00:00Z');
        userRepository.find.mockResolvedValue([
            {
                id: 1,
                name: '사용자',
                login_id: 'user1',
                role: 'admin',
                phone: '010-1234-5678',
                created_at: createdAt,
                updated_at: updatedAt,
                deleted_at: null,
                password: 'hashed-password',
                refresh_token: 'stored-token',
            },
        ]);

        await expect(service.findAll()).resolves.toEqual([
            {
                id: 1,
                name: '사용자',
                login_id: 'user1',
                role: 'admin',
                phone: '010-1234-5678',
                created_at: createdAt,
                updated_at: updatedAt,
                deleted_at: null,
            },
        ]);
    });

    it('create는 저장된 인증 비밀을 일반 생성 응답에 포함하지 않는다', async () => {
        userRepository.findOne.mockResolvedValue(null);
        userRepository.save.mockResolvedValue({
            id: 7,
            name: '사용자',
            login_id: 'user1',
            role: 'admin',
            phone: '010-1234-5678',
            created_at: new Date('2026-01-01T00:00:00Z'),
            updated_at: new Date('2026-01-01T00:00:00Z'),
            deleted_at: null,
            password: 'hashed-password',
            refresh_token: null,
        });

        await expect(
            service.create({
                name: '사용자',
                login_id: 'user1',
                password: 'password',
                role: 'admin',
                phone: '01012345678',
            }),
        ).resolves.toEqual({
            id: 7,
            name: '사용자',
            login_id: 'user1',
            role: 'admin',
            phone: '010-1234-5678',
            created_at: new Date('2026-01-01T00:00:00Z'),
            updated_at: new Date('2026-01-01T00:00:00Z'),
            deleted_at: null,
        });
    });

    it('필수값이 누락되면 Bad Request를 던진다', async () => {
        await expect(service.create({} as never)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            message: '필수값이 누락되었습니다.',
        });
    });

    it('create는 전화번호를 정규화해 저장한다', async () => {
        userRepository.findOne.mockResolvedValue(null);

        await service.create({
            name: '사용자',
            login_id: 'user1',
            password: 'password',
            role: 'admin',
            phone: '010 1234 5678',
        });

        expect(userRepository.findOne).toHaveBeenNthCalledWith(2, {
            where: {
                deleted_at: IsNull(),
                phone: In(['010-1234-5678', '01012345678']),
            },
        });
        expect(userRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ phone: '010-1234-5678' }),
        );
    });

    it.each([
        ['01012345678', '010-1234-5678'],
        ['010-1234-5678', '01012345678'],
    ])(
        'create는 기존 전화번호 %s와 입력 %s의 형식 차이 중복을 PHONE_DUPLICATED로 거부한다',
        async (existingPhone, inputPhone) => {
            userRepository.findOne
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ phone: existingPhone });

            await expect(
                service.create({
                    name: '사용자',
                    login_id: 'user1',
                    password: 'password',
                    role: 'admin',
                    phone: inputPhone,
                }),
            ).rejects.toMatchObject({
                response: {
                    message: '이미 사용 중인 전화번호입니다.',
                    code: 'PHONE_DUPLICATED',
                },
            });
        },
    );

    it('중복 로그인 아이디는 LOGIN_ID_DUPLICATED 코드로 거부한다', async () => {
        userRepository.findOne.mockResolvedValue({ login_id: 'user1' });

        await expect(
            service.create({
                name: '사용자',
                login_id: 'user1',
                password: 'password',
                role: 'admin',
                phone: '01012345678',
            }),
        ).rejects.toMatchObject({
            response: {
                message: '이미 사용 중인 로그인 아이디입니다.',
                code: 'LOGIN_ID_DUPLICATED',
            },
        });
    });

    it('update는 본인 번호를 제외하고 정규화한 번호로 중복을 조회한 뒤 정규화해 저장한다', async () => {
        userRepository.findOne
            .mockResolvedValueOnce({ id: 7, is_system: false })
            .mockResolvedValueOnce(null);

        await service.update(7, { phone: '01012345678' });

        expect(userRepository.findOne).toHaveBeenNthCalledWith(2, {
            where: {
                deleted_at: IsNull(),
                id: Not(7),
                phone: In(['010-1234-5678', '01012345678']),
            },
        });
        expect(userRepository.update).toHaveBeenCalledWith(7, {
            phone: '010-1234-5678',
        });
    });

    it.each([null, 'superuser'])(
        'update는 유효하지 않은 역할 %s를 Bad Request로 거부한다',
        async (role) => {
            await expect(
                service.update(7, { role } as never),
            ).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                message: '유효하지 않은 역할입니다.',
            });

            expect(userRepository.findOne).not.toHaveBeenCalled();
            expect(userRepository.update).not.toHaveBeenCalled();
        },
    );

    it('update는 admin이 지정한 유효한 역할을 저장한다', async () => {
        userRepository.findOne.mockResolvedValue({ id: 7, is_system: false });

        await service.update(7, { role: 'president' });

        expect(userRepository.update).toHaveBeenCalledWith(7, {
            role: 'president',
        });
    });

    describe('findOne', () => {
        it('삭제되지 않은 일반 사용자 단건을 조회한다', async () => {
            const createdAt = new Date('2026-01-01T00:00:00Z');
            const updatedAt = new Date('2026-01-02T00:00:00Z');
            const user = {
                id: 1,
                name: '사용자',
                login_id: 'user1',
                role: 'admin',
                phone: '010-1234-5678',
                created_at: createdAt,
                updated_at: updatedAt,
                deleted_at: null,
                password: 'hashed-password',
                refresh_token: 'stored-token',
                is_system: false,
            };
            userRepository.findOne.mockResolvedValue(user);

            await expect(service.findOne(1)).resolves.toEqual({
                id: 1,
                name: '사용자',
                login_id: 'user1',
                role: 'admin',
                phone: '010-1234-5678',
                created_at: createdAt,
                updated_at: updatedAt,
                deleted_at: null,
            });

            expect(userRepository.findOne).toHaveBeenCalledWith({
                where: {
                    id: 1,
                    deleted_at: IsNull(),
                    is_system: false,
                },
            });
        });

        it('대상이 없으면 Not Found를 던진다', async () => {
            userRepository.findOne.mockResolvedValue(null);

            await expect(service.findOne(404)).rejects.toMatchObject({
                status: HttpStatus.NOT_FOUND,
                message: '사용자를 찾을 수 없습니다.',
            });
        });
    });
});
