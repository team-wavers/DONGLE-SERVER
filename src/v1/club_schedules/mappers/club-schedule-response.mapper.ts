import {
    AdminClubScheduleResponse,
    ClubScheduleResponse,
} from '../dto/club-schedule-response.dto';
import { ClubSchedule } from '../entities/club_schedule.entity';

export function toClubScheduleResponse(
    schedule: ClubSchedule,
): ClubScheduleResponse {
    return {
        id: schedule.id,
        club_id: schedule.club_id ?? schedule.club?.id ?? null,
        title: schedule.title,
        type: schedule.type,
        start_at: schedule.start_at,
        end_at: schedule.end_at,
        is_public: schedule.is_public,
        location: schedule.location ?? null,
        description: schedule.description ?? null,
        external_url: schedule.external_url ?? null,
        created_at: schedule.created_at,
        updated_at: schedule.updated_at,
        deleted_at: schedule.deleted_at ?? null,
    };
}

export function toAdminClubScheduleResponse(
    schedule: ClubSchedule,
): AdminClubScheduleResponse {
    return {
        ...toClubScheduleResponse(schedule),
        club: schedule.club
            ? {
                  id: schedule.club.id,
                  name: schedule.club.name,
                  category: schedule.club.category,
              }
            : null,
    };
}
