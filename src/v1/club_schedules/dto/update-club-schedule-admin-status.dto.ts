import { IsBoolean } from 'class-validator';

export class UpdateClubScheduleAdminStatusDto {
    @IsBoolean()
    is_public: boolean;
}
