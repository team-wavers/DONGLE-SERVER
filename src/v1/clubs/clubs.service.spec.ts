import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { Club } from './entities/club.entity';
import { ClubsService } from './clubs.service';

describe('ClubsService', () => {
    let service: ClubsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ClubsService,
                {
                    provide: getRepositoryToken(Club),
                    useValue: {},
                },
                {
                    provide: ConfigService,
                    useValue: {},
                },
                {
                    provide: AuthService,
                    useValue: {},
                },
                {
                    provide: UsersService,
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<ClubsService>(ClubsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
