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

    @Column({ type: 'array', nullable: true })
    tag: string[];

    @Column({ type: 'date', nullable: true })
    recruit_start: Date;

    @Column({ type: 'date', nullable: true })
    recruit_end: Date;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    main_activities: string;

    @OneToOne(() => User)
    @Column({ name: 'president_id', nullable: true })
    @JoinColumn({ name: 'president_id' })
    president: User;

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
