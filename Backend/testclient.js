/**
 * QuizForge WebSocket Test & Latency Probe
 * Usage: node testclient.js
 */
const { io } = require('socket.io-client');

async function testWebSocket() {
  console.log('--- QuizForge WebSocket Observability Probe ---');
  console.log('Connecting to http://localhost:7777 ...');

  const socket = io('http://localhost:7777', {
    transports: ['websocket'],
  });

  await new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log(`[Connected] Socket ID: ${socket.id}`);
      resolve();
    });
    socket.on('connect_error', (err) => {
      console.error('[Connect Error]', err.message);
      reject(err);
    });
  });

  // 1. Measure RTT over ping/pong
  console.log('\nTesting WebSocket latency (Ping / Pong RTT)...');
  for (let i = 1; i <= 5; i++) {
    const t0 = performance.now();
    await new Promise((resolve) => {
      socket.emit('ping', { timestamp: Date.now() }, (response) => {
        const rtt = (performance.now() - t0).toFixed(2);
        console.log(
          `  Ping #${i}: Server acknowledged in ${rtt} ms | Server payload:`,
          response,
        );
        resolve(response);
      });
    });
    await new Promise((r) => setTimeout(r, 200));
  }

  // 2. Disconnect
  console.log('\nDisconnecting socket...');
  socket.disconnect();
  console.log('[Disconnected]');

  // 3. Inspect Prometheus metrics
  await new Promise((r) => setTimeout(r, 300));
  const res = await fetch('http://localhost:7777/metrics');
  const metricsText = await res.text();

  console.log('\n--- Live Prometheus WebSocket Metrics ---');
  metricsText
    .split('\n')
    .filter((l) => l.startsWith('websocket_'))
    .forEach((l) => console.log(l));
}

testWebSocket().catch((err) => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
