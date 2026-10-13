import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateClubDto } from './create-club.dto';

export class UpdateClubDto extends PartialType(
    OmitType(CreateClubDto, ['key', 'newPresident'] as const),
) {}
