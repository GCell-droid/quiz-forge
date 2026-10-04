const { Worker } = require('worker_threads');
const os = require('os');
const path = require('path');

// Parse CLI flags
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    users: 500,
    session: '',
    workers: Math.max(2, Math.min(os.cpus().length, 8)),
    url: process.env.TEST_SERVER_URL || 'http://localhost:7777',
    ramp: 10,
    thinkMin: 1000,
    thinkMax: 3000,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--users':
      case '-u':
        options.users = parseInt(args[++i], 10);
        break;
      case '--session':
      case '-s':
        options.session = args[++i];
        break;
      case '--workers':
      case '-w':
        options.workers = parseInt(args[++i], 10);
        break;
      case '--url':
        options.url = args[++i];
        break;
      case '--ramp':
        options.ramp = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: node load-test/run-load-test.js [options]

Options:
  --session, -s <CODE_OR_UUID>  Session code or UUID to join (Required)
  --users,   -u <NUMBER>        Total virtual students to simulate (default: 500)
  --workers, -w <NUMBER>        Worker threads to spawn (default: ${options.workers})
  --url         <URL>           Backend URL (default: http://localhost:7777)
  --ramp        <MS>            Connection spacing delay per worker in ms (default: 10)
  --help,    -h                 Show this help screen
        `);
        process.exit(0);
    }
  }

  return options;
}

const config = parseArgs();

if (!config.session) {
  console.error('\x1b[31mError: Missing required --session argument.\x1b[0m');
  console.log('Run with --help for usage details.');
  console.log('Example: node load-test/run-load-test.js --session 3LQ4SV --users 1000\n');
  process.exit(1);
}

async function main() {
  console.log('\n============================================================');
  console.log('         ⚡ QUIZFORGE SOCKET.IO LATENCY BENCHMARK           ');
  console.log('============================================================');
  console.log(`🎯 Target URL        : ${config.url}`);
  console.log(`🔑 Target Session    : ${config.session}`);
  console.log(`👥 Virtual Students  : ${config.users}`);
  console.log(`🧵 Worker Threads    : ${config.workers}`);
  console.log(`⏱️ Connection Pacing : ${config.ramp} ms per worker`);
  console.log('============================================================\n');

  const usersPerWorker = Math.floor(config.users / config.workers);
  const remainder = config.users % config.workers;

  let totalConnected = 0;
  let totalSubmitted = 0;
  let totalErrors = 0;
  const allLatencies = [];
  const startOverallTime = performance.now();

  const workerPromises = [];
  let currentStartIndex = 1;

  for (let w = 0; w < config.workers; w++) {
    const count = usersPerWorker + (w === config.workers - 1 ? remainder : 0);
    const startIdx = currentStartIndex;
    const endIdx = currentStartIndex + count - 1;
    currentStartIndex += count;

    const workerData = {
      workerId: w + 1,
      startUserIndex: startIdx,
      endUserIndex: endIdx,
      serverUrl: config.url,
      sessionId: config.session,
      thinkTimeMinMs: config.thinkMin,
      thinkTimeMaxMs: config.thinkMax,
      rampDelayMs: config.ramp,
    };

    const workerPromise = new Promise((resolve, reject) => {
      const worker = new Worker(path.resolve(__dirname, 'worker.js'), {
        workerData,
      });

      worker.on('message', (msg) => {
        if (msg.type === 'CONNECTED') {
          totalConnected++;
          renderProgress();
        } else if (msg.type === 'SUBMITTED') {
          totalSubmitted++;
          renderProgress();
        } else if (msg.type === 'ERROR' || msg.type === 'SUBMIT_ERROR' || msg.type === 'CONNECT_ERROR') {
          totalErrors++;
          renderProgress();
        } else if (msg.type === 'WORKER_DONE') {
          allLatencies.push(...msg.latencies);
          resolve();
        } else if (msg.type === 'WORKER_FATAL') {
          console.error(`\nWorker ${msg.workerId} fatal error:`, msg.error);
          resolve();
        }
      });

      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          resolve();
        }
      });
    });

    workerPromises.push(workerPromise);
  }

  function renderProgress() {
    const elapsedSec = ((performance.now() - startOverallTime) / 1000).toFixed(1);
    process.stdout.write(
      `\r⏳ [${elapsedSec}s] Connected: ${totalConnected}/${config.users} | Answers Submitted: ${totalSubmitted}/${config.users} | Errors: ${totalErrors}   `
    );
  }

  await Promise.all(workerPromises);

  const totalDurationSec = (performance.now() - startOverallTime) / 1000;
  console.log('\n\n');

  if (allLatencies.length === 0) {
    console.error('\x1b[31m❌ No successful answer submissions were recorded. Please verify session status.\x1b[0m\n');
    process.exit(1);
  }

  // Calculate stats
  allLatencies.sort((a, b) => a - b);
  const min = allLatencies[0].toFixed(2);
  const max = allLatencies[allLatencies.length - 1].toFixed(2);
  const sum = allLatencies.reduce((acc, v) => acc + v, 0);
  const avg = (sum / allLatencies.length).toFixed(2);

  const p50 = allLatencies[Math.floor(allLatencies.length * 0.50)].toFixed(2);
  const p90 = allLatencies[Math.floor(allLatencies.length * 0.90)].toFixed(2);
  const p95 = allLatencies[Math.floor(allLatencies.length * 0.95)].toFixed(2);
  const p99 = allLatencies[Math.floor(allLatencies.length * 0.99)].toFixed(2);
  const throughput = (totalSubmitted / totalDurationSec).toFixed(1);

  console.log('============================================================');
  console.log('                   📊 BENCHMARK SUMMARY                     ');
  console.log('============================================================');
  console.log(`Total Simulated Users : ${config.users}`);
  console.log(`Connected Sockets     : ${totalConnected}`);
  console.log(`Successful Answers    : ${totalSubmitted} (${((totalSubmitted / config.users) * 100).toFixed(1)}%)`);
  console.log(`Errors / Dropped      : ${totalErrors}`);
  console.log(`Total Test Duration   : ${totalDurationSec.toFixed(2)} seconds`);
  console.log(`Throughput            : ${throughput} answers/sec`);
  console.log('------------------------------------------------------------');
  console.log('              ROUND-TRIP SUBMIT LATENCIES                   ');
  console.log('------------------------------------------------------------');
  console.log(`  Min Latency         : ${min} ms`);
  console.log(`  Average Latency     : ${avg} ms`);
  console.log(`  p50 (Median)        : ${p50} ms`);
  console.log(`  p90 Latency         : ${p90} ms`);
  console.log(`  p95 Latency         : ${p95} ms`);
  console.log(`  p99 Latency         : ${p99} ms`);
  console.log(`  Max Latency         : ${max} ms`);
  console.log('============================================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('\nFatal benchmark error:', err);
  process.exit(1);
});
