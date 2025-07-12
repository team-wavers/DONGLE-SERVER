import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { ClubsService } from '../clubs/clubs.service';
import { Club } from '../clubs/entities/club.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly clubsService: ClubsService,
    ) {}

    async create(createUserDto: CreateUserDto) {
        // 1. 필수값 검증
        const { name, login_id, password, role, club_id, phone } = createUserDto;
        if (!name || !login_id || !password || !role || !club_id || !phone) {
            throw new Error('필수값이 누락되었습니다.');
        }

        const club = await this.clubsService.findOne(club_id);
        if (!club) {
            throw new Error('존재하지 않는 club_id입니다.');
        }

        // 3. User 엔티티 생성
        const user = this.userRepository.create({
            name,
            login_id,
            password,
            role,
            phone,
            club,
        });

        // 4. DB에 저장
        return await this.userRepository.save(user);
    }

    findAll() {
        return this.userRepository.find({ relations: ['club'] });
    }

    findOne(id: number) {
        return this.userRepository.findOne({ where: { id }, relations: ['club'] });
    }

    update(id: number, updateUserDto: UpdateUserDto) {
        // TODO: update 구현
        return `This action updates a #${id} user`;
    }

    remove(id: number) {
        // TODO: remove 구현
        return `This action removes a #${id} user`;
    }
}
