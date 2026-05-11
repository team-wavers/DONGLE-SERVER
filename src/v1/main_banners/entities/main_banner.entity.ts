import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('main_banners')
export class MainBanner {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    image_url: string;

    @Column({ type: 'varchar', length: 2048, nullable: true })
    link_url?: string | null;

    @Column({ type: 'timestamp with time zone' })
    publish_start_at: Date;

    @Column({ type: 'timestamp with time zone' })
    publish_end_at: Date;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updated_at: Date;

    @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
    deleted_at?: Date;
}
