import { IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ROLES } from '../../auth/constants/roles';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    login_id?: string;

    @IsOptional()
    @IsString()
    password?: string;

    @ValidateIf((_object, value) => value !== undefined)
    @IsString()
    @IsIn(Object.values(ROLES))
    role?: string;

    @IsOptional()
    @IsString()
    phone?: string;
}
