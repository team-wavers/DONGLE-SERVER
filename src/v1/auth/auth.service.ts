import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { normalizeRole } from './constants/roles';

// 인증 서비스
@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    // 사용자 로그인
    // loginDto: 로그인 DTO
    // return: 토큰 응답
    async login(loginDto: LoginDto): Promise<TokenResponseDto> {
        const { login_id, password } = loginDto;

        // 사용자 존재 여부 및 비밀번호 확인
        const user = await this.usersService.validateUser(login_id, password);
        if (!user) {
            throw new UnauthorizedException('로그인 아이디 또는 비밀번호가 올바르지 않습니다.');
        }

        // 토큰 생성
        const tokens = await this.generateTokens(user);

        // 리프레시 토큰 저장
        await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }

    // 액세스 토큰 재발급
    // refreshTokenDto: 리프레시 토큰 DTO
    // return: 새로운 토큰 응답
    async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenResponseDto> {
        const { refreshToken } = refreshTokenDto;

        try {
            // 리프레시 토큰 검증
            const refreshSecret = this.configService.get<string>('jwt_refresh_secret');
            if (!refreshSecret) {
                throw new Error('jwt_refresh_secret 환경변수가 설정되지 않았습니다.');
            }

            const decoded = this.jwtService.verify(refreshToken, {
                secret: refreshSecret,
            });

            // 사용자 조회
            const user = await this.usersService.findOne(decoded.sub);
            if (!user) {
                throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
            }

            // 저장된 리프레시 토큰과 비교
            if (user.refresh_token !== refreshToken) {
                throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
            }

            // 새로운 토큰 생성
            const tokens = await this.generateTokens(user);

            // 새로운 리프레시 토큰 저장
            await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

            return tokens;
        } catch (error) {
            throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
        }
    }


    // 토큰 생성
    // user: 사용자 정보
    // return: 토큰 응답
    private async generateTokens(user: User): Promise<TokenResponseDto> {
        const payload = {
            sub: user.id,
            login_id: user.login_id,
            name: user.name, 
            role: normalizeRole(user.role) // 역할 정규화
        };

        // 환경변수 검증
        const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
        const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
        const accessExpireTime = this.configService.get<string>('JWT_ACCESS_EXPIRE_TIME');
        const refreshExpireTime = this.configService.get<string>('JWT_REFRESH_EXPIRE_TIME');

        if (!accessSecret) {
            throw new Error('jwt_access_secret 환경변수가 설정되지 않았습니다.');
        }
        if (!refreshSecret) {
            throw new Error('jwt_refresh_secret 환경변수가 설정되지 않았습니다.');
        }

        const accessTokenExpiresIn = this.parseExpirationTime(
            accessExpireTime || '15m'
        );

        // 액세스 토큰 생성
        const accessToken = this.jwtService.sign(payload, {
            secret: accessSecret,
            expiresIn: accessExpireTime || '15m',
        });

        // 리프레시 토큰 생성
        const refreshToken = this.jwtService.sign(payload, {
            secret: refreshSecret,
            expiresIn: refreshExpireTime || '7d',
        });

        return new TokenResponseDto(accessToken, refreshToken, accessTokenExpiresIn);
    }

    // 만료 시간 문자열을 초 단위로 변환
    // expirationTime: 만료 시간 문자열 (예: '15m', '1h', '7d')
    // return: 초 단위 만료 시간
    private parseExpirationTime(expirationTime: string): number {
        const unit = expirationTime.slice(-1);
        const value = parseInt(expirationTime.slice(0, -1), 10);

        switch (unit) {
            case 's':
                return value;
            case 'm':
                return value * 60;
            case 'h':
                return value * 60 * 60;
            case 'd':
                return value * 60 * 60 * 24;
            default:
                return 900; // 기본값 15분
        }
    }

    // 사용자 로그아웃 (리프레시 토큰 삭제)
    // userId: 사용자 ID
    async logout(userId: number): Promise<{ message: string }> {
        await this.usersService.updateRefreshToken(userId, '');
        return { message: '로그아웃되었습니다.' };
    }
}
