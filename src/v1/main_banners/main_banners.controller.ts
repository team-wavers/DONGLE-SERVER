import {
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Put,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../../common/lib/s3-uploads';
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
    @UseInterceptors(
        FileInterceptor('file', {
            limits: {
                fileSize: 10 * 1024 * 1024,
            },
        }),
    )
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new HttpException('파일이 필요합니다.', HttpStatus.BAD_REQUEST);
        }

        if (!this.isAllowedImageType(file.mimetype)) {
            throw new HttpException(
                '허용되지 않는 이미지 형식입니다. (jpg, png, webp)',
                HttpStatus.BAD_REQUEST,
            );
        }

        const imageUrl = await this.s3Service.upload(
            file.buffer,
            'main-banners',
            file.mimetype,
        );

        return { image_url: imageUrl };
    }

    private isAllowedImageType(mimeType: string) {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        return allowed.includes(mimeType);
    }
}
