import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateClubReportDto } from './create-club_report.dto';

export class UpdateClubReportDto extends PartialType(
    OmitType(CreateClubReportDto, ['club_id'] as const),
) {}
