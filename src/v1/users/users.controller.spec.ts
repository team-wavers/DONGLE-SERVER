import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { ForbiddenException } from '@nestjs/common';
import { ROLES } from '../auth/constants/roles';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
    const controllerMethod = <K extends keyof UsersController>(key: K) =>
        Object.getOwnPropertyDescriptor(UsersController.prototype, key)
            ?.value as UsersController[K] | undefined;

    let controller: UsersController;
    let usersService: {
        findAll: jest.Mock;
        findOne: jest.Mock;
        update: jest.Mock;
    };

    beforeEach(async () => {
        usersService = {
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
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
            const handler = controllerMethod('findOne') as unknown as (
                id: string,
                request: { user: { role: string; userId: number } },
            ) => unknown;

            const result = handler.call(controller, '1', {
                user: { role: ROLES.PRESIDENT, userId: 1 },
            });

            expect(usersService.findOne).toHaveBeenCalledWith(1);
            expect(result).toBe(user);
        });

        it('president는 본인만 조회할 수 있다', () => {
            const handler = controllerMethod('findOne') as unknown as (
                id: string,
                request: { user: { role: string; userId: number } },
            ) => unknown;

            expect(() =>
                handler.call(controller, '2', {
                    user: { role: ROLES.PRESIDENT, userId: 1 },
                }),
            ).toThrow(ForbiddenException);
        });

        it('admin은 다른 사용자도 조회할 수 있다', () => {
            const user = { id: 2, name: '사용자' };
            usersService.findOne.mockReturnValue(user);
            const handler = controllerMethod('findOne') as unknown as (
                id: string,
                request: { user: { role: string; userId: number } },
            ) => unknown;

            expect(
                handler.call(controller, '2', {
                    user: { role: ROLES.ADMIN, userId: 1 },
                }),
            ).toBe(user);
            expect(usersService.findOne).toHaveBeenCalledWith(2);
        });
    });

    describe('authorization metadata', () => {
        it('전체 사용자 목록은 admin만 허용한다', () => {
            expect(
                Reflect.getMetadata('roles', controllerMethod('findAll')!),
            ).toEqual([ROLES.ADMIN]);
        });
    });

    describe('update', () => {
        it('president는 본인 역할을 변경할 수 없다', () => {
            const handler = controllerMethod('update') as unknown as (
                id: string,
                dto: { role: string },
                request: { user: { role: string; userId: number } },
            ) => unknown;

            expect(() =>
                handler.call(
                    controller,
                    '1',
                    { role: ROLES.ADMIN },
                    { user: { role: ROLES.PRESIDENT, userId: 1 } },
                ),
            ).toThrow(ForbiddenException);
            expect(usersService.update).not.toHaveBeenCalled();
        });

        it('admin은 사용자 역할을 변경할 수 있다', () => {
            const handler = controllerMethod('update') as unknown as (
                id: string,
                dto: { role: string },
                request: { user: { role: string; userId: number } },
            ) => unknown;

            handler.call(
                controller,
                '2',
                { role: ROLES.PRESIDENT },
                { user: { role: ROLES.ADMIN, userId: 1 } },
            );

            expect(usersService.update).toHaveBeenCalledWith(2, {
                role: ROLES.PRESIDENT,
            });
        });
    });
});
