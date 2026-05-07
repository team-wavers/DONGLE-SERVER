import {
    Controller,
    ForbiddenException,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Put,
    UseInterceptors,
    UploadedFile,
    UseGuards,
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
import { ROLES, normalizeRole } from '../auth/constants/roles';
import { S3Service } from '../../common/lib/s3-uploads';
import {
    IMAGE_UPLOAD_INTERCEPTOR_OPTIONS,
    validateImageUploadFile,
} from '../../common/lib/upload-file-validation';

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
    @Roles(ROLES.PRESIDENT, ROLES.ADMIN)
    @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_INTERCEPTOR_OPTIONS))
    async uploadIcon(
        @Param('id') clubId: number,
        @UploadedFile() file: Express.Multer.File | undefined,
        @Request() req,
    ) {
        this.assertClubWritePermission(req, Number(clubId));
        validateImageUploadFile(file);
        const url = await this.s3Service.upload(
            file.buffer,
            'club-icons',
            file.mimetype,
        );
        return await this.clubsService.updateIconUrl(Number(clubId), url);
    }

    @Post(':id/report-images')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.PRESIDENT)
    @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_INTERCEPTOR_OPTIONS))
    async uploadReportImage(
        @Param('id') clubId: number,
        @UploadedFile() file: Express.Multer.File | undefined,
        @Request() req,
    ) {
        this.assertClubWritePermission(req, Number(clubId));
        validateImageUploadFile(file);
        const buffer = file.buffer;
        const key = `club-reports`;
        const contentType = file.mimetype;
        return await this.s3Service.upload(buffer, key, contentType);
    }

    @Get(':id/reports')
    async findReportsByClubId(@Param('id') clubId: number) {
        return await this.clubReportsService.findAllByClubId(clubId);
    }

    @Post(':id/reports')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.PRESIDENT)
    async createReport(
        @Param('id') clubId: string,
        @Body() createClubReportDto: CreateClubReportDto,
        @Request() req,
    ) {
        this.assertClubWritePermission(req, Number(clubId));
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
        @Request() req,
    ) {
        this.assertClubWritePermission(req, Number(clubId));
        updateClubReportDto.club_id = clubId;
        return await this.clubReportsService.update(
            reportId,
            updateClubReportDto,
        );
    }

    @Delete(':id/reports/:reportId')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.PRESIDENT, ROLES.ADMIN)
    async deleteReport(
        @Param('id') clubId: number,
        @Param('reportId') reportId: number,
        @Request() req,
    ) {
        this.assertClubWritePermission(req, Number(clubId));
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
        @Request() req,
    ) {
        this.assertClubWritePermission(req, Number(id));
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

    private assertClubWritePermission(req, clubId: number): void {
        const role = normalizeRole(req.user.role);
        if (role === ROLES.ADMIN) {
            return;
        }

        if (role === ROLES.PRESIDENT && req.user.club_id === clubId) {
            return;
        }

        throw new ForbiddenException(
            '본인이 관리하는 동아리에 대해서만 수정할 수 있습니다.',
        );
    }
}
