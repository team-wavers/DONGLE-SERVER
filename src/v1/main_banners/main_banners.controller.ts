import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../../common/lib/s3-uploads';
import {
    IMAGE_UPLOAD_INTERCEPTOR_OPTIONS,
    validateImageUploadFile,
} from '../../common/lib/upload-file-validation';
import { ROLES } from '../auth/constants/roles';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { UpsertMainBannerDto } from './dto/upsert-main-banner.dto';
import { MainBannersService } from './main_banners.service';

@Controller()
export class MainBannersController {
    constructor(
        private readonly mainBannersService: MainBannersService,
        private readonly s3Service: S3Service,
    ) {}

    @Get()
    async findActive() {
        return await this.mainBannersService.findActive();
    }

    @Get('admin')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN)
    async findAllForAdmin() {
        return await this.mainBannersService.findAllForAdmin();
    }

    @Get('admin/:id')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN)
    async findOneForAdmin(@Param('id') id: number) {
        return await this.mainBannersService.findOneForAdmin(Number(id));
    }

    @Post()
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN)
    async create(@Body() dto: UpsertMainBannerDto) {
        return await this.mainBannersService.create(dto);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN)
    async update(@Param('id') id: number, @Body() dto: UpsertMainBannerDto) {
        return await this.mainBannersService.update(Number(id), dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN)
    async remove(@Param('id') id: number) {
        return await this.mainBannersService.remove(Number(id));
    }

    @Post('images')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN)
    @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_INTERCEPTOR_OPTIONS))
    async uploadImage(@UploadedFile() file: Express.Multer.File | undefined) {
        validateImageUploadFile(file);

        const imageUrl = await this.s3Service.upload(
            file.buffer,
            'main-banners',
            file.mimetype,
        );

        return { image_url: imageUrl };
    }
}
