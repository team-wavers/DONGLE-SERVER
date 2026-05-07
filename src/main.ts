import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/create-validation-pipe';
import { TransformResponseInterceptor } from './common/response.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const config = app.get(ConfigService);

    app.useGlobalPipes(createValidationPipe());
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    // CORS 설정
    app.enableCors({
        origin: config.get<string>('CORS_ORIGIN')?.split(','),
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    const port = config.get<number>('PORT') || 3000;
    await app.listen(port);

    console.log(
        `🚀 Application running on port ${port} (env: ${process.env.NODE_ENV})`,
    );
}
bootstrap();
