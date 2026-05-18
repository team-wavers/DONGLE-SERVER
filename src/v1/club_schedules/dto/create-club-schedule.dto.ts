import {
    IsBoolean,
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import {
    CLUB_SCHEDULE_TYPES,
    ClubScheduleType,
} from '../entities/club_schedule.entity';

export class CreateClubScheduleDto {
    @IsString()
    @MaxLength(100)
    title: string;

    @IsIn(CLUB_SCHEDULE_TYPES)
    type: ClubScheduleType;

    @IsString()
    start_at: string;

    @IsString()
    end_at: string;

    @IsBoolean()
    is_public: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    location?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2048)
    external_url?: string;
}
