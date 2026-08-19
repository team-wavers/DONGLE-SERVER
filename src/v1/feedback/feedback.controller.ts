import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ROLES } from '../auth/constants/roles';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller()
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(ROLES.ADMIN, ROLES.PRESIDENT)
export class FeedbackController {
    constructor(private readonly feedbackService: FeedbackService) {}

    @Post()
    async create(
        @Body() dto: CreateFeedbackDto,
        @Request() req: { user: { role: string; club_id: number | null } },
    ) {
        return await this.feedbackService.create(dto, req.user);
    }
}
