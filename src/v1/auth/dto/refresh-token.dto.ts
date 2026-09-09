import { IsOptional, IsString } from 'class-validator';

// 토큰 재발급 요청 DTO
export class RefreshTokenDto {
    @IsOptional()
    @IsString()
    refreshToken: string;
}
