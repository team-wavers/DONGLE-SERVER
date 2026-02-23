import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Club } from '../clubs/entities/club.entity';
import { ClubsModule } from '../clubs/clubs.module';
import { AuthModule } from '../auth/auth.module';
import { BootstrapUserCreateGuard } from './guards/bootstrap-user-create.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Club]),
        forwardRef(() => ClubsModule),
        forwardRef(() => AuthModule),
    ],
    controllers: [UsersController],
    providers: [UsersService, BootstrapUserCreateGuard],
    exports: [UsersService],
})
export class UsersModule {}
