import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
} from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    name: string;

    @Column({ length: 100 })
    login_id: string;

    @Column({ length: 255 })
    password: string;

    @Column({ length: 10 })
    role: string;

    @Column({ length: 100, nullable: true })
    phone: string;

    @Column({ length: 255, nullable: true })
    refresh_token: string;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @Column({
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
    updated_at: Date;

    @Column({ type: 'datetime', nullable: true })
    deleted_at: Date;
}
