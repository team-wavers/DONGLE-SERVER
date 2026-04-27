import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { S3Service } from '../../common/lib/s3-uploads';
import { MainBannersController } from './main_banners.controller';
import { MainBannersService } from './main_banners.service';
import { MainBanner } from './entities/main_banner.entity';

@Module({
    imports: [TypeOrmModule.forFeature([MainBanner])],
    controllers: [MainBannersController],
    providers: [MainBannersService, S3Service],
    exports: [MainBannersService],
})
export class MainBannersModule {}
