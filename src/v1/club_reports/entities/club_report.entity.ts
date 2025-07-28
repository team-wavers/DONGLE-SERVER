import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    JoinColumn,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
} from 'typeorm';
import { Club } from '../../clubs/entities/club.entity';

@Entity('club_reports')
export class ClubReport {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'jsonb', nullable: true })
    content: any;

    @ManyToOne(() => Club, (club) => club.reports, { nullable: false, onDelete: 'CASCADE'})
    @JoinColumn({ name: 'club_id' })
    club: Club;

    @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at', nullable: true })
    deletedAt?: Date;
}
