import { Controller, Get, UseGuards } from '@nestjs/common';
import { ROLES } from '../auth/constants/roles';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { DashboardService } from './dashboard.service';

@Controller()
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(ROLES.ADMIN)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get()
    async getDashboard() {
        return await this.dashboardService.getDashboard();
    }
}
