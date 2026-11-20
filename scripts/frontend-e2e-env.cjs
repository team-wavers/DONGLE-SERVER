const { execFileSync } = require('node:child_process');

const keyPattern = /^\s*(?:export\s+)?FRONT_E2E_DISPATCH_TOKEN(?:\s|=|$)/;
const assignmentPattern =
    /^\s*(?:export\s+)?FRONT_E2E_DISPATCH_TOKEN\s*=\s*(.*?)\s*$/;
const tokenPattern = /^(?:github_pat_|ghp_)[A-Za-z0-9_]+$/;

function readToken(content) {
    const lines = content.split('\n').filter((line) => keyPattern.test(line));
    if (lines.length === 0) return undefined;
    if (lines.length !== 1)
        throw new Error('FRONT_E2E_DISPATCH_TOKEN 키가 중복되었습니다.');
    const match = assignmentPattern.exec(lines[0]);
    if (!match)
        throw new Error(
            'FRONT_E2E_DISPATCH_TOKEN 설정 형식이 올바르지 않습니다.',
        );
    let value = match[1];
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1);
    }
    return validateToken(value);
}

function validateToken(value) {
    if (!tokenPattern.test(value ?? '')) {
        throw new Error(
            'FRONT_E2E_DISPATCH_TOKEN이 없거나 PAT 형식이 올바르지 않습니다.',
        );
    }
    return value;
}

function resolveDispatchToken(content, fallback) {
    return readToken(content) ?? validateToken(fallback);
}

function stripDispatchToken(content) {
    readToken(content);
    return content
        .split('\n')
        .filter((line) => !keyPattern.test(line))
        .join('\n');
}

function main() {
    const content = process.env.ENV_FILE_CONTENT ?? '';
    if (process.argv[2] === 'strip') {
        process.stdout.write(stripDispatchToken(content));
        return;
    }
    if (process.argv[2] !== 'dispatch')
        throw new Error('지원하지 않는 실행 모드입니다.');
    const token = resolveDispatchToken(
        content,
        process.env.FALLBACK_DISPATCH_TOKEN,
    );
    // 토큰은 단일 행 PAT로 검증한 뒤, 외부 명령 실행 전에 마스킹한다.
    process.stdout.write(`::add-mask::${token}\n`);
    if (!process.env.SERVER_SHA) throw new Error('SERVER_SHA가 필요합니다.');
    execFileSync(
        'gh',
        [
            'workflow',
            'run',
            'dev-e2e.yml',
            '--repo',
            'team-wavers/DONGLE-FRONT',
            '--ref',
            'dev',
            '--field',
            `server_sha=${process.env.SERVER_SHA}`,
        ],
        {
            stdio: 'inherit',
            env: {
                ...process.env,
                ENV_FILE_CONTENT: '',
                FALLBACK_DISPATCH_TOKEN: '',
                GH_TOKEN: token,
            },
        },
    );
}

module.exports = { resolveDispatchToken, stripDispatchToken, main };
if (require.main === module) {
    try {
        main();
    } catch {
        // 외부 명령 오류 객체에도 인증 정보가 들어갈 수 있으므로 고정 메시지만 출력한다.
        console.error(
            '프런트 E2E 환경 설정 또는 워크플로 호출에 실패했습니다.',
        );
        process.exitCode = 1;
    }
}
