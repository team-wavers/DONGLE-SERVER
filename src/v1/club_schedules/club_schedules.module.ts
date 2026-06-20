import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClubSchedulesController } from './club_schedules.controller';
import { ClubSchedulesService } from './club_schedules.service';
import { ClubSchedule } from './entities/club_schedule.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ClubSchedule])],
    controllers: [ClubSchedulesController],
    providers: [ClubSchedulesService],
    exports: [ClubSchedulesService],
})
export class ClubSchedulesModule {}
