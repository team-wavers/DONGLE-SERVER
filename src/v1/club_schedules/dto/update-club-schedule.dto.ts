import { PartialType } from '@nestjs/mapped-types';
import { CreateClubScheduleDto } from './create-club-schedule.dto';

export class UpdateClubScheduleDto extends PartialType(CreateClubScheduleDto) {}
