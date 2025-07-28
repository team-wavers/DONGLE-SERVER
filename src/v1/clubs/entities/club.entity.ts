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

    @OneToMany(() => ClubReport, (report) => report.club)
    reports: ClubReport[];

    @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at', nullable: true })
    deletedAt?: Date;
}
