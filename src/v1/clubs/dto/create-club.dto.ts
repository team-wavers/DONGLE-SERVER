import {
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
    Validate,
    ValidateIf,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

@ValidatorConstraint({ name: 'exactlyOnePresidentSource', async: false })
class ExactlyOnePresidentSourceConstraint
    implements ValidatorConstraintInterface
{
    validate(_: unknown, args: ValidationArguments): boolean {
        const { president_id, newPresident } = args.object as CreateClubDto;
        return Boolean((president_id != null) !== (newPresident != null));
    }

    defaultMessage() {
        return 'president_id 또는 newPresident 중 하나만 입력해야 합니다.';
    }
}

const trimStringInput = (value: unknown) =>
    typeof value === 'string' ? value.trim() : value;

const removeWhitespace = (value: unknown) =>
    typeof value === 'string' ? value.replace(/\s/g, '') : value;

// 공개 등록 플로우에서 회장 계정을 함께 생성할 때 쓰는 페이로드.
// 이 값이 있으면 User+Club 생성이 하나의 트랜잭션으로 묶인다.
export class NewClubPresidentDto {
    @Transform(({ value }) => trimStringInput(value))
    @IsString()
    @IsNotEmpty({ message: 'name은(는) 필수입니다.' })
    name: string;

    @IsString()
    @Matches(/^[a-z0-9]{4,20}$/, {
        message: 'login_id는 영문 소문자와 숫자 4~20자여야 합니다.',
    })
    login_id: string;

    @IsString()
    @MinLength(8, { message: 'password는 8자 이상이어야 합니다.' })
    @MaxLength(72, { message: 'password는 72자 이하여야 합니다.' })
    @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
        message: 'password는 영문과 숫자를 각각 1자 이상 포함해야 합니다.',
    })
    password: string;

    @Transform(({ value }) => removeWhitespace(value))
    @IsString()
    @Matches(/^01[0-9]-?\d{3,4}-?\d{4}$/, {
        message: 'phone은(는) 올바른 한국 휴대폰 번호여야 합니다.',
    })
    phone: string;
}

export class CreateClubDto {
    @IsString()
    key: string; // 일회용 키

    @IsString()
    name: string;

    @IsString()
    category: string;

    @IsOptional()
    @IsObject()
    sns?: Record<string, string>;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsBoolean()
    is_recruiting?: boolean;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsString()
    recruit_start?: string | null;

    @IsOptional()
    @IsString()
    recruit_end?: string | null;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    main_activities?: string;

    @IsOptional()
    @IsString()
    icon_url?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(2048)
    apply_url?: string | null;

    @IsOptional()
    @IsNumber()
    president_id?: number;

    @ValidateIf((dto: CreateClubDto) => dto.constructor === CreateClubDto)
    @Validate(ExactlyOnePresidentSourceConstraint)
    @ValidateNested()
    @Type(() => NewClubPresidentDto)
    newPresident?: NewClubPresidentDto;
}
