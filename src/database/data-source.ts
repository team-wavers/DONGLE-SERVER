import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

function loadEnvFile(): void {
    const nodeEnv = process.env.NODE_ENV;
    if (!nodeEnv) {
        throw new Error('NODE_ENV 환경변수가 설정되지 않았습니다.');
    }

    const envFilePath = resolve(process.cwd(), `.env.${nodeEnv}`);
    if (!existsSync(envFilePath)) {
        throw new Error(`${envFilePath} 파일을 찾을 수 없습니다.`);
    }

    const envFile = readFileSync(envFilePath, 'utf8');
    for (const line of envFile.split('\n')) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) {
            continue;
        }

        const separatorIndex = trimmedLine.indexOf('=');
        if (separatorIndex === -1) {
            continue;
        }

        const key = trimmedLine.slice(0, separatorIndex).trim();
        const value = trimmedLine.slice(separatorIndex + 1).trim();
        if (!process.env[key]) {
            process.env[key] = value.replace(/^['"]|['"]$/g, '');
        }
    }
}

function getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`${key} 환경변수가 설정되지 않았습니다.`);
    }
    return value;
}

loadEnvFile();

export default new DataSource({
    type: 'postgres',
    host: getRequiredEnv('DB_HOST'),
    port: parseInt(getRequiredEnv('DB_PORT'), 10),
    username: getRequiredEnv('DB_USERNAME'),
    password: getRequiredEnv('DB_PASSWORD'),
    database: getRequiredEnv('DB_NAME'),
    entities: [resolve(__dirname, '../**/*.entity.js')],
    migrations: [resolve(__dirname, 'migrations/*.js')],
    synchronize: false,
});
