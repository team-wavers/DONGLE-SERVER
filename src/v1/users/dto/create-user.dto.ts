import { IsIn, IsString } from 'class-validator';
import { ROLES } from '../../auth/constants/roles';

export class CreateUserDto {
    // 유저 이름 (필수)
    @IsString()
    name: string;

    // 로그인 ID (필수)
    @IsString()
    login_id: string;

    // 비밀번호 (필수)
    @IsString()
    password: string;

    // 역할(권한) (필수)
    @IsIn(Object.values(ROLES))
    @IsString()
    role: string;

    // 전화번호 (필수)
    @IsString()
    phone: string;
}
