import { Injectable } from '@nestjs/common';
import {
  Histogram,
  Counter,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService {
  public readonly registry: Registry;

  public readonly httpRequestDuration: Histogram<string>;
  public readonly httpRequestsTotal: Counter<string>;
  public readonly websocketActiveConnections: Gauge<string>;
  public readonly websocketMessagesTotal: Counter<string>;
  public readonly websocketErrorsTotal: Counter<string>;
  public readonly websocketMessageDuration: Histogram<string>;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.websocketActiveConnections = new Gauge({
      name: 'websocket_active_connections',
      help: 'Total active WebSocket connections',
      registers: [this.registry],
    });

    this.websocketMessagesTotal = new Counter({
      name: 'websocket_messages_total',
      help: 'Total WebSocket incoming/processed messages',
      labelNames: ['event'],
      registers: [this.registry],
    });

    this.websocketErrorsTotal = new Counter({
      name: 'websocket_errors_total',
      help: 'Total WebSocket errors',
      labelNames: ['event', 'error_type'],
      registers: [this.registry],
    });

    this.websocketMessageDuration = new Histogram({
      name: 'websocket_message_duration_seconds',
      help: 'WebSocket message duration in seconds',
      labelNames: ['event'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });
  }
}
