import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Put,
    UseInterceptors,
    UploadedFile,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { ClubReportsService } from '../club_reports/club_reports.service';
import { CreateClubReportDto } from '../club_reports/dto/create-club_report.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../../common/lib/s3-uploads';

@Controller()
export class ClubsController {
    constructor(
        private readonly clubsService: ClubsService,
        private readonly clubReportsService: ClubReportsService,
        private readonly s3Service: S3Service,
    ) {}

    @Post()
    async create(@Body() createClubDto: CreateClubDto) {
        try {
            return await this.clubsService.create(createClubDto);
        } catch (error) {
            throw error;
        }
    }

    @Get()
    async findAll() {
        try {
            return await this.clubsService.findAll();
        } catch (error) {
            throw error;
        }
    }

    @Post('registration-urls')
    async createRegistrationUrl() {
        try {
            return await this.clubsService.createRegistrationUrl();
        } catch (error) {
            throw error;
        }
    }

    @Get('reports')
    async findAllReports() {
        return await this.clubReportsService.findAll();
    }

    @Post(':id/report-images')
    @UseInterceptors(FileInterceptor('file'))
    async uploadReportImage(
        @Param('id') clubId: number,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const buffer = file.buffer;
        const key = `club-reports/${clubId}`;
        const contentType = file.mimetype;
        return await this.s3Service.upload(buffer, key, contentType);
    }

    @Post(':id/reports')
    async createReport(
        @Param('id') clubId: number,
        @Body() createClubReportDto: CreateClubReportDto,
    ) {
        createClubReportDto.clubId = clubId;
        return await this.clubReportsService.create(createClubReportDto);
    }

    @Put(':id/reports/:reportId')
    async updateReport(
        @Param('id') clubId: number,
        @Param('reportId') reportId: number,
        @Body() updateClubReportDto: CreateClubReportDto,
    ) {
        updateClubReportDto.clubId = clubId;
        return await this.clubReportsService.update(
            reportId,
            updateClubReportDto,
        );
    }

    // Authorization 로직 설정 필요
    @Delete(':id/reports/:reportId')
    async deleteReport(@Param('reportId') reportId: number) {
        return await this.clubReportsService.remove(reportId);
    }

    @Get(':id')
    async findOne(@Param('id') id: number) {
        try {
            return await this.clubsService.findOne(id);
        } catch (error) {
            throw error;
        }
    }

    @Put(':id')
    async update(
        @Param('id') id: number,
        @Body() updateClubDto: UpdateClubDto,
    ) {
        try {
            return await this.clubsService.update(id, updateClubDto);
        } catch (error) {
            throw error;
        }
    }

    @Delete(':id')
    async delete(@Param('id') id: number) {
        try {
            return await this.clubsService.delete(id);
        } catch (error) {
            throw error;
        }
    }
}
