import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const dataSourcePath = resolve(projectRoot, 'dist/database/data-source.js');
const envPath = resolve(projectRoot, '.env.ci');

if (!existsSync(dataSourcePath)) {
    throw new Error('dist/database/data-source.js 파일을 찾을 수 없습니다. yarn build를 먼저 실행하세요.');
}

if (!existsSync(envPath)) {
    throw new Error('.env.ci 파일을 찾을 수 없습니다.');
}

process.env.NODE_ENV = 'ci';
process.env.DB_HOST = process.env.DB_HOST ?? '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT ?? '5432';
process.env.DB_USERNAME = process.env.DB_USERNAME ?? 'ci';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'ci';
process.env.DB_NAME = process.env.DB_NAME ?? 'ci';

try {
    execSync(
        'node ./node_modules/typeorm/cli.js -d dist/database/data-source.js migration:generate --check src/database/migrations/__drift_check',
        { stdio: 'inherit', cwd: projectRoot, env: process.env },
    );
} catch {
    console.error(
        '엔티티와 마이그레이션이 일치하지 않습니다. yarn typeorm migration:generate 로 새 마이그레이션을 생성하세요.',
    );
    process.exit(1);
}

console.log('마이그레이션과 엔티티 스키마가 일치합니다.');
