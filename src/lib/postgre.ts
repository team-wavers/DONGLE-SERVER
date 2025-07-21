import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Club } from '../v1/clubs/entities/club.entity';
import { User } from '../v1/users/entities/user.entity';
import { env } from '../env';

export const postgreConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    synchronize: false,
    logging: true,
    entities: [User, Club],
};
