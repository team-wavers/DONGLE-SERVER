import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { ClubsModule } from '../clubs/clubs.module';

@Module({
    imports: [TypeOrmModule.forFeature([User]), ClubsModule],
    controllers: [UsersController],
    providers: [UsersService],
})
export class UsersModule {}
