import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('clubs')
export class Club {
    @PrimaryGeneratedColumn()
    id: number;

    // (추가 필드는 필요시 확장)

    // 한 클럽에 여러 유저가 소속될 수 있음
    @OneToMany(() => User, user => user.club)
    users: User[];
}
