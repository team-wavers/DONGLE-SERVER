import { ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { IsString } from 'class-validator';
import { formatValidationErrors } from './format-validation-errors';
import { CreateClubScheduleDto } from '../v1/club_schedules/dto/create-club-schedule.dto';
import { CreateUserDto } from '../v1/users/dto/create-user.dto';

describe('formatValidationErrors', () => {
    it('미선언 필드를 허용되지 않은 필드 한글 메시지로 변환한다', () => {
        const errors = validateSync(
            plainToInstance(CreateUserDto, {
                name: '관리자',
                login_id: 'admin',
                password: 'password',
                role: 'admin',
                phone: '010-0000-0000',
                unknown: 'field',
            }),
            {
                whitelist: true,
                forbidNonWhitelisted: true,
            },
        );

        expect(formatValidationErrors(errors)).toEqual([
            'unknown은(는) 허용되지 않은 필드입니다.',
        ]);
    });

    it('필수 문자열 누락을 한글 메시지로 변환한다', () => {
        const errors = validateSync(plainToInstance(CreateUserDto, {}));

        expect(formatValidationErrors(errors)).toEqual(
            expect.arrayContaining([
                'name은(는) 문자열이어야 합니다.',
                'login_id은(는) 문자열이어야 합니다.',
                'password은(는) 문자열이어야 합니다.',
                'role은(는) 문자열이어야 합니다.',
                'phone은(는) 문자열이어야 합니다.',
            ]),
        );
    });

    it('boolean/type 불일치를 한글 메시지로 변환한다', () => {
        const errors = validateSync(
            plainToInstance(CreateClubScheduleDto, {
                title: '정기 모임',
                type: 'regular_meeting',
                start_at: '2026-05-01T09:00:00+09:00',
                end_at: '2026-05-01T10:00:00+09:00',
                is_public: 'yes',
            }),
        );

        expect(formatValidationErrors(errors)).toEqual(
            expect.arrayContaining([
                'is_public은(는) true 또는 false여야 합니다.',
            ]),
        );
    });

    it('@IsIn 실패를 한글 메시지로 변환한다', () => {
        const errors = validateSync(
            plainToInstance(CreateClubScheduleDto, {
                title: '정기 모임',
                type: 'invalid-type',
                start_at: '2026-05-01T09:00:00+09:00',
                end_at: '2026-05-01T10:00:00+09:00',
                is_public: true,
            }),
        );

        expect(formatValidationErrors(errors)).toEqual(
            expect.arrayContaining(['type 값이 올바르지 않습니다.']),
        );
    });

    it('MaxLength 초과를 한글 메시지로 변환한다', () => {
        const errors = validateSync(
            plainToInstance(CreateClubScheduleDto, {
                title: 'a'.repeat(101),
                type: 'regular_meeting',
                start_at: '2026-05-01T09:00:00+09:00',
                end_at: '2026-05-01T10:00:00+09:00',
                is_public: true,
            }),
        );

        expect(formatValidationErrors(errors)).toEqual(
            expect.arrayContaining(['title은(는) 100자 이하여야 합니다.']),
        );
    });

    it('데코레이터 커스텀 message를 우선한다', () => {
        class CustomDto {
            @IsString({ message: '제목을 입력해 주세요.' })
            title: string;
        }

        const errors = validateSync(plainToInstance(CustomDto, {}));

        expect(formatValidationErrors(errors)).toEqual(['제목을 입력해 주세요.']);
    });

    it('중첩 필드 오류를 dot path로 변환한다', () => {
        const nestedError: ValidationError = {
            property: 'sns',
            children: [
                {
                    property: 'instagram',
                    constraints: {
                        isString: 'instagram must be a string',
                    },
                },
            ],
        };

        expect(formatValidationErrors([nestedError])).toEqual([
            'sns.instagram은(는) 문자열이어야 합니다.',
        ]);
    });
});
