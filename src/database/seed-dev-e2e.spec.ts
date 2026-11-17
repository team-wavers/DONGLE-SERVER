import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Club } from '../v1/clubs/entities/club.entity';
import { User } from '../v1/users/entities/user.entity';
import { seedDevE2e } from './seed-dev-e2e';

const environment = {
    NODE_ENV: 'development',
    E2E_ADMIN_PASSWORD: 'dev-admin-test-credential',
    E2E_CLUB_PASSWORD: 'dev-president-test-credential',
};

function createStore() {
    const users: Array<Omit<User, 'deleted_at'> & { deleted_at: Date | null }> =
        [];
    const clubs: Array<Omit<Club, 'deleted_at'> & { deleted_at: Date | null }> =
        [];
    const userRepo = {
        find: jest.fn(({ where }: { where: { login_id: string } }) =>
            users.filter((user) => user.login_id === where.login_id),
        ),
        existsBy: jest.fn(({ phone }: { phone: string }) =>
            users.some((user) => user.phone === phone && !user.deleted_at),
        ),
        insert: jest.fn((user: User) => {
            const id = users.length + 1;
            users.push({ ...user, id, deleted_at: null });
            return { identifiers: [{ id }] };
        }),
        update: jest.fn<
            void,
            [number, { password: string; refresh_token: () => string }]
        >(),
    };
    const clubRepo = {
        find: jest.fn(({ where }: { where: { name: string } }) =>
            clubs.filter((club) => club.name === where.name),
        ),
        insert: jest.fn((club: Club) => {
            const id = clubs.length + 1;
            clubs.push({ ...club, id, deleted_at: null });
            return { identifiers: [{ id }] };
        }),
    };
    const manager = {
        query: jest.fn(),
        getRepository: jest.fn((entity) =>
            entity === User ? userRepo : clubRepo,
        ),
    };
    const source = {
        options: { database: 'dongle_dev' },
        initialize: jest.fn(),
        transaction: jest.fn(
            (work: (store: typeof manager) => Promise<unknown>) =>
                work(manager),
        ),
        destroy: jest.fn(),
    };
    return {
        source,
        dataSource: source as unknown as DataSource,
        users,
        clubs,
        userRepo,
        manager,
    };
}

describe('seedDevE2e', () => {
    it.each([
        ['production environment', 'production', 'dongle_dev'],
        ['production database', 'development', 'dongle_prod'],
    ])(
        'rejects a %s before opening a connection',
        async (_label, nodeEnv, database) => {
            const { source, dataSource } = createStore();
            source.options.database = database;

            await expect(
                seedDevE2e(dataSource, { ...environment, NODE_ENV: nodeEnv }),
            ).rejects.toThrow();
            expect(source.initialize).not.toHaveBeenCalled();
        },
    );

    it('requires both credentials before opening a connection', async () => {
        const { source, dataSource } = createStore();

        await expect(
            seedDevE2e(dataSource, { ...environment, E2E_CLUB_PASSWORD: '' }),
        ).rejects.toThrow('E2E_CLUB_PASSWORD');
        expect(source.initialize).not.toHaveBeenCalled();
    });

    it('creates two accounts and two clubs and preserves their identity on rerun', async () => {
        const { source, dataSource, users, clubs, userRepo, manager } =
            createStore();
        const first = await seedDevE2e(dataSource, environment);

        expect(await seedDevE2e(dataSource, environment)).toEqual(first);
        expect(users).toHaveLength(2);
        expect(clubs).toHaveLength(2);
        expect(users.map(({ role }) => role)).toEqual(['admin', 'president']);
        expect(users.map(({ phone }) => phone)).toEqual([
            '01000000001',
            '01000000002',
        ]);
        expect(users.every(({ is_system }) => !is_system)).toBe(true);
        expect(
            await bcrypt.compare(
                environment.E2E_ADMIN_PASSWORD,
                users[0].password,
            ),
        ).toBe(true);
        expect(
            await bcrypt.compare(
                environment.E2E_CLUB_PASSWORD,
                users[1].password,
            ),
        ).toBe(true);
        expect(clubs.map(({ president_id }) => president_id)).toEqual([
            users[1].id,
            null,
        ]);
        expect(userRepo.update).not.toHaveBeenCalled();
        expect(manager.query).toHaveBeenCalledTimes(2);
        expect(source.destroy).toHaveBeenCalledTimes(2);
    });

    it('rotates only the fixture password and clears its refresh token when the secret changes', async () => {
        const { dataSource, users, userRepo } = createStore();
        await seedDevE2e(dataSource, environment);

        const password = 'rotated-dev-admin-test-credential';
        await seedDevE2e(dataSource, {
            ...environment,
            E2E_ADMIN_PASSWORD: password,
        });

        expect(userRepo.update).toHaveBeenCalledTimes(1);
        const [id, changes] = userRepo.update.mock.calls[0];
        expect(id).toBe(users[0].id);
        expect(await bcrypt.compare(password, changes.password)).toBe(true);
        expect(changes.refresh_token()).toBe('NULL');
    });

    it('refuses to provision an account with a conflicting contact', async () => {
        const { dataSource, userRepo } = createStore();
        userRepo.existsBy.mockReturnValueOnce(true);

        await expect(seedDevE2e(dataSource, environment)).rejects.toThrow(
            '계정 연락처가 기존 계정과 충돌',
        );
        expect(userRepo.insert).not.toHaveBeenCalled();
    });

    it('rejects a conflicting account without updating it', async () => {
        const { source, dataSource, users, userRepo } = createStore();
        await seedDevE2e(dataSource, environment);
        users[0].role = 'president';

        await expect(seedDevE2e(dataSource, environment)).rejects.toThrow(
            'dongle_e2e_admin',
        );
        expect(userRepo.update).not.toHaveBeenCalled();
        expect(source.destroy).toHaveBeenCalledTimes(2);
    });
});
