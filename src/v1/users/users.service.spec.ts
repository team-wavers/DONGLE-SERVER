import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, IsNull, Not } from 'typeorm';
import { Club } from '../clubs/entities/club.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
    let service: UsersService;
    let userRepository: {
        findOne: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
        update: jest.Mock;
    };

    beforeEach(async () => {
        userRepository = {
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

    describe('findOne', () => {
        it('삭제되지 않은 일반 사용자 단건을 조회한다', async () => {
            const user = { id: 1, name: '사용자', is_system: false };
            userRepository.findOne.mockResolvedValue(user);

            await expect(service.findOne(1)).resolves.toBe(user);

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
