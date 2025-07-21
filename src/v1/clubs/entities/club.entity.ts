import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('clubs')
export class Club {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    name: string;

    @Column({ type: 'boolean', default: false })
    is_recruiting: boolean;

    @Column({ length: 50 })
    category: string;

    @Column({ type: 'json', nullable: true })
    sns: Record<string, string>;

    @Column({ length: 255, nullable: true })
    tags: string;

    @Column({ type: 'date', nullable: true })
    recruit_start: Date;

    @Column({ type: 'date', nullable: true })
    recruit_end: Date;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    main_activities: string;

    // users 테이블의 id와 연결되는 외래키, 1:1 관계로 처리
    @OneToOne(() => User)
    @Column({ name: 'president_id', nullable: true })
    @JoinColumn({ name: 'president_id' })
    president: User;
}

/**
 * CREATE TABLE clubs (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    is_recruiting BOOLEAN NOT NULL DEFAULT FALSE,
    category     VARCHAR(50) NOT NULL ,
    sns         JSON,
    tags         VARCHAR(255) ,
    recruit_start DATE ,
    recruit_end   DATE ,
    description  TEXT ,
    main_activities TEXT ,
    president_id INT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP '
    deleted_at   TIMESTAMP NULL
);
 */
