import { IsArray, IsString, ValidateIf } from 'class-validator';

export class UpdateClubReportDto {
    @ValidateIf((_, value) => value !== undefined)
    @IsString()
    title?: string;

    @ValidateIf((_, value) => value !== undefined)
    @IsString()
    content?: string;

    @ValidateIf((_, value) => value !== undefined)
    @IsArray()
    @IsString({ each: true })
    image_urls?: string[];
}
