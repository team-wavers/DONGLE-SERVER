// 토큰 응답 DTO
export class TokenResponseDto {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;

    constructor(accessToken: string, refreshToken: string, expiresIn: number) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenType = 'Bearer';
        this.expiresIn = expiresIn;
    }
}
