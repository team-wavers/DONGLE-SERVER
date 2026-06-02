import {
    ClubSchedulesController,
    PublicClubSchedulesController,
} from './club_schedules.controller';
import { ClubSchedulesService } from './club_schedules.service';

describe('ClubSchedulesController', () => {
    let controller: ClubSchedulesController;
    let service: jest.Mocked<
        Pick<
            ClubSchedulesService,
            | 'findAllForAdmin'
            | 'findCalendarForAdmin'
            | 'findOneForAdmin'
            | 'updateAdminStatus'
            | 'removeForAdmin'
        >
    >;

    beforeEach(() => {
        service = {
            findAllForAdmin: jest.fn(),
            findCalendarForAdmin: jest.fn(),
            findOneForAdmin: jest.fn(),
            updateAdminStatus: jest.fn(),
            removeForAdmin: jest.fn(),
        };

        controller = new ClubSchedulesController(
            service as unknown as ClubSchedulesService,
        );
    });

    it('관리자 전체 일정 목록 조회를 service에 위임한다', async () => {
        service.findAllForAdmin.mockResolvedValue([{ id: 1 }] as never);

        const result = await controller.findAllForAdmin({ type: 'event' });

        expect(service.findAllForAdmin).toHaveBeenCalledWith({
            type: 'event',
        });
        expect(result).toEqual([{ id: 1 }]);
    });

    it('관리자 캘린더 조회를 service에 위임한다', async () => {
        const query = { from: '2026-05-01', to: '2026-06-01' };
        service.findCalendarForAdmin.mockResolvedValue([{ id: 1 }] as never);

        const result = await controller.findCalendarForAdmin(query);

        expect(service.findCalendarForAdmin).toHaveBeenCalledWith(query);
        expect(result).toEqual([{ id: 1 }]);
    });

    it('관리자 단건 조회를 service에 위임한다', async () => {
        service.findOneForAdmin.mockResolvedValue({ id: 7 } as never);

        const result = await controller.findOneForAdmin(7);

        expect(service.findOneForAdmin).toHaveBeenCalledWith(7);
        expect(result).toEqual({ id: 7 });
    });

    it('관리자 공개 상태 수정을 service에 위임한다', async () => {
        const dto = { is_public: false };
        service.updateAdminStatus.mockResolvedValue({ id: 7 } as never);

        const result = await controller.updateAdminStatus(7, dto);

        expect(service.updateAdminStatus).toHaveBeenCalledWith(7, dto);
        expect(result).toEqual({ id: 7 });
    });

    it('관리자 삭제를 service에 위임한다', async () => {
        service.removeForAdmin.mockResolvedValue({ affected: 1 } as never);

        const result = await controller.removeForAdmin(7);

        expect(service.removeForAdmin).toHaveBeenCalledWith(7);
        expect(result).toEqual({ affected: 1 });
    });
});

describe('PublicClubSchedulesController', () => {
    let controller: PublicClubSchedulesController;
    let service: jest.Mocked<Pick<ClubSchedulesService, 'findPublicCalendar'>>;

    beforeEach(() => {
        service = {
            findPublicCalendar: jest.fn(),
        };

        controller = new PublicClubSchedulesController(
            service as unknown as ClubSchedulesService,
        );
    });

    it('전체 공개 일정 기간 조회를 service에 위임한다', async () => {
        const query = { from: '2026-05-01', to: '2026-06-01' };
        service.findPublicCalendar.mockResolvedValue([{ id: 1 }] as never);

        const result = await controller.findPublicCalendar(query);

        expect(service.findPublicCalendar).toHaveBeenCalledWith(query);
        expect(result).toEqual([{ id: 1 }]);
    });
});
