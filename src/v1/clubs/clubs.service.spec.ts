import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, UpdateResult } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { Club } from './entities/club.entity';
import { ClubsService } from './clubs.service';

const makeUpdateResult = (affected: number): UpdateResult => ({
    affected,
    generatedMaps: [],
    raw: [],
});

describe('ClubsService', () => {
    let service: ClubsService;
    let clubRepository: {
        find: jest.Mock;
        update: jest.Mock;
    };

    beforeEach(async () => {
        clubRepository = {
            find: jest.fn(),
            update: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ClubsService,
                {
                    provide: getRepositoryToken(Club),
                    useValue: clubRepository,
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

    it('findAll은 삭제되지 않은 동아리만 조회한다', async () => {
        const clubs = [{ id: 1, name: '동아리', deleted_at: null }];
        clubRepository.find.mockResolvedValue(clubs);

        await expect(service.findAll()).resolves.toBe(clubs);

        expect(clubRepository.find).toHaveBeenCalledWith({
            where: { deleted_at: IsNull() },
        });
    });

    it('update는 삭제되지 않은 동아리만 수정한다', async () => {
        const updateClubDto = { name: '수정된 동아리' };
        const result = makeUpdateResult(1);
        clubRepository.update.mockResolvedValue(result);

        await expect(service.update(1, updateClubDto)).resolves.toBe(result);

        expect(clubRepository.update).toHaveBeenCalledWith(
            { id: 1, deleted_at: IsNull() },
            updateClubDto,
        );
    });

    it('update는 이미 삭제된 동아리를 거부한다', async () => {
        clubRepository.update.mockResolvedValue(makeUpdateResult(0));

        await expect(service.update(1, { name: '수정된 동아리' })).rejects.toEqual(
            new HttpException(
                '해당 동아리가 존재하지 않습니다.',
                HttpStatus.BAD_REQUEST,
            ),
        );

        expect(clubRepository.update).toHaveBeenCalledWith(
            { id: 1, deleted_at: IsNull() },
            { name: '수정된 동아리' },
        );
    });

    it('delete는 삭제되지 않은 동아리만 삭제 처리한다', async () => {
        const result = makeUpdateResult(1);
        clubRepository.update.mockResolvedValue(result);

        await expect(service.delete(1)).resolves.toBe(result);

        expect(clubRepository.update).toHaveBeenCalledWith(
            { id: 1, deleted_at: IsNull() },
            { deleted_at: expect.any(Date) },
        );
    });

    it('delete는 이미 삭제된 동아리를 거부한다', async () => {
        clubRepository.update.mockResolvedValue(makeUpdateResult(0));

        await expect(service.delete(1)).rejects.toEqual(
            new HttpException(
                '해당 동아리가 존재하지 않습니다.',
                HttpStatus.BAD_REQUEST,
            ),
        );

        expect(clubRepository.update).toHaveBeenCalledWith(
            { id: 1, deleted_at: IsNull() },
            { deleted_at: expect.any(Date) },
        );
    });
});
