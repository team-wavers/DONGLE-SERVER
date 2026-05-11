import {
    HttpException,
    HttpStatus,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { MainBanner } from './entities/main_banner.entity';
import { UpsertMainBannerDto } from './dto/upsert-main-banner.dto';

@Injectable()
export class MainBannersService {
    constructor(
        @InjectRepository(MainBanner)
        private readonly mainBannerRepository: Repository<MainBanner>,
    ) {}

    async create(dto: UpsertMainBannerDto) {
        const payload = this.toEntityPayload(dto);
        const banner = this.mainBannerRepository.create(payload);
        return await this.mainBannerRepository.save(banner);
    }

    async update(id: number, dto: UpsertMainBannerDto) {
        const payload = this.toEntityPayload(dto);

        const result = await this.mainBannerRepository.update(
            { id, deleted_at: IsNull() },
            payload,
        );

        if (result.affected === 0) {
            throw new HttpException(
                '해당 배너가 존재하지 않습니다.',
                HttpStatus.BAD_REQUEST,
            );
        }

        return await this.mainBannerRepository.findOne({
            where: { id, deleted_at: IsNull() },
        });
    }

    async remove(id: number) {
        const result = await this.mainBannerRepository.update(
            { id, deleted_at: IsNull() },
            { deleted_at: new Date() },
        );

        if (result.affected === 0) {
            throw new HttpException(
                '해당 배너가 존재하지 않습니다.',
                HttpStatus.BAD_REQUEST,
            );
        }

        return result;
    }

    async findAllForAdmin() {
        return await this.mainBannerRepository.find({
            where: {
                deleted_at: IsNull(),
            },
            order: {
                created_at: 'DESC',
            },
        });
    }

    async findOneForAdmin(id: number) {
        const banner = await this.mainBannerRepository.findOne({
            where: { id, deleted_at: IsNull() },
        });

        if (!banner) {
            throw new NotFoundException('해당 배너가 존재하지 않습니다.');
        }

        return banner;
    }

    async findActive() {
        const now = new Date();

        return await this.mainBannerRepository.find({
            where: {
                deleted_at: IsNull(),
                is_active: true,
                publish_start_at: LessThanOrEqual(now),
                publish_end_at: MoreThanOrEqual(now),
            },
            order: {
                publish_start_at: 'DESC',
            },
        });
    }

    private toEntityPayload(dto: UpsertMainBannerDto) {
        this.validateRequired(dto);

        const publishStartAt = this.parseSeoulDateTime(dto.publish_start_at);
        const publishEndAt = this.parseSeoulDateTime(dto.publish_end_at);

        if (publishStartAt >= publishEndAt) {
            throw new HttpException(
                '공개 시작일은 종료일보다 이전이어야 합니다.',
                HttpStatus.BAD_REQUEST,
            );
        }

        return {
            image_url: dto.image_url,
            link_url: dto.link_url?.trim() || null,
            publish_start_at: publishStartAt,
            publish_end_at: publishEndAt,
            is_active: dto.is_active,
        };
    }

    private validateRequired(dto: UpsertMainBannerDto) {
        if (!dto.image_url?.trim()) {
            throw new HttpException(
                'image_url은 필수입니다.',
                HttpStatus.BAD_REQUEST,
            );
        }

        if (!dto.publish_start_at?.trim() || !dto.publish_end_at?.trim()) {
            throw new HttpException(
                '공개 시작일과 종료일은 필수입니다.',
                HttpStatus.BAD_REQUEST,
            );
        }

        if (typeof dto.is_active !== 'boolean') {
            throw new HttpException(
                'is_active는 boolean 타입이어야 합니다.',
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    private parseSeoulDateTime(input: string): Date {
        const trimmed = input.trim();

        let normalized = trimmed;
        const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmed);

        if (!hasTimezone) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                normalized = `${trimmed}T00:00:00+09:00`;
            } else if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(trimmed)) {
                normalized = `${trimmed.replace(' ', 'T')}:00+09:00`;
            } else if (
                /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(trimmed)
            ) {
                normalized = `${trimmed.replace(' ', 'T')}+09:00`;
            }
        }

        const date = new Date(normalized);
        if (Number.isNaN(date.getTime())) {
            throw new HttpException(
                '날짜 형식이 올바르지 않습니다.',
                HttpStatus.BAD_REQUEST,
            );
        }

        return date;
    }
}
