import {
    IsArray,
    IsBoolean,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateClubDto {
    @IsString()
    key: string; // 일회용 키

    @IsString()
    name: string;

    @IsString()
    category: string;

    @IsOptional()
    @IsObject()
    sns?: Record<string, string>;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsBoolean()
    is_recruiting?: boolean;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsString()
    recruit_start?: string | null;

    @IsOptional()
    @IsString()
    recruit_end?: string | null;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    main_activities?: string;

    @IsOptional()
    @IsString()
    apply_url?: string | null;

    @IsOptional()
    @IsNumber()
    president_id?: number;
}
