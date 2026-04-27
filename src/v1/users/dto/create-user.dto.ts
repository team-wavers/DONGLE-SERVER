export class CreateUserDto {
    // 유저 이름 (필수)
    name: string;

    // 로그인 ID (필수)
    login_id: string;

    // 비밀번호 (필수)
    password: string;


    // 역할(권한) (필수)
    role: string;

    // 전화번호 (필수)
    phone: string;

    // 리프레시 토큰 (최초 생성 시는 비워둘 수 있음)
    refresh_token?: string;
}
