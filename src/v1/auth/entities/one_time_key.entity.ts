import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('one_time_keys')
export class OneTimeKey {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    key: string;

	@Column({ type: 'timestamp with time zone', name: 'created_at' })
	createdAt: Date;

	@Column({ type: 'timestamp with time zone', name: 'expired_at' })
	expiredAt: Date;

	@Column({ type: 'timestamp with time zone', name: 'used_at' })
	usedAt: Date;

	@Column({ type: 'timestamp with time zone', name: 'updated_at' })
	updatedAt: Date;

	@Column({ type: 'timestamp with time zone', name: 'deleted_at' })
	deletedAt: Date;
}
