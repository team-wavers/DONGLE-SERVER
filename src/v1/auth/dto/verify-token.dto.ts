import { IsString } from 'class-validator';

// 토큰 검증 요청 DTO
export class VerifyTokenDto {
    @IsString()
    token: string;
}
