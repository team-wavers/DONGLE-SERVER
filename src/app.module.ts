import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { V1Module } from './v1/v1.module';
import { postgreConfig } from './lib/postgre';

@Module({
    imports: [
        TypeOrmModule.forRoot(postgreConfig),
        V1Module,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
