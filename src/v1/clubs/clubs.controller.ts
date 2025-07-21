import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Put,
} from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';

@Controller('clubs')
export class ClubsController {
    constructor(private readonly clubsService: ClubsService) {}

    @Post()
    async create(@Body() createClubDto: CreateClubDto) {
        return await this.clubsService.create(createClubDto);
    }

    @Get()
    async findAll() {
        return await this.clubsService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: number) {
        return await this.clubsService.findOne(id);
    }

    @Put(':id')
    async update(@Param('id') id: number, @Body() updateClubDto: UpdateClubDto) {
        return await this.clubsService.update(id, updateClubDto);
    }

    @Delete(':id')
    async delete(@Param('id') id: number) {
        return await this.clubsService.delete(id);
    }
}
