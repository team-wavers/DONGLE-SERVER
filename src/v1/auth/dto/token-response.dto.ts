import { IsNumber, IsString } from 'class-validator';

// 토큰 응답 DTO
export class TokenResponseDto {
    @IsString()
    accessToken: string;

    @IsString()
    refreshToken: string;

    @IsString()
    tokenType: string;

    @IsNumber()
    expiresIn: number;

    constructor(accessToken: string, refreshToken: string, expiresIn: number) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenType = 'Bearer';
        this.expiresIn = expiresIn;
    }
}
