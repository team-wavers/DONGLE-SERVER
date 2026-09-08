import {
    HttpException,
    HttpStatus,
    Inject,
    Injectable,
    NotFoundException,
    forwardRef,
} from '@nestjs/common';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { Club } from './entities/club.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { getRequiredEnv } from '../../common/lib/utils';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { parseSeoulDateTime } from '../../common/lib/date-time';
@Injectable()
export class ClubsService {
    constructor(
        @InjectRepository(Club)
        private readonly clubRepository: Repository<Club>,
        private readonly config: ConfigService,
        @Inject(forwardRef(() => AuthService))
        private readonly authService: AuthService,
        @Inject(forwardRef(() => UsersService))
        private readonly usersService: UsersService,
        private readonly dataSource: DataSource,
    ) {}

    // 저장된 키 대조 후 동아리 생성
    async create(createClubDto: CreateClubDto) {
        const { key, newPresident, ...clubFields } = createClubDto;

        // newPresident가 없는 기존 흐름(관리자가 기존 유저를 회장으로 지정)은
        // 그대로 둔다 — 키는 여기서 바로 소모된다.
        if (!newPresident) {
            const isValid = await this.authService.validateOneTimeKey(key);
            if (!isValid) {
                throw new HttpException(
                    '유효하지 않은 키입니다.',
                    HttpStatus.BAD_REQUEST,
                );
            }
            const newClub = this.clubRepository.create(
                this.toPersistencePayload(createClubDto),
            );
            return await this.clubRepository.save(newClub);
        }

        // 공개 등록(회장 계정을 함께 생성)은 User 생성 + 키 소모 + Club 생성을
        // 하나의 트랜잭션으로 묶는다 — 동아리 생성이 실패하면 계정도, 키 소모도
        // 전부 롤백돼서 고아 계정이 남지 않는다.
        const isValid = await this.authService.isOneTimeKeyValid(key);
        if (!isValid) {
            throw new HttpException(
                '유효하지 않은 키입니다.',
                HttpStatus.BAD_REQUEST,
            );
        }

        return await this.dataSource.transaction(async (manager) => {
            const consumed = await this.authService.consumeOneTimeKey(
                key,
                manager,
            );
            if (!consumed) {
                throw new HttpException(
                    '유효하지 않은 키입니다.',
                    HttpStatus.BAD_REQUEST,
                );
            }

            const president = await this.usersService.create(
                { ...newPresident, role: 'president' },
                manager,
            );

            const clubRepo = manager.getRepository(Club);
            const newClub = clubRepo.create(
                this.toPersistencePayload({
                    ...clubFields,
                    key,
                    president_id: president.id,
                } as CreateClubDto),
            );
            return await clubRepo.save(newClub);
        });
    }

    async findAll() {
        return await this.clubRepository.find({
            where: { deleted_at: IsNull() },
        });
    }

    async findOne(id: number) {
        const club = await this.clubRepository.findOne({
            where: {
                id: id,
                deleted_at: IsNull(), // deleted_at이 null인 경우만 조회
            },
            relations: ['president', 'reports'],
        });

        if (!club) {
            throw new NotFoundException('해당 동아리가 존재하지 않습니다.');
        }

        return club;
    }

    async update(id: number, updateClubDto: UpdateClubDto) {
        if (updateClubDto.president_id !== undefined) {
            // 동아리 회장 변경 시
            try {
                await this.usersService.findOne(updateClubDto.president_id);
            } catch (error) {
                if (error instanceof NotFoundException) {
                    throw new HttpException(
                        '존재하지 않는 사용자입니다.',
                        HttpStatus.BAD_REQUEST,
                    );
                }
                throw error;
            }
        }

        const updateData = this.toPersistencePayload(updateClubDto);
        const result = await this.clubRepository.update(
            { id, deleted_at: IsNull() },
            updateData,
        );
        if (result.affected === 0) {
            throw new HttpException(
                '해당 동아리가 존재하지 않습니다.',
                HttpStatus.BAD_REQUEST,
            );
        }
        return result;
    }

    async delete(id: number) {
        const result = await this.clubRepository.update(
            { id, deleted_at: IsNull() },
            {
                deleted_at: new Date(),
            },
        );
        if (result.affected === 0) {
            throw new HttpException(
                '해당 동아리가 존재하지 않습니다.',
                HttpStatus.BAD_REQUEST,
            );
        }
        return result;
    }

    // 동아리 아이콘 URL 저장
    async updateIconUrl(
        clubId: number,
        iconUrl: string,
    ): Promise<{ icon_url: string }> {
        const result = await this.clubRepository.update(
            { id: clubId, deleted_at: IsNull() },
            { icon_url: iconUrl },
        );
        if (result.affected === 0) {
            throw new HttpException(
                '해당 동아리가 존재하지 않습니다.',
                HttpStatus.BAD_REQUEST,
            );
        }
        return { icon_url: iconUrl };
    }

    // 고유 키를 DB에 저장 → URL 발급 → 폼 제출 시 키 대조
    async createRegistrationUrl() {
        const key = randomUUID();
        const expirationTime = getRequiredEnv(
            this.config,
            'CLUB_REGISTRATION_EXPIRATION_TIME',
        );

        const oneTimeKey = await this.authService.createOneTimeKey(
            key,
            expirationTime,
        );
        const url = `${getRequiredEnv(this.config, 'APP_URL')}/${getRequiredEnv(this.config, 'CLUB_REGISTRATION_PATH')}?key=${oneTimeKey.key}`;
        return url;
    }

    private toPersistencePayload(
        dto: CreateClubDto | UpdateClubDto,
    ): DeepPartial<Club> {
        const payload = { ...dto } as DeepPartial<Club>;

        if (dto.recruit_start !== undefined) {
            payload.recruit_start =
                dto.recruit_start === null
                    ? null
                    : parseSeoulDateTime(dto.recruit_start);
        }

        if (dto.recruit_end !== undefined) {
            payload.recruit_end =
                dto.recruit_end === null
                    ? null
                    : parseSeoulDateTime(dto.recruit_end);
        }

        return payload;
    }
}
