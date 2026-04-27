import {
    Controller,
    ForbiddenException,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Request,
    UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES, normalizeRole } from '../auth/constants/roles';
import { BootstrapUserCreateGuard } from './guards/bootstrap-user-create.guard';

@Controller()
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    @UseGuards(BootstrapUserCreateGuard)
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN, ROLES.PRESIDENT)
    findAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN, ROLES.PRESIDENT)
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(+id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN, ROLES.PRESIDENT)
    update(
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto,
        @Request() req: { user: { role: string; userId: number } },
    ) {
        const targetUserId = Number(id);
        const role = normalizeRole(req.user.role);
        const requestUserId = req.user.userId;

        if (role === ROLES.PRESIDENT && requestUserId !== targetUserId) {
            throw new ForbiddenException(
                '회장은 본인 정보만 수정할 수 있습니다.',
            );
        }

        return this.usersService.update(+id, updateUserDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(ROLES.ADMIN)
    remove(@Param('id') id: string) {
        return this.usersService.remove(+id);
    }
}
