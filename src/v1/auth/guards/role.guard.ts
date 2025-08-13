import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// 역할 기반 접근 제어 가드
@Injectable()
export class RoleGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // 메타데이터에서 필요한 역할들 가져오기
        const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
            context.getHandler(),
            context.getClass(),
        ]);

        // 역할이 지정되지 않았다면 모든 사용자 허용
        if (!requiredRoles) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // 사용자 정보가 없으면 거부
        if (!user) {
            throw new ForbiddenException('사용자 정보를 찾을 수 없습니다.');
        }

        // 사용자 역할이 필요한 역할 중 하나와 일치하는지 확인 (대소문자 무시)
        const hasRole = requiredRoles.some((role) => 
            user.role.toLowerCase() === role.toLowerCase()
        );
        
        if (!hasRole) {
            throw new ForbiddenException('접근 권한이 없습니다.');
        }

        return true;
    }
} 