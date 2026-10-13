import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports an ok status with uptime and an ISO timestamp', () => {
    const service = new HealthService();

    const result = service.check();

    expect(result.status).toBe('ok');
    expect(typeof result.uptime).toBe('number');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});
