import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { Club } from '../clubs/entities/club.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
    let service: UsersService;
    let userRepository: {
        findOne: jest.Mock;
    };

    beforeEach(async () => {
        userRepository = {
            findOne: jest.fn(),
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
