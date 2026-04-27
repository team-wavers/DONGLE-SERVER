import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Inject,
    Injectable,
    UnauthorizedException,
    forwardRef,
} from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { ROLES, normalizeRole } from '../../auth/constants/roles';
import { UsersService } from '../users.service';

@Injectable()
export class BootstrapUserCreateGuard implements CanActivate {
    constructor(
        private readonly usersService: UsersService,
        @Inject(forwardRef(() => AuthService))
        private readonly authService: AuthService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isUsersTableEmpty = !(await this.usersService.hasAnyUser());
        if (isUsersTableEmpty) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers?.authorization;
        const accessToken = this.extractBearerToken(authHeader);
        const user = await this.authService.verifyAccessToken(accessToken);

        if (normalizeRole(user.role) !== ROLES.ADMIN) {
            throw new ForbiddenException(
                '최초 계정 생성 이후에는 관리자만 사용자를 생성할 수 있습니다.',
            );
        }

        request.user = user;
        return true;
    }

    private extractBearerToken(authHeader?: string): string {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('인증 토큰이 필요합니다.');
        }

        const token = authHeader.slice(7).trim();
        if (!token) {
            throw new UnauthorizedException('유효하지 않은 토큰입니다.');
        }

        return token;
    }
}
