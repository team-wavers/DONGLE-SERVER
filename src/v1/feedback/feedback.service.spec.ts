import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeedbackService, buildFeedbackIssue } from './feedback.service';

describe('buildFeedbackIssue', () => {
    it('관리자 역할이면 제목/본문에 관리자 라벨과 화면/작성시각/내용을 포함한다', () => {
        const { title, body } = buildFeedbackIssue({
            category: 'bug',
            content: '  버튼이 안 눌려요  ',
            pageUrl: 'https://admin.dongle.app/clubs',
            role: 'admin',
            clubId: null,
            createdAt: new Date('2026-08-17T03:00:00.000Z'),
        });

        expect(title).toContain('[오류]');
        expect(body).toContain('총동아리연합회 관리자');
        expect(body).toContain('https://admin.dongle.app/clubs');
        expect(body).toContain('2026-08-17T03:00:00.000Z');
        expect(body).toContain('버튼이 안 눌려요');
        expect(body).not.toContain('동아리 ID');
    });

    it('회장 역할이고 clubId가 있으면 본문에 동아리 ID 라인을 포함한다', () => {
        const { body } = buildFeedbackIssue({
            category: 'feature',
            content: '일정 등록 기능이 있으면 좋겠어요',
            pageUrl: 'https://admin.dongle.app/schedule',
            role: 'president',
            clubId: 12,
        });

        expect(body).toContain('동아리 회장');
        expect(body).toContain('동아리 ID: 12');
    });

    it('content 앞뒤 공백을 제거한다', () => {
        const { body } = buildFeedbackIssue({
            category: 'other',
            content: '   문의합니다   ',
            pageUrl: 'https://admin.dongle.app',
            role: 'admin',
            clubId: null,
        });

        expect(body).toContain('[문의 내용]\n문의합니다');
    });
});

describe('FeedbackService', () => {
    let service: FeedbackService;
    let config: { get: jest.Mock };
    let fetchMock: jest.Mock;

    beforeEach(() => {
        config = {
            get: jest.fn((key: string) => {
                if (key === 'GH_FEEDBACK_TOKEN') return 'test-token';
                if (key === 'GITHUB_FEEDBACK_REPO') return 'team-wavers/DONGLE-FRONT';
                return undefined;
            }),
        };
        service = new FeedbackService(config as unknown as ConfigService);
        fetchMock = jest.fn();
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    it('GitHub 설정이 없어도 서비스를 생성할 수 있다', () => {
        const emptyConfig = { get: jest.fn().mockReturnValue(undefined) };

        expect(() => new FeedbackService(emptyConfig as unknown as ConfigService)).not.toThrow();
    });

    it('GitHub 설정이 없으면 이슈 생성 시 실패하고 API를 호출하지 않는다', async () => {
        const emptyConfig = { get: jest.fn().mockReturnValue(undefined) };
        const unconfiguredService = new FeedbackService(emptyConfig as unknown as ConfigService);

        await expect(
            unconfiguredService.create(
                { category: 'bug', content: '오류 문의', pageUrl: 'https://admin.dongle.app' },
                { role: 'admin', club_id: null },
            ),
        ).rejects.toThrow(InternalServerErrorException);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('GitHub API 성공 시 이슈 URL/번호를 반환하고 올바른 요청을 보낸다', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                html_url: 'https://github.com/team-wavers/DONGLE-FRONT/issues/101',
                number: 101,
            }),
        });

        const result = await service.create(
            { category: 'bug', content: '오류 문의', pageUrl: 'https://admin.dongle.app' },
            { role: 'admin', club_id: null },
        );

        expect(result).toEqual({
            issueUrl: 'https://github.com/team-wavers/DONGLE-FRONT/issues/101',
            issueNumber: 101,
        });
        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.github.com/repos/team-wavers/DONGLE-FRONT/issues',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-token',
                    Accept: 'application/vnd.github+json',
                }),
            }),
        );
    });

    it('GitHub API가 실패 응답을 반환하면 InternalServerErrorException을 던진다', async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            status: 401,
            json: jest.fn().mockResolvedValue({}),
        });

        await expect(
            service.create(
                { category: 'bug', content: '오류 문의', pageUrl: 'https://admin.dongle.app' },
                { role: 'admin', club_id: null },
            ),
        ).rejects.toThrow(InternalServerErrorException);
    });

    it('fetch가 네트워크 오류로 실패하면 InternalServerErrorException을 던진다', async () => {
        fetchMock.mockRejectedValue(new Error('network down'));

        await expect(
            service.create(
                { category: 'bug', content: '오류 문의', pageUrl: 'https://admin.dongle.app' },
                { role: 'president', club_id: 5 },
            ),
        ).rejects.toThrow(InternalServerErrorException);
    });
});
