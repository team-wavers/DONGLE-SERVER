import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Club } from '../../clubs/entities/club.entity';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

type MockedUsersService = Pick<UsersService, 'findOneIncludingSystem'>;

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;
    let usersService: jest.Mocked<MockedUsersService>;
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
    } as User;

    const presidentUser = {
        id: 2,
        login_id: 'president_login',
        name: '회장',
        role: 'president',
    } as User;

    beforeEach(() => {
        const configService = {
            get: jest.fn((key: string) => {
                if (key === 'JWT_ACCESS_SECRET') {
                    return 'access-secret';
                }

                return undefined;
            }),
        } as unknown as ConfigService;
        usersService = {
            findOneIncludingSystem: jest.fn(),
        };
        clubQueryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn(),
        };
        clubRepository = {
            createQueryBuilder: jest.fn().mockReturnValue(clubQueryBuilder),
        };

        strategy = new JwtStrategy(
            configService,
            usersService as unknown as UsersService,
            clubRepository as unknown as Repository<Club>,
        );
    });

    it('사용자가 없으면 UnauthorizedException을 던진다', async () => {
        usersService.findOneIncludingSystem.mockResolvedValue(null);

        await expect(
            strategy.validate({
                sub: 999,
                login_id: 'missing_user',
                name: '없는 사용자',
                role: 'admin',
                club_id: null,
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        expect(usersService.findOneIncludingSystem).toHaveBeenCalledWith(999);
        expect(clubRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it.each([
        ['login_id', { login_id: 'tampered_login' }],
        ['name', { name: '변조된 이름' }],
        ['role', { role: 'president' }],
    ])(
        '%s payload가 사용자 정보와 불일치하면 UnauthorizedException을 던진다',
        async (_, override) => {
            usersService.findOneIncludingSystem.mockResolvedValue(adminUser);

            await expect(
                strategy.validate({
                    sub: adminUser.id,
                    login_id: adminUser.login_id,
                    name: adminUser.name,
                    role: 'admin',
                    club_id: null,
                    ...override,
                }),
            ).rejects.toBeInstanceOf(UnauthorizedException);

            expect(clubRepository.createQueryBuilder).not.toHaveBeenCalled();
        },
    );

    it('president payload의 club_id가 관리 동아리와 불일치하면 UnauthorizedException을 던진다', async () => {
        usersService.findOneIncludingSystem.mockResolvedValue(presidentUser);
        clubQueryBuilder.getOne.mockResolvedValue({ id: 10 } as Club);

        await expect(
            strategy.validate({
                sub: presidentUser.id,
                login_id: presidentUser.login_id,
                name: presidentUser.name,
                role: 'president',
                club_id: 20,
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        expect(clubQueryBuilder.where).toHaveBeenCalledWith(
            'club.president_id = :userId',
            { userId: presidentUser.id },
        );
        expect(clubQueryBuilder.andWhere).toHaveBeenCalledWith(
            'club.deleted_at IS NULL',
        );
    });

    it('일반 사용자 payload에 club_id가 포함되면 UnauthorizedException을 던진다', async () => {
        usersService.findOneIncludingSystem.mockResolvedValue(adminUser);

        await expect(
            strategy.validate({
                sub: adminUser.id,
                login_id: adminUser.login_id,
                name: adminUser.name,
                role: 'admin',
                club_id: 10,
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        expect(clubRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('정상 president payload를 통과시키고 JWT의 club_id를 반환한다', async () => {
        usersService.findOneIncludingSystem.mockResolvedValue(presidentUser);
        clubQueryBuilder.getOne.mockResolvedValue({ id: 10 } as Club);

        await expect(
            strategy.validate({
                sub: presidentUser.id,
                login_id: presidentUser.login_id,
                name: presidentUser.name,
                role: 'president',
                club_id: 10,
            }),
        ).resolves.toEqual({
            userId: presidentUser.id,
            login_id: presidentUser.login_id,
            name: presidentUser.name,
            role: presidentUser.role,
            club_id: 10,
        });
    });

    it('정상 일반 사용자 payload를 통과시키고 club_id null을 반환한다', async () => {
        usersService.findOneIncludingSystem.mockResolvedValue(adminUser);

        await expect(
            strategy.validate({
                sub: adminUser.id,
                login_id: adminUser.login_id,
                name: adminUser.name,
                role: 'admin',
                club_id: null,
            }),
        ).resolves.toEqual({
            userId: adminUser.id,
            login_id: adminUser.login_id,
            name: adminUser.name,
            role: adminUser.role,
            club_id: null,
        });
    });
});
