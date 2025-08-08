import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { ClubsService } from '../clubs/clubs.service';
import * as bcrypt from 'bcrypt';

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

        const club = await this.clubsService.findOne(club_id);
        if (!club) {
            throw new Error('존재하지 않는 club_id입니다.');
        }

        // 2. 비밀번호 해시 처리
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. User 엔티티 생성
        const user = this.userRepository.create({
            name,
            login_id,
            password: hashedPassword,
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

    findOne(id: number): Promise<User | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    async update(id: number, updateUserDto: UpdateUserDto | { refresh_token: string }): Promise<void> {
        await this.userRepository.update(id, updateUserDto);
    }

    remove(id: number) {
        // TODO: remove 구현
        return `This action removes a #${id} user`;
    }

    // 로그인 아이디로 사용자 조회 (JWT 인증용)
    // login_id: 로그인 아이디
    // return: 사용자 또는 null
    async findByLoginId(login_id: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { login_id }
        });
    }

    // 사용자 비밀번호 검증 (JWT 인증용)
    // login_id: 로그인 아이디
    // password: 비밀번호
    // return: 검증된 사용자 또는 null
    async validateUser(login_id: string, password: string): Promise<User | null> {
        const user = await this.findByLoginId(login_id);
        if (user && await bcrypt.compare(password, user.password)) {
            return user;
        }
        return null;
    }

    // 사용자 리프레시 토큰 업데이트 (JWT 인증용)
    // userId: 사용자 ID
    // refreshToken: 리프레시 토큰
    async updateRefreshToken(userId: number, refreshToken: string): Promise<void> {
        await this.update(userId, { refresh_token: refreshToken });
    }

    // 리프레시 토큰으로 사용자 조회 (JWT 인증용)
    // refreshToken: 리프레시 토큰
    // return: 사용자 또는 null
    async findByRefreshToken(refreshToken: string): Promise<User | null> {
        const user = await this.userRepository.findOne({
            where: { refresh_token: refreshToken }
        });
        return user || null;
    }

}
