import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
    @Get()
    healthCheck() {
        return {
            status: 'ok',
            environment: process.env.NODE_ENV,
            release: process.env.RELEASE_SHA ?? 'unknown',
        };
    }
}
