import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
    let controller: UsersController;
    let usersService: {
        findOne: jest.Mock;
    };

    beforeEach(async () => {
        usersService = {
            findOne: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                {
                    provide: UsersService,
                    useValue: usersService,
                },
                {
                    provide: AuthService,
                    useValue: {},
                },
            ],
        }).compile();

        controller = module.get<UsersController>(UsersController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('findOne', () => {
        it('사용자 단건 조회를 service에 위임한다', () => {
            const user = { id: 1, name: '사용자' };
            usersService.findOne.mockReturnValue(user);

            const result = controller.findOne('1');

            expect(usersService.findOne).toHaveBeenCalledWith(1);
            expect(result).toBe(user);
        });
    });
});
