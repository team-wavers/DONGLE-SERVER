import { ClubScheduleType } from '../entities/club_schedule.entity';

export interface ClubScheduleResponse {
    id: number;
    club_id: number | null;
    title: string;
    type: ClubScheduleType;
    start_at: Date;
    end_at: Date;
    is_public: boolean;
    location?: string | null;
    description?: string | null;
    external_url?: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date | null;
}

export interface AdminClubScheduleResponse extends ClubScheduleResponse {
    club: {
        id: number;
        name: string;
        category: string;
    } | null;
}
