import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/create-validation-pipe';
import { TransformResponseInterceptor } from './common/response.interceptor';
// cookie-parser exports a CommonJS function and must not be accessed through `.default`.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');

export async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const config = app.get(ConfigService);

    app.useGlobalPipes(createValidationPipe());
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    app.use(cookieParser());
    // CORS 설정
    const corsOrigins = config
        .get<string>('CORS_ORIGIN')
        ?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    app.enableCors({
        // Origin 미설정 시 cross-origin을 허용하지 않아 credentials와의 조합을 안전하게 유지한다.
        origin: corsOrigins?.length ? corsOrigins : false,
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    const port = config.get<number>('PORT') || 3000;
    await app.listen(port);

    console.log(
        `🚀 Application running on port ${port} (env: ${process.env.NODE_ENV})`,
    );
}

if (require.main === module) {
    void bootstrap();
}
