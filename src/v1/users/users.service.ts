import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, FindOptionsWhere } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Club } from '../clubs/entities/club.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Club)
        private readonly clubRepository: Repository<Club>,
    ) {}

    /**
     * 로그인 아이디·전화번호 중복 검증 (create/update 공용)
     * @param excludeUserId 수정 시 현재 사용자 ID — 이 사용자는 중복 대상에서 제외
     */
    private async checkDuplicateLoginIdAndPhone(
        login_id?: string,
        phone?: string,
        excludeUserId?: number,
    ): Promise<void> {
        const baseWhere: FindOptionsWhere<User> = {
            deleted_at: IsNull(),
            ...(excludeUserId != null && { id: Not(excludeUserId) }),
        };

        if (login_id) {
            const existing = await this.userRepository.findOne({
                where: { ...baseWhere, login_id },
            });
            if (existing) {
                throw new ConflictException(
                    '이미 사용 중인 로그인 아이디입니다.',
                );
            }
        }
        if (phone) {
            const existing = await this.userRepository.findOne({
                where: { ...baseWhere, phone },
            });
            if (existing) {
                throw new ConflictException('이미 사용 중인 전화번호입니다.');
            }
        }
    }

    async create(createUserDto: CreateUserDto) {
        const { name, login_id, password, role, phone } = createUserDto;
        if (!name || !login_id || !password || !role || !phone) {
            throw new Error('필수값이 누락되었습니다.');
        }

        await this.checkDuplicateLoginIdAndPhone(login_id, phone);

        // 비밀번호 해시 처리
        const hashedPassword = await bcrypt.hash(password, 10);

        // User 엔티티 생성 (club_id 없이)
        const user = this.userRepository.create({
            name,
            login_id,
            password: hashedPassword,
            role,
            phone,
        });

        // 데이터베이스에 저장
        const savedUser = await this.userRepository.save(user);

        return savedUser;
    }

    findAll() {
        return this.userRepository.find({
            where: { deleted_at: IsNull() },
        });
    }

    findOne(id: number): Promise<User | null> {
        return this.userRepository.findOne({
            where: { id, deleted_at: IsNull() },
        });
    }

    async update(
        id: number,
        updateUserDto: UpdateUserDto | { refresh_token: string },
    ): Promise<void> {
        // 삭제된 사용자는 업데이트 불가
        const user = await this.userRepository.findOne({
            where: { id, deleted_at: IsNull() },
        });
        if (!user) {
            throw new Error('사용자를 찾을 수 없습니다.');
        }

        const updateData = { ...updateUserDto };
        const login_id =
            'login_id' in updateUserDto ? updateUserDto.login_id : undefined;
        const phone =
            'phone' in updateUserDto ? updateUserDto.phone : undefined;

        await this.checkDuplicateLoginIdAndPhone(login_id, phone, id);

        if ('password' in updateData && updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        await this.userRepository.update(id, updateData);
    }

    // 사용자 소프트삭제 (수동)
    // id: 사용자 ID
    // return: 삭제 결과 메시지
    async remove(id: number): Promise<{ message: string }> {
        const user = await this.userRepository.findOne({
            where: { id, deleted_at: IsNull() },
        });
        if (!user) {
            throw new Error('사용자를 찾을 수 없습니다.');
        }

        // 사용자가 동아리 회장인 경우 회장 연결 해제
        await this.clubRepository.update(
            { president_id: id, deleted_at: IsNull() },
            { president_id: null },
        );

        // deleted_at 필드에 현재 시간 설정하여 소프트삭제
        await this.userRepository.update(id, {
            deleted_at: new Date(),
        });

        return { message: '사용자가 삭제되었습니다.' };
    }

    // 로그인 아이디로 사용자 조회 (JWT 인증용)
    // login_id: 로그인 아이디
    // return: 사용자 또는 null
    async findByLoginId(login_id: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { login_id, deleted_at: IsNull() },
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
        if (
            user &&
            !user.deleted_at &&
            (await bcrypt.compare(password, user.password))
        ) {
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
