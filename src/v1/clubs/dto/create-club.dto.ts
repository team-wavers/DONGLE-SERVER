import {
    IsArray,
    IsBoolean,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// 공개 등록 플로우에서 회장 계정을 함께 생성할 때 쓰는 페이로드.
// 이 값이 있으면 User+Club 생성이 하나의 트랜잭션으로 묶인다.
export class NewClubPresidentDto {
    @IsString()
    name: string;

    @IsString()
    login_id: string;

    @IsString()
    password: string;

    @IsString()
    phone: string;
}

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
    icon_url?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(2048)
    apply_url?: string | null;

    @IsOptional()
    @IsNumber()
    president_id?: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => NewClubPresidentDto)
    newPresident?: NewClubPresidentDto;
}
