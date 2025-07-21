import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { ClubsService } from '../clubs/clubs.service';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly clubsService: ClubsService,
    ) {}

    async create(createUserDto: CreateUserDto) {
        const { name, login_id, password, role, club_id, phone } =
            createUserDto;
        if (!name || !login_id || !password || !role || !phone) {
            throw new Error('필수값이 누락되었습니다.');
        }

        const user = this.userRepository.create({
            name,
            login_id,
            password,
            role,
            phone,
        });

        if (club_id) {
            this.clubsService.update(club_id, { president: user });
        }

        return user;
    }

    findAll() {
        return this.userRepository.find({ relations: ['club'] });
    }

    findOne(id: number) {
        return this.userRepository.findOne({
            where: { id },
            relations: ['club'],
        });
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
