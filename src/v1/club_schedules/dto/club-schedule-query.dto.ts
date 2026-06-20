import { IsBooleanString, IsIn, IsOptional, IsString } from 'class-validator';
import { CLUB_SCHEDULE_TYPES } from '../entities/club_schedule.entity';

export const CLUB_SCHEDULE_LIST_STATUSES = [
    'all',
    'public',
    'private',
    'upcoming',
    'past',
] as const;

export class ClubSchedulePresidentQueryDto {
    @IsOptional()
    @IsIn(CLUB_SCHEDULE_LIST_STATUSES)
    status?: (typeof CLUB_SCHEDULE_LIST_STATUSES)[number];
}

export class ClubScheduleAdminQueryDto {
    @IsOptional()
    @IsString()
    clubName?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsIn(CLUB_SCHEDULE_TYPES)
    type?: string;

    @IsOptional()
    @IsBooleanString()
    isPublic?: string;

    @IsOptional()
    @IsString()
    from?: string;

    @IsOptional()
    @IsString()
    to?: string;
}

export class ClubScheduleCalendarQueryDto {
    @IsString()
    from: string;

    @IsString()
    to: string;
}
