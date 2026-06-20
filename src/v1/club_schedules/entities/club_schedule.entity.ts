import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Club } from '../../clubs/entities/club.entity';

export const CLUB_SCHEDULE_TYPES = [
    'recruitment',
    'event',
    'regular_meeting',
] as const;

export type ClubScheduleType = (typeof CLUB_SCHEDULE_TYPES)[number];

@Entity('club_schedules')
export class ClubSchedule {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 100 })
    title: string;

    @Column({ type: 'varchar', length: 30 })
    type: ClubScheduleType;

    @Column({ type: 'timestamp with time zone' })
    start_at: Date;

    @Column({ type: 'timestamp with time zone' })
    end_at: Date;

    @Column({ type: 'boolean' })
    is_public: boolean;

    @Column({ type: 'varchar', length: 100, nullable: true })
    location?: string | null;

    @Column({ type: 'text', nullable: true })
    description?: string | null;

    @Column({ type: 'varchar', length: 2048, nullable: true })
    external_url?: string | null;

    @Column({ type: 'integer', nullable: true })
    club_id: number | null;

    @ManyToOne(() => Club, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'club_id' })
    club: Club | null;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updated_at: Date;

    @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
    deleted_at?: Date;
}
