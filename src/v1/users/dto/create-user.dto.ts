import { IsOptional, IsString } from 'class-validator';

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
    @IsString()
    role: string;

    // 전화번호 (필수)
    @IsString()
    phone: string;

    // 리프레시 토큰 (최초 생성 시는 비워둘 수 있음)
    @IsOptional()
    @IsString()
    refresh_token?: string;
}
