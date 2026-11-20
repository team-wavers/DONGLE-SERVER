import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import * as dispatchEnv from '../../scripts/frontend-e2e-env.cjs';

const { resolveDispatchToken, stripDispatchToken } = dispatchEnv as {
    resolveDispatchToken: (content: string, fallback?: string) => string;
    stripDispatchToken: (content: string) => string;
};

const token = 'github_pat_test123';

describe('프런트 E2E dispatch 환경 설정', () => {
    it.each([
        `FRONT_E2E_DISPATCH_TOKEN=${token}`,
        ` export FRONT_E2E_DISPATCH_TOKEN = '${token}'\r`,
        `FRONT_E2E_DISPATCH_TOKEN="${token}"`,
    ])('ENV_FILE의 토큰을 별도 Secret보다 우선한다: %s', (line) => {
        expect(
            resolveDispatchToken(`API_PORT=5001\n${line}`, 'ghp_fallback'),
        ).toBe(token);
    });

    it('ENV_FILE에 키가 없으면 별도 Secret을 사용한다', () => {
        expect(resolveDispatchToken('API_PORT=5001', 'ghp_fallback')).toBe(
            'ghp_fallback',
        );
    });

    it.each([
        '',
        'FRONT_E2E_DISPATCH_TOKEN=',
        `FRONT_E2E_DISPATCH_TOKEN=${token}\nFRONT_E2E_DISPATCH_TOKEN=${token}`,
        'FRONT_E2E_DISPATCH_TOKEN=$(echo unsafe)',
        'FRONT_E2E_DISPATCH_TOKEN="github_pat_test\ncontinued"',
        'FRONT_E2E_DISPATCH_TOKEN',
    ])(
        '누락·중복·잘못된 토큰은 비밀을 포함하지 않는 오류로 거부한다',
        (content) => {
            expect(() => resolveDispatchToken(content)).toThrow();
            try {
                resolveDispatchToken(content);
            } catch (error) {
                expect((error as Error).message).not.toContain(token);
                expect((error as Error).message).not.toContain('unsafe');
            }
        },
    );

    it('서버 전달 환경파일에서는 토큰만 제거한다', () => {
        expect(
            stripDispatchToken(
                `API_PORT=5001\n export FRONT_E2E_DISPATCH_TOKEN='${token}'\r\nJWT_SECRET=keep\n`,
            ),
        ).toBe('API_PORT=5001\nJWT_SECRET=keep\n');
        expect(stripDispatchToken('API_PORT=5001\n')).toBe('API_PORT=5001\n');
    });

    it('dispatch CLI는 토큰을 마스킹하고 환경변수로 gh에 전달한다', () => {
        const script = resolve(__dirname, '../../scripts/frontend-e2e-env.cjs');
        const output = execFileSync(
            process.execPath,
            [
                '-e',
                `
            const cp = require('node:child_process');
            cp.execFileSync = (command, args, options) => {
                if (command !== 'gh' || options.env.GH_TOKEN !== ${JSON.stringify(token)} ||
                    options.env.ENV_FILE_CONTENT || options.env.FALLBACK_DISPATCH_TOKEN ||
                    args.includes(${JSON.stringify(token)}) || !args.includes('server_sha=test-sha')) {
                    throw new Error('dispatch contract failed');
                }
                console.log('dispatch-ok');
            };
            process.argv = [process.execPath, ${JSON.stringify(script)}, 'dispatch'];
            require(${JSON.stringify(script)}).main();
        `,
            ],
            {
                encoding: 'utf8',
                env: {
                    ...process.env,
                    ENV_FILE_CONTENT: `FRONT_E2E_DISPATCH_TOKEN=${token}`,
                    SERVER_SHA: 'test-sha',
                },
            },
        );
        expect(output).toBe(`::add-mask::${token}\ndispatch-ok\n`);
    });
});
