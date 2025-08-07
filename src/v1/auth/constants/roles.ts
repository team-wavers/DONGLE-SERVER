// 시스템 역할 상수
export const ROLES = {
    ADMIN: 'admin',
    PRESIDENT: 'president', 
    MEMBER: 'member',
} as const;

// 역할 타입 정의
export type UserRole = typeof ROLES[keyof typeof ROLES];

// 역할별 권한 레벨 (높을수록 더 많은 권한)
export const ROLE_LEVELS = {
    [ROLES.ADMIN]: 3,
    [ROLES.PRESIDENT]: 2,
    [ROLES.MEMBER]: 1,
} as const;

// 역할 유효성 검증 함수
export const isValidRole = (role: string): boolean => {
    const normalizedRole = role.toLowerCase();
    return Object.values(ROLES).includes(normalizedRole as any);
};

// 역할 정규화 함수 (대소문자 통일)
export const normalizeRole = (role: string): UserRole => {
    const normalizedRole = role.toLowerCase();
    if (isValidRole(normalizedRole)) {
        return normalizedRole as UserRole;
    }
    throw new Error(`유효하지 않은 역할입니다: ${role}`);
}; 