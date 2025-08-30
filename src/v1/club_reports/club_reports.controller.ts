import { Controller } from '@nestjs/common';
import { ClubReportsService } from './club_reports.service';

@Controller()
export class ClubReportsController {
    constructor(private readonly clubReportsService: ClubReportsService) {}
}
