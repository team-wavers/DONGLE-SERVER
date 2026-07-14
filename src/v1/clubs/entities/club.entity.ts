import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ClubReport } from '../../club_reports/entities/club_report.entity';
import { ClubSchedule } from '../../club_schedules/entities/club_schedule.entity';

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

    @Column({ type: 'text', nullable: true, array: true }) // TypeORM에서 array 타입 사용시 text, array: true로 설정하기
    tags: string[];

    @Column({ type: 'timestamp with time zone', nullable: true })
    recruit_start: Date | null;

    @Column({ type: 'timestamp with time zone', nullable: true })
    recruit_end: Date | null;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    icon_url: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    location: string;

    @Column({ type: 'text', nullable: true })
    main_activities: string;

    @Column({ type: 'varchar', length: 2048, nullable: true })
    apply_url: string | null;

    @Column({ nullable: true })
    president_id: number | null;

    @OneToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'president_id' })
    president: User;

    @OneToMany(() => ClubReport, (report) => report.club)
    reports: ClubReport[];

    @OneToMany(() => ClubSchedule, (schedule) => schedule.club)
    schedules: ClubSchedule[];

    @CreateDateColumn({ type: 'timestamp with time zone' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updated_at: Date;

    @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
    deleted_at?: Date;
}
