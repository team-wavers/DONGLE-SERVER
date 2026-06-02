import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ROLES } from '../auth/constants/roles';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import {
    ClubScheduleAdminQueryDto,
    ClubScheduleCalendarQueryDto,
} from './dto/club-schedule-query.dto';
import { UpdateClubScheduleAdminStatusDto } from './dto/update-club-schedule-admin-status.dto';
import { ClubSchedulesService } from './club_schedules.service';

@Controller('club-schedules')
export class PublicClubSchedulesController {
    constructor(private readonly clubSchedulesService: ClubSchedulesService) {}

    @Get()
    async findPublicCalendar(@Query() query: ClubScheduleCalendarQueryDto) {
        return await this.clubSchedulesService.findPublicCalendar(query);
    }
}

@Controller()
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(ROLES.ADMIN)
export class ClubSchedulesController {
    constructor(private readonly clubSchedulesService: ClubSchedulesService) {}

    @Get()
    async findAllForAdmin(@Query() query: ClubScheduleAdminQueryDto) {
        return await this.clubSchedulesService.findAllForAdmin(query);
    }

    @Get('calendar')
    async findCalendarForAdmin(@Query() query: ClubScheduleCalendarQueryDto) {
        return await this.clubSchedulesService.findCalendarForAdmin(query);
    }

    @Get(':scheduleId')
    async findOneForAdmin(@Param('scheduleId') scheduleId: number) {
        return await this.clubSchedulesService.findOneForAdmin(
            Number(scheduleId),
        );
    }

    @Patch(':scheduleId/admin-status')
    async updateAdminStatus(
        @Param('scheduleId') scheduleId: number,
        @Body() dto: UpdateClubScheduleAdminStatusDto,
    ) {
        return await this.clubSchedulesService.updateAdminStatus(
            Number(scheduleId),
            dto,
        );
    }

    @Delete(':scheduleId')
    async removeForAdmin(@Param('scheduleId') scheduleId: number) {
        return await this.clubSchedulesService.removeForAdmin(
            Number(scheduleId),
        );
    }
}
