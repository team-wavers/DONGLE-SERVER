import * as bcrypt from 'bcrypt';
import { DataSource, IsNull, Repository } from 'typeorm';
import { ROLES, UserRole } from '../v1/auth/constants/roles';
import { Club } from '../v1/clubs/entities/club.entity';
import { User } from '../v1/users/entities/user.entity';

const DEV_DATABASE = 'dongle_dev';
const FIXTURE_TAG = 'dev-e2e';

function requiredPassword(env: NodeJS.ProcessEnv, key: string): string {
    const password = env[key];
    if (!password?.trim()) {
        throw new Error(`${key} 환경변수가 필요합니다.`);
    }
    return password;
}

async function seedUser(
    repository: Repository<User>,
    loginId: string,
    name: string,
    role: UserRole,
    phone: string,
    password: string,
): Promise<number> {
    const matching = await repository.find({
        where: { login_id: loginId },
        select: {
            id: true,
            name: true,
            role: true,
            phone: true,
            is_system: true,
            deleted_at: true,
            password: true,
        },
        take: 2,
    });
    const [user] = matching;
    if (
        matching.length > 1 ||
        (user &&
            (user.name !== name ||
                user.role !== role ||
                user.phone !== phone ||
                user.is_system ||
                user.deleted_at))
    ) {
        throw new Error(
            `dev E2E 계정 식별자가 기존 계정과 충돌합니다: ${loginId}`,
        );
    }

    if (user) {
        if (!(await bcrypt.compare(password, user.password))) {
            await repository.update(user.id, {
                password: await bcrypt.hash(password, 10),
                refresh_token: () => 'NULL',
            });
        }
        return user.id;
    }

    if (await repository.existsBy({ phone, deleted_at: IsNull() })) {
        throw new Error(
            'dev E2E 계정 연락처가 기존 계정과 충돌합니다: ' + loginId,
        );
    }

    const result = await repository.insert({
        login_id: loginId,
        name,
        role,
        phone,
        password: await bcrypt.hash(password, 10),
        is_system: false,
    });
    return Number(result.identifiers[0].id);
}

async function seedClub(
    repository: Repository<Club>,
    name: string,
    presidentId: number | null,
): Promise<number> {
    const matching = await repository.find({
        where: { name },
        withDeleted: true,
        take: 2,
    });
    const [club] = matching;
    if (
        matching.length > 1 ||
        (club &&
            (!club.tags?.includes(FIXTURE_TAG) ||
                club.deleted_at ||
                club.president_id !== presidentId))
    ) {
        throw new Error(
            `dev E2E 동아리 식별자가 기존 동아리와 충돌합니다: ${name}`,
        );
    }
    if (club) {
        return club.id;
    }

    const result = await repository.insert({
        name,
        category: '학술분과',
        tags: [FIXTURE_TAG],
        location: 'E2E 테스트 동아리방',
        description: '<p>개발 환경 E2E 동아리입니다.</p>',
        main_activities: '<p>개발 환경 접근 권한을 확인합니다.</p>',
        president_id: presidentId,
    });
    return Number(result.identifiers[0].id);
}

export async function seedDevE2e(
    dataSource: DataSource,
    env: NodeJS.ProcessEnv,
) {
    if (
        env.NODE_ENV !== 'development' ||
        dataSource.options.database !== DEV_DATABASE
    ) {
        throw new Error(
            `dev E2E 시드는 NODE_ENV=development, DB_NAME=${DEV_DATABASE}에서만 실행할 수 있습니다.`,
        );
    }
    const adminPassword = requiredPassword(env, 'E2E_ADMIN_PASSWORD');
    const presidentPassword = requiredPassword(env, 'E2E_CLUB_PASSWORD');

    await dataSource.initialize();
    try {
        return await dataSource.transaction(async (manager) => {
            await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
                'dongle-dev-e2e-seed',
            ]);

            const users = manager.getRepository(User);
            const adminId = await seedUser(
                users,
                'dongle_e2e_admin',
                'E2E 관리자',
                ROLES.ADMIN,
                '01000000001',
                adminPassword,
            );
            const presidentId = await seedUser(
                users,
                'dongle_e2e_president',
                'E2E 회장',
                ROLES.PRESIDENT,
                '01000000002',
                presidentPassword,
            );

            const clubs = manager.getRepository(Club);
            const ownClubId = await seedClub(
                clubs,
                'E2E 권한 검증 동아리 A',
                presidentId,
            );
            const otherClubId = await seedClub(
                clubs,
                'E2E 권한 검증 동아리 B',
                null,
            );
            return { adminId, presidentId, ownClubId, otherClubId };
        });
    } finally {
        await dataSource.destroy();
    }
}

if (require.main === module) {
    void import('./data-source')
        .then(({ default: dataSource }) => seedDevE2e(dataSource, process.env))
        .then((fixtureIds) => console.log(JSON.stringify(fixtureIds)))
        .catch((error: unknown) => {
            console.error(
                error instanceof Error
                    ? error.message
                    : 'dev E2E 시드에 실패했습니다.',
            );
            process.exitCode = 1;
        });
}
