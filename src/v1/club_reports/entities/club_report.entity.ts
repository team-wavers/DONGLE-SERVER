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

    @Column({ type: 'text', nullable: true })
    content: string;

    @Column({ type: 'text', array: true })
    image_urls: string[];

    @Column({ type: 'text', nullable: true })
    title: string;

    @ManyToOne(() => Club, (club) => club.reports, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'club_id' })
    club: Club;

    @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({
        type: 'timestamp with time zone',
        name: 'deleted_at',
        nullable: true,
    })
    deletedAt?: Date;
}
