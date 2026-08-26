import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateFeedbackDto } from './create-feedback.dto';

describe('CreateFeedbackDto', () => {
    it('허용되지 않은 category면 검증에 실패한다', async () => {
        const dto = plainToInstance(CreateFeedbackDto, {
            category: 'unknown',
            content: '문의합니다',
            pageUrl: 'https://admin.dongle.app',
        });

        const errors = await validate(dto);

        expect(errors.some((error) => error.property === 'category')).toBe(true);
    });

    it('content가 공백만 있으면 검증에 실패한다', async () => {
        const dto = plainToInstance(CreateFeedbackDto, {
            category: 'bug',
            content: '   ',
            pageUrl: 'https://admin.dongle.app',
        });

        const errors = await validate(dto);

        expect(errors.some((error) => error.property === 'content')).toBe(true);
    });

    it('정상 payload는 검증을 통과한다', async () => {
        const dto = plainToInstance(CreateFeedbackDto, {
            category: 'feature',
            content: '기능 제안입니다',
            pageUrl: 'https://admin.dongle.app',
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
    });
});
