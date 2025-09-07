import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClubsService } from './clubs.service';
import { ClubsController } from './clubs.controller';
import { Club } from './entities/club.entity';
import { ClubReportsModule } from '../club_reports/club_reports.module';
import { S3Service } from '../../common/lib/s3-uploads';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Club]),
        ClubReportsModule,
        forwardRef(() => AuthModule),
        forwardRef(() => UsersModule),
    ],
    controllers: [ClubsController],
    providers: [ClubsService, S3Service],
    exports: [ClubsService],
})
export class ClubsModule {}
