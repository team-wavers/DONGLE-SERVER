import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

// JWT 인증 전략
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        const jwtSecret = configService.get<string>('JWT_ACCESS_SECRET');
        if (!jwtSecret) {
            throw new Error(
                'jwt_access_secret 환경변수가 설정되지 않았습니다.',
            );
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
        });
    }

    // JWT 토큰 유효성 검증
    // payload: JWT 페이로드
    // return: 사용자 정보
    async validate(payload: any): Promise<{
        userId: number;
        login_id: string;
        name: string;
        role: string;
    }> {
        const { sub: userId, login_id, name, role } = payload;

        // 사용자 존재 여부 확인
        const user = await this.usersService.findOne(userId);
        if (!user) {
            throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
        }

        // 사용자 정보 검증
        if (user.login_id !== login_id || user.name !== name || user.role !== role) {
            throw new UnauthorizedException('유효하지 않은 토큰입니다.');
        }

        return {
            userId: user.id,
            login_id: user.login_id,
            name: user.name,
            role: user.role,
        };
    }
}
