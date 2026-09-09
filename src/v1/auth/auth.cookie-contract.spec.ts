import {
    Controller,
    Get,
    INestApplication,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { Club } from '../clubs/entities/club.entity';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { createValidationPipe } from '../../common/create-validation-pipe';

@Controller('protected')
@UseGuards(JwtAuthGuard)
class ProtectedContractController {
    @Get()
    getProtectedResource() {
        return { ok: true };
    }
}

type CookieName = 'accessToken' | 'refreshToken';

const findCookie = (cookies: string[] | undefined, name: CookieName): string => {
    const cookie = cookies?.find((value) => value.startsWith(`${name}=`));
    expect(cookie).toBeDefined();
    return cookie as string;
};

const expiresAt = (cookie: string): number => {
    const expires = cookie.match(/; Expires=([^;]+)/i)?.[1];
    expect(expires).toBeDefined();
    return Math.floor(new Date(expires as string).getTime() / 1000);
};

const setCookieHeaders = (headers: Record<string, unknown>): string[] | undefined => {
    const value = headers['set-cookie'];
    if (Array.isArray(value)) {
        return value as string[];
    }
    return typeof value === 'string' ? [value] : undefined;
};

describe('Auth cookie HTTP contract', () => {
    let app: INestApplication<App>;
    const authService = {
        login: jest.fn(),
        refreshToken: jest.fn(),
        logout: jest.fn(),
    };
    const usersService = {
        findOneIncludingSystem: jest.fn(),
    };
    const jwtService = new JwtService();
    const admin = {
        id: 7,
        login_id: 'admin_login',
        name: '관리자',
        role: 'admin',
    };

    const signAccessToken = (expiresIn: number) =>
        jwtService.sign(
            {
                sub: admin.id,
                login_id: admin.login_id,
                name: admin.name,
                role: admin.role,
                club_id: null,
            },
            { secret: 'access-secret', expiresIn },
        );

    beforeEach(async () => {
        jest.clearAllMocks();
        usersService.findOneIncludingSystem.mockResolvedValue(admin);
        authService.login.mockResolvedValue({
            accessToken: signAccessToken(15 * 60),
            refreshToken: jwtService.sign(
                { sub: admin.id },
                { secret: 'refresh-secret', expiresIn: 7 * 24 * 60 * 60 },
            ),
            tokenType: 'Bearer',
            expiresIn: 15 * 60 * 1000,
        });
        authService.refreshToken.mockResolvedValue({
            accessToken: signAccessToken(15 * 60),
            refreshToken: jwtService.sign(
                { sub: admin.id },
                { secret: 'refresh-secret', expiresIn: 7 * 24 * 60 * 60 },
            ),
            tokenType: 'Bearer',
            expiresIn: 15 * 60 * 1000,
        });
        authService.logout.mockResolvedValue({ message: '로그아웃되었습니다.' });

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
            controllers: [AuthController, ProtectedContractController],
            providers: [
                JwtAuthGuard,
                JwtStrategy,
                {
                    provide: AuthService,
                    useValue: authService,
                },
                {
                    provide: UsersService,
                    useValue: usersService,
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) =>
                            key === 'JWT_ACCESS_SECRET' ? 'access-secret' : undefined,
                        ),
                    },
                },
                {
                    provide: getRepositoryToken(Club),
                    useValue: {} as Repository<Club>,
                },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('v1/auth');
        app.useGlobalPipes(createValidationPipe());
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('login은 body 하위호환을 유지하면서 JWT exp와 같은 만료의 보안 쿠키 두 개를 발급한다', async () => {
        const response = await request(app.getHttpServer())
            .post('/v1/auth/login')
            .send({ login_id: 'admin_login', password: 'password' })
            .expect(200);

        expect(response.body).toEqual(
            expect.objectContaining({
                accessToken: expect.any(String),
                refreshToken: expect.any(String),
                tokenType: 'Bearer',
                expiresIn: 15 * 60 * 1000,
            }),
        );

        const cookies = setCookieHeaders(response.headers);
        const accessCookie = findCookie(cookies, 'accessToken');
        const refreshCookie = findCookie(cookies, 'refreshToken');
        for (const cookie of [accessCookie, refreshCookie]) {
            expect(cookie).toMatch(/; HttpOnly/i);
            expect(cookie).toMatch(/; Secure/i);
            expect(cookie).toMatch(/; SameSite=Lax/i);
        }

        const accessPayload = jwtService.decode(response.body.accessToken);
        const refreshPayload = jwtService.decode(response.body.refreshToken);
        expect(expiresAt(accessCookie)).toBe(accessPayload.exp);
        expect(expiresAt(refreshCookie)).toBe(refreshPayload.exp);

        authService.login.mockRejectedValueOnce(
            new UnauthorizedException('invalid credentials'),
        );
        const failedLogin = await request(app.getHttpServer())
            .post('/v1/auth/login')
            .send({ login_id: 'admin_login', password: 'wrong-password' })
            .expect(401);
        expect(failedLogin.headers['set-cookie']).toBeUndefined();
    });

    it('유효한 access 쿠키로 GET /v1/auth/me를 호출하면 세션 사용자 필드 다섯 개를 반환한다', async () => {
        const response = await request(app.getHttpServer())
            .get('/v1/auth/me')
            .set('Cookie', `accessToken=${signAccessToken(15 * 60)}`)
            .expect(200);

        expect(response.body).toEqual({
            userId: admin.id,
            login_id: admin.login_id,
            name: admin.name,
            role: admin.role,
            club_id: null,
        });
    });

    it.each([
        ['쿠키가 없을 때', undefined],
        ['만료된 access 쿠키일 때', `accessToken=${signAccessToken(-1)}`],
    ])('GET /v1/auth/me는 %s 401을 반환한다', async (_, cookie) => {
        const response = request(app.getHttpServer()).get('/v1/auth/me');
        if (cookie) {
            response.set('Cookie', cookie);
        }
        await response.expect(401);
    });

    it('보호된 엔드포인트는 Bearer 헤더 회귀와 access 쿠키 인증을 모두 허용한다', async () => {
        const token = signAccessToken(15 * 60);
        await request(app.getHttpServer())
            .get('/v1/auth/protected')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect({ ok: true });
        await request(app.getHttpServer())
            .get('/v1/auth/protected')
            .set('Cookie', `accessToken=${token}`)
            .expect(200)
            .expect({ ok: true });
    });

    it('refresh는 refresh 쿠키를 사용해 회전한 토큰 쿠키를 발급하고 body 응답도 유지한다', async () => {
        const response = await request(app.getHttpServer())
            .post('/v1/auth/refresh')
            .set('Cookie', 'refreshToken=valid-refresh-token')
            .expect(200);

        expect(response.body).toEqual(
            expect.objectContaining({
                accessToken: expect.any(String),
                refreshToken: expect.any(String),
                tokenType: 'Bearer',
            }),
        );
        expect(findCookie(setCookieHeaders(response.headers), 'accessToken')).toMatch(
            /; HttpOnly/i,
        );
        expect(findCookie(setCookieHeaders(response.headers), 'refreshToken')).toMatch(
            /; HttpOnly/i,
        );
    });

    it.each([
        ['refreshToken 타입이 숫자일 때', { refreshToken: 123 }],
        ['선언되지 않은 필드가 있을 때', { unexpected: 'field' }],
    ])('refresh DTO는 %s 400을 반환하고 service까지 전달하지 않는다', async (_, body) => {
        await request(app.getHttpServer())
            .post('/v1/auth/refresh')
            .send(body)
            .expect(400);

        expect(authService.refreshToken).not.toHaveBeenCalled();
    });

    it('무효 refresh 쿠키는 401과 두 쿠키 삭제 헤더를 반환한다', async () => {
        authService.refreshToken.mockRejectedValueOnce(
            new UnauthorizedException('invalid refresh token'),
        );

        const response = await request(app.getHttpServer())
            .post('/v1/auth/refresh')
            .set('Cookie', 'refreshToken=invalid-refresh-token')
            .expect(401);

        for (const name of ['accessToken', 'refreshToken'] as CookieName[]) {
            expect(findCookie(setCookieHeaders(response.headers), name)).toMatch(
                /; (Max-Age=0|Expires=Thu, 01 Jan 1970)/i,
            );
        }
    });

    it('logout은 accessToken과 refreshToken 삭제 Set-Cookie를 반환한다', async () => {
        const response = await request(app.getHttpServer())
            .post('/v1/auth/logout')
            .set('Authorization', `Bearer ${signAccessToken(15 * 60)}`)
            .expect(200);

        for (const name of ['accessToken', 'refreshToken'] as CookieName[]) {
            expect(findCookie(setCookieHeaders(response.headers), name)).toMatch(
                /; (Max-Age=0|Expires=Thu, 01 Jan 1970)/i,
            );
        }
    });

});
