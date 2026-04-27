import { PartialType } from '@nestjs/mapped-types';
import { CreateClubReportDto } from './create-club_report.dto';

export class UpdateClubReportDto extends PartialType(CreateClubReportDto) {}
