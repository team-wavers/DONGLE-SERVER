import { IsString } from 'class-validator';

// 토큰 재발급 요청 DTO
export class RefreshTokenDto {
    @IsString()
    refreshToken: string;
}
