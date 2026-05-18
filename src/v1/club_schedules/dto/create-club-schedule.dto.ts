import {
    IsBoolean,
    IsIn,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import {
    CLUB_SCHEDULE_TYPES,
    ClubScheduleType,
} from '../entities/club_schedule.entity';

export class CreateClubScheduleDto {
    @IsOptional()
    @IsNumber()
    club_id?: number;

    @IsString()
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
    location?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2048)
    external_url?: string;
}
