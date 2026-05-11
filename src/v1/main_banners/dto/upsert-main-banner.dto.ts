import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertMainBannerDto {
    @IsString()
    image_url: string;

    @IsString()
    @IsOptional()
    @MaxLength(2048)
    link_url?: string;

    @IsString()
    publish_start_at: string;

    @IsString()
    publish_end_at: string;

    @IsBoolean()
    is_active: boolean;
}
