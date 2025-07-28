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
import { UpdateClubReportDto } from './dto/update-club_report.dto';

@Controller('club-reports')
export class ClubReportsController {
    constructor(private readonly clubReportsService: ClubReportsService) {}

    @Post()
    create(@Body() createClubReportDto: CreateClubReportDto) {
        return this.clubReportsService.create(createClubReportDto);
    }

    @Get()
    findAll() {
        return this.clubReportsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.clubReportsService.findOne(+id);
    }

    @Put(':id')
    update(
        @Param('id') id: string,
        @Body() updateClubReportDto: UpdateClubReportDto,
    ) {
        return this.clubReportsService.update(+id, updateClubReportDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.clubReportsService.remove(+id);
    }
}
