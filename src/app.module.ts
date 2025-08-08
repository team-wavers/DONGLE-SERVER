import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RouterModule } from '@nestjs/core';
import { UsersModule } from './v1/users/users.module';
import { ClubsModule } from './v1/clubs/clubs.module';
import { ClubReportsModule } from './v1/club_reports/club_reports.module';
import { AuthModule } from './v1/auth/auth.module';
import { HealthModule } from './common/health/health.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: `.env.${process.env.NODE_ENV}`,
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('DB_HOST'),
                port: configService.get<number>('DB_PORT'),
                username: configService.get<string>('DB_USERNAME'),
                password: configService.get<string>('DB_PASSWORD'),
                entities: [__dirname + '/**/*.entity{.ts}'],
                synchronize: false,
            }),
        }),
        RouterModule.register([
            {
                path: 'v1',
                children: [
                    { path: 'users', module: UsersModule },
                    { path: 'clubs', module: ClubsModule },
                    { path: 'club-reports', module: ClubReportsModule },
                    { path: 'auth', module: AuthModule },
                    { path: 'healthCheck', module: HealthModule}
                ],
            },
        ]),
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
