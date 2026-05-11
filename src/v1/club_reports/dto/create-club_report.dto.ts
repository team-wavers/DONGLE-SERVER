import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateClubReportDto {
    @IsOptional()
    @IsNumber()
    club_id: number;

    @IsString()
    title: string;

    @IsString()
    content: string;

    @IsArray()
    @IsString({ each: true })
    image_urls: string[];
}
