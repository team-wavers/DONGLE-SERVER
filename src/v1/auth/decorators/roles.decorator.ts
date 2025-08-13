import { SetMetadata } from '@nestjs/common';

// 역할을 메타데이터로 설정하는 데코레이터 (여러 역할을 지정할때 배열로 받음)
export const Roles = (...roles: string[]) => SetMetadata('roles', roles); 