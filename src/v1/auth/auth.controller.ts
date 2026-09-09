import {
    Body,
    Controller,
    Post,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    BadRequestException,
    InternalServerErrorException,
    Get,
    Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// 인증 컨트롤러
@Controller()
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // 사용자 로그인
    // loginDto: 로그인 DTO
    // return: 토큰 응답
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() loginDto: LoginDto,
        @Res({ passthrough: true }) response: Response,
    ): Promise<TokenResponseDto> {
        const tokens = await this.authService.login(loginDto);
        this.setTokenCookies(response, tokens);
        return tokens;
    }

    // 액세스 토큰 재발급
    // refreshTokenDto: 리프레시 토큰 DTO
    // return: 새로운 토큰 응답
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshToken(
        @Body() refreshTokenDto: Partial<RefreshTokenDto>,
        @Request() req,
        @Res({ passthrough: true }) response: Response,
    ): Promise<TokenResponseDto> {
        const refreshToken =
            refreshTokenDto?.refreshToken || this.getCookie(req, 'refreshToken');
        if (!refreshToken) {
            throw new UnauthorizedException('리프레시 토큰이 필요합니다.');
        }

        try {
            const tokens = await this.authService.refreshToken({ refreshToken });
            this.setTokenCookies(response, tokens);
            return tokens;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                this.clearTokenCookies(response);
            }
            throw error;
        }
    }

    // 사용자 로그아웃
    // req: 요청 객체 (JWT 가드를 통해 사용자 정보 포함)
    // return: 로그아웃 메시지
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(
        @Request() req,
        @Res({ passthrough: true }) response: Response,
    ): Promise<{ message: string }> {
        const result = await this.authService.logout(req.user.userId);
        this.clearTokenCookies(response);
        return result;
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async me(@Request() req) {
        return req.user;
    }

    private getCookie(req: any, name: string): string | undefined {
        if (req.cookies?.[name]) {
            return req.cookies[name];
        }
        return req.headers?.cookie
            ?.split(';')
            .map((value: string) => value.trim())
            .find((value: string) => value.startsWith(`${name}=`))
            ?.slice(name.length + 1);
    }

    private setTokenCookies(response: Response, tokens: TokenResponseDto) {
        const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: 'lax' as const,
        };
        const accessPayload = this.decodeToken(tokens.accessToken);
        const refreshPayload = this.decodeToken(tokens.refreshToken);
        if (accessPayload.exp) {
            response.cookie('accessToken', tokens.accessToken, {
                ...cookieOptions,
                expires: new Date(accessPayload.exp * 1000),
            });
        }
        if (refreshPayload.exp) {
            response.cookie('refreshToken', tokens.refreshToken, {
                ...cookieOptions,
                expires: new Date(refreshPayload.exp * 1000),
            });
        }
    }

    private clearTokenCookies(response: Response) {
        response.clearCookie('accessToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
        });
        response.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
        });
    }

    private decodeToken(token: string): { exp?: number } {
        try {
            const payload = JSON.parse(
                Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
            );
            return payload && typeof payload === 'object' ? payload : {};
        } catch {
            return {};
        }
    }

    // 토큰 유효성 검증
    // verifyTokenDto: 검증할 토큰 DTO
    // return: 검증 성공 시 사용자 정보
    @Post('verify')
    @HttpCode(HttpStatus.OK)
    async verifyToken(@Body() verifyTokenDto: VerifyTokenDto): Promise<{
        userId: number;
        login_id: string;
        name: string;
        role: string;
        club_id: number | null;
    }> {
        try {
            return await this.authService.verifyAccessToken(verifyTokenDto.token);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new UnauthorizedException('토큰이 만료되었습니다.');
            } else if (error.name === 'JsonWebTokenError') {
                throw new BadRequestException('유효하지 않은 토큰입니다.');
            } else if (error instanceof UnauthorizedException) {
                // 서비스에서 발생한 UnauthorizedException은 그대로 전달
                throw error;
            } else {
                throw new InternalServerErrorException('토큰 검증 중 오류가 발생했습니다.');
            }
        }
    }
}
