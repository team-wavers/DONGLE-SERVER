export class UpsertMainBannerDto {
    image_url: string;
    link_url?: string;
    publish_start_at: string;
    publish_end_at: string;
    is_active: boolean;
}
