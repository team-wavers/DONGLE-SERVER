import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { normalizeRole } from '../constants/roles';
import { Club } from '../../clubs/entities/club.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// JWT 인증 전략
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        @InjectRepository(Club)
        private readonly clubRepository: Repository<Club>,
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
        club_id: number | null;
    }> {
        const { sub: userId, login_id, name, role, club_id } = payload;

        // 사용자 존재 여부 확인
        const user = await this.usersService.findOne(userId);
        if (!user) {
            throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
        }

        // 사용자 정보 검증
        if (user.login_id !== login_id || user.name !== name || normalizeRole(user.role) !== role) {
            throw new UnauthorizedException('유효하지 않은 토큰입니다.');
        }

        // club_id 검증 (동아리 회장만)
        if (normalizeRole(user.role) === 'president') {
            // 동아리 회장: 관리하는 동아리 ID로 검증
            const managedClub = await this.clubRepository
                .createQueryBuilder('club')
                .where('club.president_id = :userId', { userId: user.id })
                .andWhere('club.deleted_at IS NULL')
                .getOne();
            const expectedClubId = managedClub?.id || null;
            
            if (expectedClubId !== club_id) {
                throw new UnauthorizedException('토큰의 club_id가 일치하지 않습니다.');
            }
        } else {
            // 일반 사용자/관리자는 club_id가 null이어야 함
            if (club_id !== null) {
                throw new UnauthorizedException('일반 사용자의 토큰에 club_id가 포함되어서는 안됩니다.');
            }
        }

        return {
            userId: user.id,
            login_id: user.login_id,
            name: user.name,
            role: user.role,
            club_id: club_id, // JWT의 club_id 값 사용
        };
    }
}
