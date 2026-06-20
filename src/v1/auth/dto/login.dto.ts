import { IsString } from 'class-validator';

// 로그인 요청 DTO
export class LoginDto {
    @IsString()
    login_id: string;

    @IsString()
    password: string;
}
