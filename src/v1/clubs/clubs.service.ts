import { Injectable } from '@nestjs/common';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { Club } from './entities/club.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

@Injectable()
export class ClubsService {
    constructor(
        @InjectRepository(Club)
        private readonly clubRepository: Repository<Club>,
    ) {}

    async create(createClubDto: CreateClubDto) {
        return 'This action adds a new club';
    }

    async findAll() {
        return await this.clubRepository.find();
    }

    async findOne(id: number) {
        return await this.clubRepository.findOne({ where: {
            id: id,
            deleted_at: IsNull() // deleted_at이 null인 경우만 조회
        } });
    }

    async update(id: number, updateClubDto: UpdateClubDto) {
        const result = await this.clubRepository.update(id, updateClubDto);
        if (result.affected === 0) {
            throw new Error('존재하지 않는 club_id입니다.');
        }
        return result;
    }

    async delete(id: number) {
        const result = await this.clubRepository.update(id, { deleted_at: new Date() });
        if (result.affected === 0) {
            throw new Error('존재하지 않는 club_id입니다.');
        }
        return result;
    }

    createRegistrationUrl() {
        // jwt 관련 모듈 추가되면 구현 예정
    }

}
