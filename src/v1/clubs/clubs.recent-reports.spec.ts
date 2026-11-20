import {
    GUARDS_METADATA,
    METHOD_METADATA,
    PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { ROLES } from '../auth/constants/roles';
import { ClubReportsService } from '../club_reports/club_reports.service';
import { ClubsController } from './clubs.controller';

describe('공개 최근 활동보고서 route', () => {
    it('정적 recent route는 GET이며 인증 없이 공개 서비스에 위임한다', async () => {
        const findRecentPublic = jest.fn().mockResolvedValue([]);
        const controller = new ClubsController(
            {} as never,
            { findRecentPublic } as unknown as ClubReportsService,
            {} as never,
            {} as never,
        );
        const handler = Object.getOwnPropertyDescriptor(
            ClubsController.prototype,
            'findRecentReports',
        )?.value as () => Promise<unknown>;
        expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(
            'reports/recent',
        );
        expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
            RequestMethod.GET,
        );
        expect(Reflect.getMetadata(GUARDS_METADATA, handler) ?? []).toEqual([]);
        expect(
            Reflect.getMetadata(GUARDS_METADATA, ClubsController) ?? [],
        ).toEqual([]);
        expect(Reflect.getMetadata('roles', handler)).toBeUndefined();
        await expect(controller.findRecentReports()).resolves.toEqual([]);
        expect(findRecentPublic).toHaveBeenCalledWith();
    });

    it('기존 전체 보고서 route는 JWT와 ADMIN 권한을 계속 요구한다', () => {
        const handler = Object.getOwnPropertyDescriptor(
            ClubsController.prototype,
            'findAllReports',
        )?.value as () => Promise<unknown>;
        expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('reports');
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
            JwtAuthGuard,
            RoleGuard,
        ]);
        expect(Reflect.getMetadata('roles', handler)).toEqual([ROLES.ADMIN]);
    });
});
