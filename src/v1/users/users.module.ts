import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Club } from '../clubs/entities/club.entity';
import { ClubsModule } from '../clubs/clubs.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Club]),
        forwardRef(() => ClubsModule),
    ],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}
