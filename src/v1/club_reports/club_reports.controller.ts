import {
    Controller,
    Get,
    Post,
    Body,
    Put,
    Param,
    Delete,
} from '@nestjs/common';
import { ClubReportsService } from './club_reports.service';
import { CreateClubReportDto } from './dto/create-club_report.dto';

@Controller('club-reports')
export class ClubReportsController {
    constructor(private readonly clubReportsService: ClubReportsService) {}

}
