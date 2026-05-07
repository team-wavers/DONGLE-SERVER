import { IsBoolean, IsString } from 'class-validator';

export class UpsertMainBannerDto {
    @IsString()
    image_url: string;

    @IsString()
    publish_start_at: string;

    @IsString()
    publish_end_at: string;

    @IsBoolean()
    is_active: boolean;
}
