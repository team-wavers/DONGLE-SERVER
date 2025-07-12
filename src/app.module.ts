import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { V1Module } from './v1/v1.module';

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'mysql',
            host: 'localhost', // 실제 환경에 맞게 수정
            port: 3306,
            username: 'root', // 실제 환경에 맞게 수정
            password: 'password', // 실제 환경에 맞게 수정
            database: 'dongle', // 실제 환경에 맞게 수정
            entities: [__dirname + '/**/*.entity.{js,ts}'],
            synchronize: true, // 개발 환경에서만 true, 운영에서는 false 권장
            logging: true,
        }),
        V1Module,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
