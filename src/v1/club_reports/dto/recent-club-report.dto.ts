export interface RecentClubReportDto {
    id: number;
    title: string;
    createdAt: string;
    club_id: number;
    club_name: string;
    thumbnail_url: string | null;
}
