import { HttpException, HttpStatus } from '@nestjs/common';
import { FindOperator, Repository, UpdateResult } from 'typeorm';
import { MainBanner } from './entities/main_banner.entity';
import { MainBannersService } from './main_banners.service';

const seoulDate = (value: string) => new Date(`${value}+09:00`);

describe('MainBannersService', () => {
    let service: MainBannersService;
    let repository: {
        create: jest.Mock;
        save: jest.Mock;
        update: jest.Mock;
        findOne: jest.Mock;
        find: jest.Mock;
    };

    const validDto = {
        image_url: 'https://cdn.example.com/banner.webp',
        link_url: 'https://www.dongle.example.com/notices/1',
        publish_start_at: '2026-05-01 09:00:00',
        publish_end_at: '2026-05-31 23:59:59',
        is_active: true,
    };

    beforeEach(() => {
        repository = {
            create: jest.fn((payload) => ({ id: 1, ...payload })),
            save: jest.fn(async (banner) => ({ ...banner })),
            update: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
        };

        service = new MainBannersService(
            repository as unknown as Repository<MainBanner>,
        );
    });

    describe('create', () => {
        it('필수값과 날짜를 검증한 뒤 Seoul 기준 Date payload를 저장한다', async () => {
            const result = await service.create(validDto);

            const expectedPayload = {
                image_url: validDto.image_url,
                link_url: validDto.link_url,
                publish_start_at: seoulDate('2026-05-01T09:00:00'),
                publish_end_at: seoulDate('2026-05-31T23:59:59'),
                is_active: true,
            };

            expect(repository.create).toHaveBeenCalledWith(expectedPayload);
            expect(repository.save).toHaveBeenCalledWith({
                id: 1,
                ...expectedPayload,
            });
            expect(result).toEqual({ id: 1, ...expectedPayload });
        });

        it('link_url이 없거나 공백이면 null payload로 저장한다', async () => {
            await service.create({
                ...validDto,
                link_url: '   ',
            });

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    link_url: null,
                }),
            );
        });

        it('날짜만 입력되면 Seoul 자정 기준 Date payload로 변환한다', async () => {
            await service.create({
                ...validDto,
                publish_start_at: '2026-05-01',
                publish_end_at: '2026-05-02',
            });

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    publish_start_at: seoulDate('2026-05-01T00:00:00'),
                    publish_end_at: seoulDate('2026-05-02T00:00:00'),
                }),
            );
        });

        it('명시적인 timezone이 있으면 입력 timezone 그대로 Date payload로 변환한다', async () => {
            await service.create({
                ...validDto,
                publish_start_at: '2026-05-01T00:00:00Z',
                publish_end_at: '2026-05-02T00:00:00Z',
            });

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    publish_start_at: new Date('2026-05-01T00:00:00Z'),
                    publish_end_at: new Date('2026-05-02T00:00:00Z'),
                }),
            );
        });

        it.each([
            [
                'image_url',
                { ...validDto, image_url: '   ' },
                'image_url은 필수입니다.',
            ],
            [
                'publish_start_at',
                { ...validDto, publish_start_at: '' },
                '공개 시작일과 종료일은 필수입니다.',
            ],
            [
                'publish_end_at',
                { ...validDto, publish_end_at: '   ' },
                '공개 시작일과 종료일은 필수입니다.',
            ],
        ])(
            '%s 필수값이 없으면 Bad Request를 던진다',
            async (_field, dto, message) => {
                await expect(service.create(dto)).rejects.toMatchObject({
                    status: HttpStatus.BAD_REQUEST,
                    message,
                });
                expect(repository.create).not.toHaveBeenCalled();
                expect(repository.save).not.toHaveBeenCalled();
            },
        );

        it('날짜 형식이 올바르지 않으면 Bad Request를 던진다', async () => {
            await expect(
                service.create({
                    ...validDto,
                    publish_start_at: 'invalid-date',
                }),
            ).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                message: '날짜 형식이 올바르지 않습니다.',
            });
        });

        it('시작일이 종료일과 같거나 늦으면 Bad Request를 던진다', async () => {
            await expect(
                service.create({
                    ...validDto,
                    publish_start_at: '2026-05-31 23:59:59',
                    publish_end_at: '2026-05-31 23:59:59',
                }),
            ).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                message: '공개 시작일은 종료일보다 이전이어야 합니다.',
            });

            await expect(
                service.create({
                    ...validDto,
                    publish_start_at: '2026-06-01 00:00:00',
                    publish_end_at: '2026-05-31 23:59:59',
                }),
            ).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                message: '공개 시작일은 종료일보다 이전이어야 합니다.',
            });
        });

        it('is_active가 boolean이 아니면 Bad Request를 던진다', async () => {
            await expect(
                service.create({
                    ...validDto,
                    is_active: 'true' as unknown as boolean,
                }),
            ).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                message: 'is_active는 boolean 타입이어야 합니다.',
            });
        });
    });

    describe('update', () => {
        it('존재하는 배너를 수정한 뒤 수정된 단건을 반환한다', async () => {
            const updatedBanner = { id: 7, image_url: validDto.image_url };
            repository.update.mockResolvedValue({ affected: 1 } as UpdateResult);
            repository.findOne.mockResolvedValue(updatedBanner);

            const result = await service.update(7, validDto);

            expect(repository.update).toHaveBeenCalledWith(
                expect.objectContaining({ id: 7 }),
                expect.objectContaining({
                    image_url: validDto.image_url,
                    link_url: validDto.link_url,
                }),
            );
            expect(repository.findOne).toHaveBeenCalledWith({
                where: expect.objectContaining({ id: 7 }),
            });
            expect(result).toBe(updatedBanner);
        });

        it('수정 대상이 없으면 Bad Request를 던진다', async () => {
            repository.update.mockResolvedValue({ affected: 0 } as UpdateResult);

            await expect(service.update(404, validDto)).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                message: '해당 배너가 존재하지 않습니다.',
            });
            expect(repository.findOne).not.toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('존재하는 배너를 soft delete 처리한다', async () => {
            const updateResult = { affected: 1 } as UpdateResult;
            repository.update.mockResolvedValue(updateResult);

            const result = await service.remove(7);

            expect(repository.update).toHaveBeenCalledWith(
                expect.objectContaining({ id: 7 }),
                { deleted_at: expect.any(Date) },
            );
            expect(result).toBe(updateResult);
        });

        it('삭제 대상이 없으면 Bad Request를 던진다', async () => {
            repository.update.mockResolvedValue({ affected: 0 } as UpdateResult);

            const promise = service.remove(404);
            await expect(promise).rejects.toBeInstanceOf(HttpException);
            await expect(promise).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                message: '해당 배너가 존재하지 않습니다.',
            });
        });
    });

    describe('findActive', () => {
        beforeEach(() => {
            jest.useFakeTimers().setSystemTime(new Date('2026-05-07T12:00:00Z'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('삭제되지 않고 활성화되어 있으며 현재 공개 기간에 포함된 배너를 최신 시작일 순으로 조회한다', async () => {
            const activeBanners = [{ id: 1 }, { id: 2 }];
            repository.find.mockResolvedValue(activeBanners);

            const result = await service.findActive();

            const findOptions = repository.find.mock.calls[0][0];
            expect(findOptions.where).toEqual(
                expect.objectContaining({
                    deleted_at: expect.any(FindOperator),
                    is_active: true,
                    publish_start_at: expect.any(FindOperator),
                    publish_end_at: expect.any(FindOperator),
                }),
            );
            expect(findOptions.where.publish_start_at.value).toEqual(
                new Date('2026-05-07T12:00:00Z'),
            );
            expect(findOptions.where.publish_end_at.value).toEqual(
                new Date('2026-05-07T12:00:00Z'),
            );
            expect(findOptions.order).toEqual({ publish_start_at: 'DESC' });
            expect(result).toBe(activeBanners);
        });
    });
});
