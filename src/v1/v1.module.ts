import { Module } from '@nestjs/common';
import { V1Controller } from './v1.controller';
import { ClubReportsModule } from './club_reports/club_reports.module';
import { ClubsModule } from './clubs/clubs.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
    imports: [AuthModule, ClubReportsModule, ClubsModule, UsersModule],
    controllers: [V1Controller],
})
export class V1Module {}
