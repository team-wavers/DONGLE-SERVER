import { Repository } from 'typeorm';
import { ClubReportsService } from './club_reports.service';
import { ClubReport } from './entities/club_report.entity';

describe('공개 최근 활동보고서', () => {
    let service: ClubReportsService;
    let repository: { query: jest.Mock; find: jest.Mock };
    const row = {
        id: 178,
        title: '10월 활동보고서',
        created_at: new Date('2026-11-10T01:48:25.697Z'),
        club_id: 2,
        club_name: '스파이크',
        image_urls: ['https://example.com/attached.jpg'],
        content: '<img src="https://example.com/body.jpg">',
    };

    beforeEach(() => {
        repository = { query: jest.fn(), find: jest.fn() };
        service = new ClubReportsService(
            repository as unknown as Repository<ClubReport>,
        );
    });

    it('삭제되지 않은 동아리별 최신 글을 전체 최신순 네 건으로 한 SQL에서 제한한다', async () => {
        repository.query.mockResolvedValue([]);
        await service.findRecentPublic();

        expect(repository.query).toHaveBeenCalledTimes(1);
        expect(repository.find).not.toHaveBeenCalled();
        const [query, parameters] = repository.query.mock.calls[0] as [
            string,
            unknown[],
        ];
        const sql = query.replace(/\s+/g, ' ').trim();
        expect(sql).toMatch(/DISTINCT ON\s*\(report\.club_id\)/i);
        expect(sql).toMatch(
            /INNER JOIN clubs club ON club\.id = report\.club_id/i,
        );
        expect(sql).toMatch(/report\.deleted_at IS NULL/i);
        expect(sql).toMatch(/club\.deleted_at IS NULL/i);
        expect(sql).toMatch(
            /ORDER BY report\.club_id, report\.created_at DESC, report\.id DESC/i,
        );
        expect(sql).toMatch(
            /ORDER BY created_at DESC, id DESC LIMIT \$1\s*\)/i,
        );
        expect(sql).toMatch(
            /ORDER BY recent\.created_at DESC, recent\.id DESC$/i,
        );
        expect(parameters).toEqual([4]);
    });

    it('카드 필드만 응답하고 본문·관계·인증 비밀은 노출하지 않는다', async () => {
        repository.query.mockResolvedValue([
            {
                ...row,
                password: 'secret',
                refresh_token: 'secret',
                club: { president: { password: 'secret' } },
            },
        ]);

        await expect(service.findRecentPublic()).resolves.toEqual([
            {
                id: 178,
                title: '10월 활동보고서',
                createdAt: '2026-11-10T01:48:25.697Z',
                club_id: 2,
                club_name: '스파이크',
                thumbnail_url: 'https://example.com/attached.jpg',
            },
        ]);
    });

    it.each([
        [
            '첨부 우선',
            [' ', 'https://example.com/attached.jpg'],
            row.content,
            'https://example.com/attached.jpg',
        ],
        [
            '본문 fallback',
            ['', '  '],
            row.content,
            'https://example.com/body.jpg',
        ],
        [
            '빈 첨부 목록',
            [],
            '<img alt="활동" src=\'https://example.com/body.jpg\'>',
            'https://example.com/body.jpg',
        ],
        ['이미지 없음', [], '<p>활동 소식</p>', null],
        ['nullable 필드', null, null, null],
        [
            'nullable 배열 항목',
            [null, ' '],
            row.content,
            'https://example.com/body.jpg',
        ],
    ])(
        '%s 썸네일 계약을 유지한다',
        async (_name, imageUrls, content, thumbnailUrl) => {
            repository.query.mockResolvedValue([
                { ...row, title: null, image_urls: imageUrls, content },
            ]);
            const result = await service.findRecentPublic();
            expect(result[0]).toMatchObject({
                title: '',
                thumbnail_url: thumbnailUrl,
            });
        },
    );

    it('보고서가 없으면 빈 배열을 반환한다', async () => {
        repository.query.mockResolvedValue([]);
        await expect(service.findRecentPublic()).resolves.toEqual([]);
    });
});
