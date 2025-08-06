import { ConfigService } from '@nestjs/config';

export function getRequiredEnv(config: ConfigService, key: string): string {
    const value = config.get<string>(key);
    if (!value) {
        throw new Error(`${key} 환경변수가 설정되지 않았습니다.`);
    }
    return value;
}
