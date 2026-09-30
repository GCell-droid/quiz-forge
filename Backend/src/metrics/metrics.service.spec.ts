import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.registry).toBeDefined();
  });

  it('should have all required HTTP and WebSocket metrics defined', async () => {
    expect(service.httpRequestDuration).toBeDefined();
    expect(service.httpRequestsTotal).toBeDefined();
    expect(service.websocketActiveConnections).toBeDefined();
    expect(service.websocketMessagesTotal).toBeDefined();
    expect(service.websocketErrorsTotal).toBeDefined();
    expect(service.websocketMessageDuration).toBeDefined();

    const metricsText = await service.registry.metrics();
    expect(metricsText).toContain('http_request_duration_seconds');
    expect(metricsText).toContain('http_requests_total');
    expect(metricsText).toContain('websocket_active_connections');
    expect(metricsText).toContain('websocket_messages_total');
    expect(metricsText).toContain('websocket_errors_total');
    expect(metricsText).toContain('websocket_message_duration_seconds');
  });

  it('should allow recording values without throwing', async () => {
    service.httpRequestDuration
      .labels('GET', '/v1/health', '200')
      .observe(0.012);
    service.httpRequestsTotal.labels('GET', '/v1/health', '200').inc();
    service.websocketActiveConnections.inc();
    service.websocketActiveConnections.dec();
    service.websocketMessagesTotal.labels('ping').inc();
    service.websocketErrorsTotal.labels('joinSession', 'bad_request').inc();
    service.websocketMessageDuration.labels('ping').observe(0.005);

    const metricsText = await service.registry.metrics();
    expect(metricsText).toContain('route="/v1/health"');
    expect(metricsText).toContain('event="ping"');
    expect(metricsText).toContain('error_type="bad_request"');
  });
});
