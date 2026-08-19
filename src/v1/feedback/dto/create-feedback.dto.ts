import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const FEEDBACK_CATEGORIES = ['bug', 'inconvenience', 'feature', 'other'] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export class CreateFeedbackDto {
    @IsIn(FEEDBACK_CATEGORIES)
    category: FeedbackCategory;

    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    content: string;

    @IsString()
    pageUrl: string;
}
