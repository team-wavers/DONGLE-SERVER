import { Column } from 'typeorm';

export class CreateClubReportDto {
    club_id: number;

    @Column({ length: 255 })
    title: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'text', array: true })
    image_urls: string[];
}
