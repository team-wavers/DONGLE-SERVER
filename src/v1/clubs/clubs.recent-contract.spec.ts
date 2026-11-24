import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import * as request from 'supertest';
import type { App } from 'supertest/types';
import { TransformResponseInterceptor } from '../../common/response.interceptor';
import { S3Service } from '../../common/lib/s3-uploads';
import { ClubReportsService } from '../club_reports/club_reports.service';
import { ClubReport } from '../club_reports/entities/club_report.entity';
import { ClubSchedulesService } from '../club_schedules/club_schedules.service';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';

const route = '/v1/clubs/reports/recent';
const document = JSON.parse(
    readFileSync(resolve('contracts/openapi.json'), 'utf8'),
) as {
    paths: Record<
        string,
        {
            get: {
                responses: {
                    '200': {
                        content: { 'application/json': { schema: object } };
                    };
                };
            };
        }
    >;
    components: { schemas: Record<string, object> };
};
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
// Preserve OpenAPI component references while validating the selected JSON Schema.
ajv.addKeyword('components');
const validateResponse = ajv.compile({
    ...document.paths[route].get.responses['200'].content['application/json']
        .schema,
    components: document.components,
});

function expectValidResponse(body: unknown) {
    if (!validateResponse(body)) {
        throw new Error(ajv.errorsText(validateResponse.errors));
    }
}

describe('최근 활동보고서 HTTP 계약', () => {
    let app: INestApplication<App>;
    const query = jest.fn();

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [ClubsController],
            providers: [
                ClubReportsService,
                {
                    provide: getRepositoryToken(ClubReport),
                    useValue: { query },
                },
                { provide: ClubsService, useValue: {} },
                { provide: ClubSchedulesService, useValue: {} },
                { provide: S3Service, useValue: {} },
            ],
        }).compile();
        app = module.createNestApplication<INestApplication<App>>();
        app.setGlobalPrefix('v1/clubs');
        app.useGlobalInterceptors(new TransformResponseInterceptor());
        await app.init();
    });

    afterAll(async () => {
        await app?.close();
    });

    it('실제 HTTP 응답은 카드 필드와 null 썸네일을 포함한다', async () => {
        query.mockResolvedValueOnce([
            {
                id: 178,
                title: '10월 활동보고서',
                created_at: new Date('2026-11-10T01:48:25.697Z'),
                club_id: 2,
                club_name: '스파이크',
                image_urls: [],
                content: '<p>보고서 본문</p>',
            },
        ]);
        await request(app.getHttpServer())
            .get(route)
            .expect(expectValidResponseBody)
            .expect(200, {
                isSuccess: true,
                result: [
                    {
                        id: 178,
                        title: '10월 활동보고서',
                        createdAt: '2026-11-10T01:48:25.697Z',
                        club_id: 2,
                        club_name: '스파이크',
                        thumbnail_url: null,
                    },
                ],
            });
    });

    it('결과가 없으면 성공 래퍼 안에 빈 배열을 반환한다', async () => {
        query.mockResolvedValueOnce([]);
        await request(app.getHttpServer())
            .get(route)
            .expect(expectValidResponseBody)
            .expect(200, { isSuccess: true, result: [] });
    });
});

function expectValidResponseBody(response: request.Response) {
    expectValidResponse(response.body);
}
