import { Body, Controller, Post, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// 인증 컨트롤러
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 사용자 로그인
  // loginDto: 로그인 DTO
  // return: 토큰 응답
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(loginDto);
  }

  // 액세스 토큰 재발급
  // refreshTokenDto: 리프레시 토큰 DTO
  // return: 새로운 토큰 응답
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refreshToken(refreshTokenDto);
  }

  // 사용자 로그아웃
  // req: 요청 객체 (JWT 가드를 통해 사용자 정보 포함)
  // return: 로그아웃 메시지
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req): Promise<{ message: string }> {
    return this.authService.logout(req.user.userId);
  }
} 