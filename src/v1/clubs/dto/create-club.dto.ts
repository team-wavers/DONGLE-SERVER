export class CreateClubDto {
    key: string; // 일회용 키
    name: string;
    category: string;
    sns?: Record<string, string>;
    tags?: string[];
    is_recruiting?: boolean;
    recruit_start?: Date;
    recruit_end?: Date;
    description?: string;
    main_activities?: string;
    president_id?: number;
}
