import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const dataSourcePath = resolve(projectRoot, 'dist/database/data-source.js');
const envPath = resolve(projectRoot, '.env.ci');

if (!existsSync(dataSourcePath)) {
    throw new Error('dist/database/data-source.js 파일을 찾을 수 없습니다. yarn build를 먼저 실행하세요.');
}

process.env.NODE_ENV = 'ci';
process.env.DB_HOST = process.env.DB_HOST ?? '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT ?? '5432';
process.env.DB_USERNAME = process.env.DB_USERNAME ?? 'ci';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'ci';
process.env.DB_NAME = process.env.DB_NAME ?? 'ci';

if (!existsSync(envPath)) {
    throw new Error('.env.ci 파일을 찾을 수 없습니다.');
}

const dataSourceModule = await import(pathToFileURL(dataSourcePath).href);
const dataSource = dataSourceModule.default.default ?? dataSourceModule.default;
const migrations = dataSource.options.migrations ?? [];

if (!Array.isArray(migrations) || migrations.length === 0) {
    throw new Error('TypeORM migration이 설정되지 않았습니다.');
}

console.log(`Detected ${migrations.length} migration path(s).`);
