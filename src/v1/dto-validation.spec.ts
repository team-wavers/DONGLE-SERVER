import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { createValidationPipe } from '../common/create-validation-pipe';
import { LoginDto } from './auth/dto/login.dto';
import { RefreshTokenDto } from './auth/dto/refresh-token.dto';
import { VerifyTokenDto } from './auth/dto/verify-token.dto';
import {
    ClubScheduleAdminQueryDto,
    ClubScheduleCalendarQueryDto,
    ClubSchedulePresidentQueryDto,
} from './club_schedules/dto/club-schedule-query.dto';
import { CreateClubScheduleDto } from './club_schedules/dto/create-club-schedule.dto';
import { UpdateClubScheduleAdminStatusDto } from './club_schedules/dto/update-club-schedule-admin-status.dto';
import { UpdateClubScheduleDto } from './club_schedules/dto/update-club-schedule.dto';
import { CreateClubReportDto } from './club_reports/dto/create-club_report.dto';
import { UpdateClubReportDto } from './club_reports/dto/update-club_report.dto';
import { CreateClubDto } from './clubs/dto/create-club.dto';
import { UpdateClubDto } from './clubs/dto/update-club.dto';
import { UpsertMainBannerDto } from './main_banners/dto/upsert-main-banner.dto';
import { CreateUserDto } from './users/dto/create-user.dto';
import { UpdateUserDto } from './users/dto/update-user.dto';

const validationPropertyNames = (dto: object) =>
    validateSync(dto).map((error) => error.property);

const validatePlain = <T extends object>(
    dtoClass: new () => T,
    payload: object,
) => validateSync(plainToInstance(dtoClass, payload));

const validationPipe = createValidationPipe();

const transformBody = <T extends object>(
    dtoClass: new () => T,
    payload: object,
) =>
    validationPipe.transform(payload, {
        metatype: dtoClass,
        type: 'body',
    });

