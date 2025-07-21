import { Injectable } from '@nestjs/common';
import { CreateClubReportDto } from './dto/create-club_report.dto';
import { UpdateClubReportDto } from './dto/update-club_report.dto';

@Injectable()
export class ClubReportsService {
    create(createClubReportDto: CreateClubReportDto) {
        return 'This action adds a new clubReport';
    }

    findAll() {
        return `This action returns all clubReports`;
    }

    findOne(id: number) {
        return `This action returns a #${id} clubReport`;
    }

    update(id: number, updateClubReportDto: UpdateClubReportDto) {
        return `This action updates a #${id} clubReport`;
    }

    remove(id: number) {
        return `This action removes a #${id} clubReport`;
    }
}
