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
    UseGuards,
    HttpException,
    HttpStatus,
    Request,
} from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { ClubReportsService } from '../club_reports/club_reports.service';
import { CreateClubReportDto } from '../club_reports/dto/create-club_report.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/constants/roles';
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
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN, ROLES.PRESIDENT)
    async createRegistrationUrl() {
        try {
            return await this.clubsService.createRegistrationUrl();
        } catch (error) {
            throw error;
        }
    }

    @Get('reports')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN)
    async findAllReports() {
        return await this.clubReportsService.findAll();
    }

    @Post(':id/icons')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.PRESIDENT)
    @UseInterceptors(FileInterceptor('file'))
    async uploadIcon(@Param('id') clubId: number, @UploadedFile() file: Express.Multer.File) {
        const buffer = file.buffer;
        const key = `club-icons`;
        const contentType = file.mimetype;
        return await this.s3Service.upload(buffer, key, contentType);
    }

    @Post(':id/report-images')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.PRESIDENT)
    @UseInterceptors(FileInterceptor('file'))
    async uploadReportImage(
        @Param('id') clubId: number,
        @UploadedFile() file: Express.Multer.File,
        @Request() req,
    ) {
        const buffer = file.buffer;
        const key = `club-reports`;
        const contentType = file.mimetype;
        return await this.s3Service.upload(buffer, key, contentType);
    }

    @Post(':id/reports')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.PRESIDENT)
    async createReport(
        @Param('id') clubId: string,
        @Body() createClubReportDto: CreateClubReportDto,
    ) {
        createClubReportDto.club_id = parseInt(clubId, 10);
        return await this.clubReportsService.create(createClubReportDto);
    }

    @Put(':id/reports/:reportId')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.PRESIDENT)
    async updateReport(
        @Param('id') clubId: number,
        @Param('reportId') reportId: number,
        @Body() updateClubReportDto: CreateClubReportDto,
    ) {
        updateClubReportDto.club_id = clubId;
        return await this.clubReportsService.update(
            reportId,
            updateClubReportDto,
        );
    }

    // Authorization 로직 설정 필요
    @Delete(':id/reports/:reportId')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.PRESIDENT)
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
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN, ROLES.PRESIDENT)
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
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN)
    async delete(@Param('id') id: number) {
        try {
            return await this.clubsService.delete(id);
        } catch (error) {
            throw error;
        }
    }
}
