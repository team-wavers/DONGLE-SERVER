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
} from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { ClubReportsService } from '../club_reports/club_reports.service';
import { CreateClubReportDto } from '../club_reports/dto/create-club_report.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../../lib/s3-uploads';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/constants/roles';

@Controller('clubs')
export class ClubsController {
    constructor(
        private readonly clubsService: ClubsService,
        private readonly clubReportsService: ClubReportsService,
        private readonly s3Service: S3Service,
    ) {}

    @Post()
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN)  // 클럽 생성은 ADMIN만 가능
    async create(@Body() createClubDto: CreateClubDto) {
        return await this.clubsService.create(createClubDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN, ROLES.PRESIDENT, ROLES.MEMBER)
    async findAll() {
        return await this.clubsService.findAll();
    }

    @Post('registration-urls')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN, ROLES.PRESIDENT)
    createRegistrationUrl() {
        return this.clubsService.createRegistrationUrl();
    }

    @Get('reports')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN, ROLES.PRESIDENT, ROLES.MEMBER)
    async findAllReports() {
        return await this.clubReportsService.findAll();
    }

    @Post(':id/report-images')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN, ROLES.PRESIDENT, ROLES.MEMBER)
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
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN, ROLES.PRESIDENT, ROLES.MEMBER)
    async createReport(
        @Param('id') clubId: number,
        @Body() createClubReportDto: CreateClubReportDto,
    ) {
        createClubReportDto.clubId = clubId;
        return await this.clubReportsService.create(createClubReportDto);
    }

    @Put(':id/reports/:reportId')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN, ROLES.PRESIDENT)
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
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN, ROLES.PRESIDENT)
    async deleteReport(@Param('reportId') reportId: number) {
        return await this.clubReportsService.remove(reportId);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN, ROLES.PRESIDENT, ROLES.MEMBER)
    async findOne(@Param('id') id: number) {
        return await this.clubsService.findOne(id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN, ROLES.PRESIDENT)
    async update(
        @Param('id') id: number,
        @Body() updateClubDto: UpdateClubDto,
    ) {
        return await this.clubsService.update(id, updateClubDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN)
    async delete(@Param('id') id: number) {
        return await this.clubsService.delete(id);
    }
}
