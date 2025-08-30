import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
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
        @Inject(forwardRef(() => ClubsService))
        private readonly clubsService: ClubsService,
    ) {}

    async create(createUserDto: CreateUserDto) {
        const { name, login_id, password, role, club_id, phone } =
            createUserDto;
        if (!name || !login_id || !password || !role || !phone) {
            throw new Error('필수값이 누락되었습니다.');
        }

        // club_id가 제공된 경우에만 클럽 존재 여부 확인 (관리자는 club_id가 없을 수 있음)
        if (club_id) {
            const club = await this.clubsService.findOne(club_id);
            if (!club) {
                throw new Error('존재하지 않는 club_id입니다.');
            }
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
            club_id: club_id || undefined,
        });

        if (club_id) {
            this.clubsService.update(club_id, { president_id: user.id });
        }

        return user;
    }

    findAll() {
        return this.userRepository.find({ 
            relations: ['club'],
            where: { deleted_at: IsNull() }
        });
    }

    findOne(id: number): Promise<User | null> {
        return this.userRepository.findOne({ 
            where: { id, deleted_at: IsNull() },
            relations: ['club']
        });
    }

    async update(
        id: number,
        updateUserDto: UpdateUserDto | { refresh_token: string },
    ): Promise<void> {
        await this.userRepository.update(id, updateUserDto);
    }

    // 사용자 소프트삭제 (수동)
    // id: 사용자 ID
    // return: 삭제 결과 메시지
    async remove(id: number): Promise<{ message: string }> {
        const user = await this.userRepository.findOne({ 
            where: { id, deleted_at: IsNull() } 
        });
        if (!user) {
            throw new Error('사용자를 찾을 수 없습니다.');
        }

        // deleted_at 필드에 현재 시간 설정하여 소프트삭제
        await this.userRepository.update(id, { 
            deleted_at: new Date()
        });
        
        return { message: `사용자 ID ${id}가 삭제되었습니다.` };
    }

    // 로그인 아이디로 사용자 조회 (JWT 인증용)
    // login_id: 로그인 아이디
    // return: 사용자 또는 null
    async findByLoginId(login_id: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { login_id, deleted_at: IsNull() },
            relations: ['club']
        });
    }

    // 사용자 비밀번호 검증 (JWT 인증용)
    // login_id: 로그인 아이디
    // password: 비밀번호
    // return: 검증된 사용자 또는 null
    async validateUser(
        login_id: string,
        password: string,
    ): Promise<User | null> {
        const user = await this.findByLoginId(login_id);
        if (user && !user.deleted_at && (await bcrypt.compare(password, user.password))) {
            return user;
        }
        return null;
    }

    // 사용자 리프레시 토큰 업데이트 (JWT 인증용)
    // userId: 사용자 ID
    // refreshToken: 리프레시 토큰
    async updateRefreshToken(
        userId: number,
        refreshToken: string,
    ): Promise<void> {
        await this.update(userId, { refresh_token: refreshToken });
    }

    // 리프레시 토큰으로 사용자 조회 (JWT 인증용)
    // refreshToken: 리프레시 토큰
    // return: 사용자 또는 null
    async findByRefreshToken(refreshToken: string): Promise<User | null> {
        const user = await this.userRepository.findOne({
            where: { refresh_token: refreshToken, deleted_at: IsNull() },
        });
        return user || null;
    }
}
