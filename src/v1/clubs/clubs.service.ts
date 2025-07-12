import { Injectable } from '@nestjs/common';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { Club } from './entities/club.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ClubsService {
  constructor(
    @InjectRepository(Club)
    private readonly clubRepository: Repository<Club>,
  ) {}

  create(createClubDto: CreateClubDto) {
    return 'This action adds a new club';
  }

  findAll() {
    return `This action returns all clubs`;
  }

  findOne(id: number) {
    return this.clubRepository.findOne({ where: { id } });
  }

  update(id: number, updateClubDto: UpdateClubDto) {
    return `This action updates a #${id} club`;
  }

  remove(id: number) {
    return `This action removes a #${id} club`;
  }
}
