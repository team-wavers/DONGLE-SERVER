import { Column } from "typeorm";

export class CreateClubReportDto {
    clubId: number;

    @Column({ type: 'jsonb', nullable: true })
    content: any;
}
