import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Club } from '../../clubs/entities/club.entity';

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

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at: Date;

    @Column({ type: 'datetime', nullable: true })
    deleted_at: Date;
}


/**
 * CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    login_id VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    club_id INT,
    role VARCHAR(10) NOT NULL,
    phone VARCHAR(100),
    refresh_token VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (club_id) REFERENCES clubs(id)
);
 */
