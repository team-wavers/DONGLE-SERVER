import { HttpException, HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { Club } from './entities/club.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { getRequiredEnv } from '../../common/lib/utils';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
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
    ) {}

    // 저장된 키 대조 후 동아리 생성
    async create(createClubDto: CreateClubDto) {
        const { key } = createClubDto;
        const isValid = await this.authService.validateOneTimeKey(key);
        if (!isValid) {
            throw new HttpException(
                '유효하지 않은 키입니다.',
                HttpStatus.BAD_REQUEST,
            );
        }
        const newClub = this.clubRepository.create(createClubDto);
        return await this.clubRepository.save(newClub);
    }

    async findAll() {
        return await this.clubRepository.find({
            where: { deleted_at: IsNull() },
        });
    }

    async findOne(id: number) {
        return await this.clubRepository.findOne({
            where: {
                id: id,
                deleted_at: IsNull(), // deleted_at이 null인 경우만 조회
            },
            relations: ['president', 'reports'],
        });
    }

    async update(id: number, updateClubDto: UpdateClubDto) {
        if (updateClubDto.president_id) { // 동아리 회장 변경 시
            const president = await this.usersService.findOne(updateClubDto.president_id);
            if (!president) {
                throw new HttpException('존재하지 않는 사용자입니다.', HttpStatus.BAD_REQUEST);
            }
        }

        const result = await this.clubRepository.update(
            { id, deleted_at: IsNull() },
            updateClubDto,
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
}
