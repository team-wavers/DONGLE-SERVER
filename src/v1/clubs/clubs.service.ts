import { Injectable } from '@nestjs/common';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { Club } from './entities/club.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { getRequiredEnv } from '../../common/lib/utils';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class ClubsService {
    constructor(
        @InjectRepository(Club)
        private readonly clubRepository: Repository<Club>,
        private readonly config: ConfigService,
        private readonly authService: AuthService,
    ) {}

    async create(createClubDto: CreateClubDto) {
        return 'This action adds a new club';
    }

    async findAll() {
        return await this.clubRepository.find();
    }

    async findOne(id: number) {
        return await this.clubRepository.findOne({
            where: {
                id: id,
                deleted_at: IsNull(), // deleted_at이 null인 경우만 조회
            },
        });
    }

    async update(id: number, updateClubDto: UpdateClubDto) {
        const result = await this.clubRepository.update(id, updateClubDto);
        if (result.affected === 0) {
            throw new Error('존재하지 않는 club_id입니다.');
        }
        return result;
    }

    async delete(id: number) {
        const result = await this.clubRepository.update(id, {
            deleted_at: new Date(),
        });
        if (result.affected === 0) {
            throw new Error('존재하지 않는 club_id입니다.');
        }
        return result;
    }

    // 고유 키를 DB에 저장 → URL 발급 → 폼 제출 시 키 대조
    async createRegistrationUrl() {
        const key = randomUUID();
        const expirationTime = getRequiredEnv(this.config, 'CLUB_REGISTRATION_EXPIRATION_TIME');

        const oneTimeKey = await this.authService.createOneTimeKey(key, expirationTime);
        const url = `${getRequiredEnv(this.config, 'APP_URL')}/${getRequiredEnv(this.config, 'CLUB_REGISTRATION_PATH')}?key=${oneTimeKey.key}`;
        return url;
    }
}
