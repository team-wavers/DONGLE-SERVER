import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRequiredEnv } from '../../common/lib/utils';
import { CreateFeedbackDto, FeedbackCategory } from './dto/create-feedback.dto';

type FeedbackRole = 'admin' | 'president';

interface FeedbackRequester {
    role: string;
    club_id: number | null;
}

interface BuildFeedbackIssueInput {
    category: FeedbackCategory;
    content: string;
    pageUrl: string;
    role: FeedbackRole;
    clubId: number | null;
    createdAt?: Date;
}

const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, { label: string; subjectLabel: string }> = {
    bug: { label: '오류가 발생했어요', subjectLabel: '오류' },
    inconvenience: { label: '사용하기 불편해요', subjectLabel: '불편' },
    feature: { label: '새로운 기능을 제안해요', subjectLabel: '기능 제안' },
    other: { label: '기타 문의', subjectLabel: '기타' },
};

export function buildFeedbackIssue({
    category,
    content,
    pageUrl,
    role,
    clubId,
    createdAt = new Date(),
}: BuildFeedbackIssueInput): { title: string; body: string } {
    const { label, subjectLabel } = FEEDBACK_CATEGORY_LABELS[category];
    const roleLabel = role === 'admin' ? '총동아리연합회 관리자' : '동아리 회장';
    const clubLine = role === 'president' && clubId ? `\n- 동아리 ID: ${clubId}` : '';

    const title = `[동글 어드민][${subjectLabel}] 버그 및 개선사항 문의`;
    const body = `[문의 정보]
- 문의 유형: ${label}
- 사용자 역할: ${roleLabel}${clubLine}
- 현재 화면: ${pageUrl}
- 작성 시각: ${createdAt.toISOString()}

[문의 내용]
${content.trim()}`;

    return { title, body };
}

@Injectable()
export class FeedbackService {
    private readonly token: string;
    private readonly repo: string;

    constructor(private readonly config: ConfigService) {
        this.token = getRequiredEnv(this.config, 'GITHUB_FEEDBACK_TOKEN');
        this.repo = getRequiredEnv(this.config, 'GITHUB_FEEDBACK_REPO');
    }

    async create(dto: CreateFeedbackDto, requester: FeedbackRequester): Promise<{ issueUrl: string; issueNumber: number }> {
        const role: FeedbackRole = requester.role.toLowerCase() === 'admin' ? 'admin' : 'president';
        const { title, body } = buildFeedbackIssue({
            category: dto.category,
            content: dto.content,
            pageUrl: dto.pageUrl,
            role,
            clubId: requester.club_id,
        });

        try {
            const response = await fetch(`https://api.github.com/repos/${this.repo}/issues`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, body, labels: ['admin-feedback'] }),
            });

            if (!response.ok) {
                throw new Error(`GitHub API 응답 실패 (status: ${response.status})`);
            }

            const issue = (await response.json()) as { html_url: string; number: number };
            return { issueUrl: issue.html_url, issueNumber: issue.number };
        } catch (err) {
            throw new InternalServerErrorException('피드백 이슈 생성에 실패했습니다.', {
                cause: err instanceof Error ? err : undefined,
            });
        }
    }
}