describe('DTO runtime validation rules', () => {
    describe('global ValidationPipe behavior', () => {
        it('rejects body fields that are not declared by the DTO', async () => {
            await expect(
                transformBody(CreateUserDto, {
                    name: '관리자',
                    login_id: 'admin',
                    password: 'password',
                    role: 'admin',
                    phone: '010-0000-0000',
                    unknown: 'field',
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('CreateClubDto', () => {
        it('requires key, name, and category strings', () => {
            const errors = validationPropertyNames(new CreateClubDto());

            expect(errors).toEqual(
                expect.arrayContaining(['key', 'name', 'category']),
            );
        });

        it('accepts optional typed fields only when their runtime type matches', () => {
            const validErrors = validatePlain(CreateClubDto, {
                key: 'one-time-key',
                name: '동아리',
                category: '학술',
                sns: { instagram: 'dongle' },
                tags: ['it', 'study'],
                is_recruiting: true,
                location: '학생회관',
                recruit_start: '2026-05-01T00:00:00.000Z',
                recruit_end: '2026-05-31T00:00:00.000Z',
                description: '설명',
                main_activities: '스터디',
                president_id: 1,
            });

            const invalidErrors = validatePlain(CreateClubDto, {
                key: 'one-time-key',
                name: '동아리',
                category: '학술',
                tags: ['it', 1],
                is_recruiting: 'true',
                president_id: '1',
            });

            expect(validErrors).toHaveLength(0);
            expect(invalidErrors.map((error) => error.property)).toEqual(
                expect.arrayContaining([
                    'tags',
                    'is_recruiting',
                    'president_id',
                ]),
            );
        });
    });

    describe('UpdateClubDto', () => {
        it('makes all CreateClubDto fields optional while preserving their types', () => {
            expect(validateSync(new UpdateClubDto())).toHaveLength(0);

            const errors = validatePlain(UpdateClubDto, {
                tags: 'it',
                president_id: '1',
            });

            expect(errors.map((error) => error.property)).toEqual(
                expect.arrayContaining(['tags', 'president_id']),
            );
        });
    });

    describe('CreateUserDto', () => {
        it('requires name, login_id, password, role, and phone strings', () => {
            const errors = validationPropertyNames(new CreateUserDto());

            expect(errors).toEqual(
                expect.arrayContaining([
                    'name',
                    'login_id',
                    'password',
                    'role',
                    'phone',
                ]),
            );
        });

        it('keeps refresh_token optional but validates it as a string when present', () => {
            expect(
                validatePlain(CreateUserDto, {
                    name: '관리자',
                    login_id: 'admin',
                    password: 'password',
                    role: 'admin',
                    phone: '010-0000-0000',
                }),
            ).toHaveLength(0);

            const errors = validatePlain(CreateUserDto, {
                name: '관리자',
                login_id: 'admin',
                password: 'password',
                role: 'admin',
                phone: '010-0000-0000',
                refresh_token: 1,
            });

            expect(errors.map((error) => error.property)).toContain(
                'refresh_token',
            );
        });
    });

    describe('UpdateUserDto', () => {
        it('makes all CreateUserDto fields optional while preserving their types', () => {
            expect(validateSync(new UpdateUserDto())).toHaveLength(0);

            const errors = validatePlain(UpdateUserDto, { phone: 1 });

            expect(errors.map((error) => error.property)).toContain('phone');
        });
    });

    describe('UpsertMainBannerDto', () => {
        it('requires URL/date payload fields as strings and is_active as boolean', () => {
            const missingErrors = validationPropertyNames(
                new UpsertMainBannerDto(),
            );
            const invalidErrors = validatePlain(UpsertMainBannerDto, {
                image_url: 1,
                publish_start_at: true,
                publish_end_at: {},
                is_active: 'true',
            });

            expect(missingErrors).toEqual(
                expect.arrayContaining([
                    'image_url',
                    'publish_start_at',
                    'publish_end_at',
                    'is_active',
                ]),
            );
            expect(invalidErrors.map((error) => error.property)).toEqual(
                expect.arrayContaining([
                    'image_url',
                    'publish_start_at',
                    'publish_end_at',
                    'is_active',
                ]),
            );
        });

        it('validates link_url length before persistence', () => {
            const validErrors = validatePlain(UpsertMainBannerDto, {
                image_url: 'https://cdn.example.com/banner.webp',
                link_url: 'https://www.dongle.example.com/notices/1',
                publish_start_at: '2026-05-01 09:00:00',
                publish_end_at: '2026-05-31 23:59:59',
                is_active: true,
            });
            const invalidErrors = validatePlain(UpsertMainBannerDto, {
                image_url: 'https://cdn.example.com/banner.webp',
                link_url: 'a'.repeat(2049),
                publish_start_at: '2026-05-01 09:00:00',
                publish_end_at: '2026-05-31 23:59:59',
                is_active: true,
            });

            expect(validErrors).toHaveLength(0);
            expect(invalidErrors.map((error) => error.property)).toContain(
                'link_url',
            );
        });
    });

    describe('auth DTOs', () => {
        it('requires login_id/password, refreshToken, and token strings', () => {
            expect(validationPropertyNames(new LoginDto())).toEqual(
                expect.arrayContaining(['login_id', 'password']),
            );
            expect(validationPropertyNames(new RefreshTokenDto())).toContain(
                'refreshToken',
            );
            expect(validationPropertyNames(new VerifyTokenDto())).toContain(
                'token',
            );
        });
    });

    describe('CreateClubReportDto', () => {
        it('keeps club_id optional for route-derived assignment and validates report body fields', () => {
            expect(
                validatePlain(CreateClubReportDto, {
                    title: '활동보고서',
                    content: '본문',
                    image_urls: ['https://example.com/a.png'],
                }),
            ).toHaveLength(0);

            const errors = validatePlain(CreateClubReportDto, {
                club_id: '1',
                title: 1,
                content: 2,
                image_urls: ['ok', 3],
            });

            expect(errors.map((error) => error.property)).toEqual(
                expect.arrayContaining([
                    'club_id',
                    'title',
                    'content',
                    'image_urls',
                ]),
            );
        });
    });

    describe('UpdateClubReportDto', () => {
        it('makes report content fields optional while preserving their types', () => {
            expect(validatePlain(UpdateClubReportDto, {})).toHaveLength(0);
            expect(
                validatePlain(UpdateClubReportDto, { title: '수정된 제목' }),
            ).toHaveLength(0);
            const errors = validatePlain(UpdateClubReportDto, {
                title: 1,
                image_urls: ['ok', 3],
            });

            expect(errors.map((error) => error.property)).toEqual(
                expect.arrayContaining(['title', 'image_urls']),
            );
        });

        it('rejects null update field values instead of treating them as omitted', () => {
            const errors = validatePlain(UpdateClubReportDto, {
                title: null,
                content: null,
                image_urls: null,
            });

            expect(errors.map((error) => error.property)).toEqual(
                expect.arrayContaining(['title', 'content', 'image_urls']),
            );
        });

        it('rejects route-derived club_id as a body field', async () => {
            await expect(
                transformBody(UpdateClubReportDto, {
                    club_id: 1,
                    title: '수정된 제목',
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('club schedule DTOs', () => {
        it('requires schedule title, type, date payload fields, and is_public', () => {
            const missingErrors = validationPropertyNames(
                new CreateClubScheduleDto(),
            );
            const invalidErrors = validatePlain(CreateClubScheduleDto, {
                title: 1,
                type: 'notice',
                start_at: true,
                end_at: {},
                is_public: 'true',
                image_url: 'https://example.com/image.png',
                application_url: 'https://example.com/apply',
            });

            expect(missingErrors).toEqual(
                expect.arrayContaining([
                    'title',
                    'type',
                    'start_at',
                    'end_at',
                    'is_public',
                ]),
            );
            expect(invalidErrors.map((error) => error.property)).toEqual(
                expect.arrayContaining([
                    'title',
                    'type',
                    'start_at',
                    'end_at',
                    'is_public',
                ]),
            );
        });

        it('allows only location, description, and external_url as optional schedule content fields', async () => {
            await expect(
                transformBody(CreateClubScheduleDto, {
                    title: '정기 모임',
                    type: 'regular_meeting',
                    start_at: '2026-05-20 19:00:00',
                    end_at: '2026-05-20 21:00:00',
                    is_public: true,
                    location: '학생회관',
                    description: '설명',
                    external_url: 'https://forms.example.com/schedule',
                    club_id: 1,
                    image_url: 'https://example.com/image.png',
                }),
            ).rejects.toBeInstanceOf(BadRequestException);

            await expect(
                transformBody(CreateClubScheduleDto, {
                    title: '정기 모임',
                    type: 'regular_meeting',
                    start_at: '2026-05-20 19:00:00',
                    end_at: '2026-05-20 21:00:00',
                    is_public: true,
                    external_url: 'https://forms.example.com/schedule',
                }),
            ).resolves.toMatchObject({
                external_url: 'https://forms.example.com/schedule',
            });
        });

        it('makes update schedule fields optional while preserving their types', () => {
            expect(validateSync(new UpdateClubScheduleDto())).toHaveLength(0);

            const errors = validatePlain(UpdateClubScheduleDto, {
                title: 'a'.repeat(101),
                type: 'notice',
                is_public: 'true',
                location: 'a'.repeat(101),
                external_url: 'a'.repeat(2049),
            });

            expect(errors.map((error) => error.property)).toEqual(
                expect.arrayContaining([
                    'title',
                    'type',
                    'is_public',
                    'location',
                    'external_url',
                ]),
            );
        });

        it('validates admin status and query DTOs', () => {
            expect(
                validationPropertyNames(new UpdateClubScheduleAdminStatusDto()),
            ).toContain('is_public');
            expect(
                validatePlain(ClubSchedulePresidentQueryDto, {
                    status: 'upcoming',
                }),
            ).toHaveLength(0);
            expect(
                validatePlain(ClubScheduleAdminQueryDto, {
                    type: 'event',
                    isPublic: 'true',
                }),
            ).toHaveLength(0);
            expect(
                validatePlain(ClubScheduleAdminQueryDto, {
                    type: 'notice',
                }).map((error) => error.property),
            ).toContain('type');
            expect(
                validationPropertyNames(new ClubScheduleCalendarQueryDto()),
            ).toEqual(expect.arrayContaining(['from', 'to']));
        });
    });
});
