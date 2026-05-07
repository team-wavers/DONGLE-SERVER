import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Club } from '../clubs/entities/club.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { OneTimeKey } from './entities/one_time_key.entity';

type MockedUsersService = Pick<
    UsersService,
    'validateUser' | 'findOneIncludingSystem' | 'updateRefreshToken'
>;

describe('AuthService', () => {
    let service: AuthService;
    let usersService: jest.Mocked<MockedUsersService>;
    let jwtService: jest.Mocked<Pick<JwtService, 'sign' | 'verify'>>;
    let configService: {
        get: jest.Mock;
    };
    let clubRepository: {
        createQueryBuilder: jest.Mock;
    };
    let clubQueryBuilder: {
        where: jest.Mock;
        andWhere: jest.Mock;
        getOne: jest.Mock;
    };

    const adminUser = {
        id: 1,
        login_id: 'admin_login',
        name: '관리자',
        role: 'admin',
        refresh_token: 'stored-refresh-token',
    } as User;

    const presidentUser = {
        id: 2,
        login_id: 'president_login',
        name: '회장',
        role: 'president',
        refresh_token: 'stored-refresh-token',
    } as User;

    beforeEach(() => {
        usersService = {
            validateUser: jest.fn(),
            findOneIncludingSystem: jest.fn(),
            updateRefreshToken: jest.fn(),
        };
        jwtService = {
            sign: jest.fn(),
            verify: jest.fn(),
        };
        configService = {
            get: jest.fn((key: string) => {
                const values: Record<string, string> = {
                    JWT_ACCESS_SECRET: 'access-secret',
                    JWT_REFRESH_SECRET: 'refresh-secret',
                    JWT_ACCESS_EXPIRE_TIME: '15m',
                    JWT_REFRESH_EXPIRE_TIME: '7d',
                };

                return values[key];
            }),
        };
        clubQueryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn(),
        };
        clubRepository = {
            createQueryBuilder: jest.fn().mockReturnValue(clubQueryBuilder),
        };

        service = new AuthService(
            usersService as unknown as UsersService,
            jwtService as unknown as JwtService,
            configService as unknown as ConfigService,
            {} as Repository<OneTimeKey>,
            clubRepository as unknown as Repository<Club>,
        );
    });

    describe('login', () => {
        it('사용자가 없거나 비밀번호 검증에 실패하면 UnauthorizedException을 던진다', async () => {
            usersService.validateUser.mockResolvedValue(null);

            await expect(
                service.login({
                    login_id: 'missing_user',
                    password: 'wrong_password',
                }),
            ).rejects.toBeInstanceOf(UnauthorizedException);

            expect(usersService.validateUser).toHaveBeenCalledWith(
                'missing_user',
                'wrong_password',
            );
            expect(jwtService.sign).not.toHaveBeenCalled();
            expect(usersService.updateRefreshToken).not.toHaveBeenCalled();
        });

        it('토큰을 생성하고 생성된 refresh token 저장을 호출한다', async () => {
            usersService.validateUser.mockResolvedValue(adminUser);
            jwtService.sign
                .mockReturnValueOnce('new-access-token')
                .mockReturnValueOnce('new-refresh-token');

            const result = await service.login({
                login_id: 'admin_login',
                password: 'password',
            });

            expect(result).toEqual({
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token',
                tokenType: 'Bearer',
                expiresIn: 15 * 60 * 1000,
            });
            expect(jwtService.sign).toHaveBeenNthCalledWith(
                1,
                {
                    sub: adminUser.id,
                    login_id: adminUser.login_id,
                    name: adminUser.name,
                    role: 'admin',
                    club_id: null,
                },
                { secret: 'access-secret', expiresIn: '15m' },
            );
            expect(jwtService.sign).toHaveBeenNthCalledWith(
                2,
                {
                    sub: adminUser.id,
                    login_id: adminUser.login_id,
                    name: adminUser.name,
                    role: 'admin',
                    club_id: null,
                },
                { secret: 'refresh-secret', expiresIn: '7d' },
            );
            expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
                adminUser.id,
                'new-refresh-token',
            );
            expect(clubRepository.createQueryBuilder).not.toHaveBeenCalled();
        });

        it('president 로그인 토큰에는 관리 중인 club_id를 포함한다', async () => {
            usersService.validateUser.mockResolvedValue(presidentUser);
            clubQueryBuilder.getOne.mockResolvedValue({ id: 10 } as Club);
            jwtService.sign
                .mockReturnValueOnce('president-access-token')
                .mockReturnValueOnce('president-refresh-token');

            await service.login({
                login_id: 'president_login',
                password: 'password',
            });

            expect(clubQueryBuilder.where).toHaveBeenCalledWith(
                'club.president_id = :userId',
                { userId: presidentUser.id },
            );
            expect(clubQueryBuilder.andWhere).toHaveBeenCalledWith(
                'club.deleted_at IS NULL',
            );
            expect(jwtService.sign).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({ club_id: 10, role: 'president' }),
                expect.any(Object),
            );
        });
    });

    describe('refreshToken', () => {
        it('만료된 refresh token이면 UnauthorizedException을 던진다', async () => {
            const error = new Error('jwt expired');
            error.name = 'TokenExpiredError';
            jwtService.verify.mockImplementation(() => {
                throw error;
            });

            await expect(
                service.refreshToken({ refreshToken: 'expired-refresh-token' }),
            ).rejects.toBeInstanceOf(UnauthorizedException);

            expect(jwtService.verify).toHaveBeenCalledWith(
                'expired-refresh-token',
                { secret: 'refresh-secret' },
            );
            expect(usersService.findOneIncludingSystem).not.toHaveBeenCalled();
            expect(usersService.updateRefreshToken).not.toHaveBeenCalled();
        });

        it('invalid refresh token이면 UnauthorizedException을 던진다', async () => {
            const error = new Error('invalid token');
            error.name = 'JsonWebTokenError';
            jwtService.verify.mockImplementation(() => {
                throw error;
            });

            await expect(
                service.refreshToken({ refreshToken: 'invalid-refresh-token' }),
            ).rejects.toBeInstanceOf(UnauthorizedException);

            expect(usersService.findOneIncludingSystem).not.toHaveBeenCalled();
            expect(usersService.updateRefreshToken).not.toHaveBeenCalled();
        });

        it('저장된 refresh token과 요청 token이 다르면 UnauthorizedException을 던진다', async () => {
            jwtService.verify.mockReturnValue({ sub: adminUser.id });
            usersService.findOneIncludingSystem.mockResolvedValue({
                ...adminUser,
                refresh_token: 'different-refresh-token',
            } as User);

            await expect(
                service.refreshToken({ refreshToken: 'stored-refresh-token' }),
            ).rejects.toBeInstanceOf(UnauthorizedException);

            expect(usersService.findOneIncludingSystem).toHaveBeenCalledWith(
                adminUser.id,
            );
            expect(jwtService.sign).not.toHaveBeenCalled();
            expect(usersService.updateRefreshToken).not.toHaveBeenCalled();
        });

        it('사용자가 없으면 UnauthorizedException을 던진다', async () => {
            jwtService.verify.mockReturnValue({ sub: 999 });
            usersService.findOneIncludingSystem.mockResolvedValue(null);

            await expect(
                service.refreshToken({ refreshToken: 'stored-refresh-token' }),
            ).rejects.toBeInstanceOf(UnauthorizedException);

            expect(usersService.findOneIncludingSystem).toHaveBeenCalledWith(
                999,
            );
            expect(usersService.updateRefreshToken).not.toHaveBeenCalled();
        });

        it('refresh token rotation 성공 시 새 토큰을 발급하고 새 refresh token을 저장한다', async () => {
            jwtService.verify.mockReturnValue({ sub: adminUser.id });
            usersService.findOneIncludingSystem.mockResolvedValue(adminUser);
            jwtService.sign
                .mockReturnValueOnce('rotated-access-token')
                .mockReturnValueOnce('rotated-refresh-token');

            const result = await service.refreshToken({
                refreshToken: 'stored-refresh-token',
            });

            expect(result).toEqual({
                accessToken: 'rotated-access-token',
                refreshToken: 'rotated-refresh-token',
                tokenType: 'Bearer',
                expiresIn: 15 * 60 * 1000,
            });
            expect(jwtService.verify).toHaveBeenCalledWith(
                'stored-refresh-token',
                { secret: 'refresh-secret' },
            );
            expect(jwtService.sign).toHaveBeenCalledTimes(2);
            expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
                adminUser.id,
                'rotated-refresh-token',
            );
        });
    });
});
