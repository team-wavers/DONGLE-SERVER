const mockCreate = jest.fn();

jest.mock('@nestjs/core', () => ({
    NestFactory: { create: mockCreate },
}));

jest.mock('./app.module', () => ({
    AppModule: class AppModule {},
}));

describe('bootstrap', () => {
    it('cookie-parser CommonJS middleware를 실제로 app에 등록한다', async () => {
        const app = {
            get: jest.fn().mockReturnValue({
                get: jest.fn((key: string) => (key === 'PORT' ? 3001 : undefined)),
            }),
            useGlobalPipes: jest.fn(),
            useGlobalInterceptors: jest.fn(),
            use: jest.fn(),
            enableCors: jest.fn(),
            listen: jest.fn().mockResolvedValue(undefined),
        };
        mockCreate.mockResolvedValue(app);

        const { bootstrap } = await import('./main');
        await bootstrap();

        expect(app.use).toHaveBeenCalledTimes(1);
        expect(app.use.mock.calls[0][0]).toEqual(expect.any(Function));
        expect(app.listen).toHaveBeenCalledWith(3001);
    });
});
