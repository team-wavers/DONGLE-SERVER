import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        UsersModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const jwtSecret = configService.get<string>('jwt_access_secret');
                const jwtExpireTime = configService.get<string>('jwt_access_expire_time');
                
                if (!jwtSecret) {
                    throw new Error('jwt_access_secret 환경변수가 설정되지 않았습니다.');
                }
                
                return {
                    secret: jwtSecret,
                    signOptions: {
                        expiresIn: jwtExpireTime || '15m',
                    },
                };
            },
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule {}
