const { parentPort, workerData } = require('worker_threads');
const { io } = require('socket.io-client');
const { createStudentCookie } = require('./auth-helper');

const {
  workerId,
  startUserIndex,
  endUserIndex,
  serverUrl,
  sessionId,
  thinkTimeMinMs = 1000,
  thinkTimeMaxMs = 3000,
  rampDelayMs = 15,
} = workerData;

async function runWorker() {
  const sockets = [];
  const latencies = [];
  let submittedCount = 0;
  let errorCount = 0;

  for (let i = startUserIndex; i <= endUserIndex; i++) {
    const cookie = createStudentCookie(i);

    const socket = io(serverUrl, {
      transports: ['websocket'],
      extraHeaders: { Cookie: cookie },
      reconnection: false,
      timeout: 10000,
    });

    sockets.push(socket);

    socket.on('connect', () => {
      parentPort.postMessage({ type: 'CONNECTED', workerId });

      // Join session
      socket.emit('joinSession', { sessionId }, (joinAck) => {
        if (!joinAck?.success) {
          errorCount++;
          parentPort.postMessage({
            type: 'ERROR',
            workerId,
            reason: joinAck?.message || 'joinSession failed',
          });
          return;
        }

        const quiz = joinAck.data?.quizPayload;
        const resolvedSessionId = joinAck.data?.sessionId;
        const firstQuestion = quiz?.questions?.[0];

        if (!firstQuestion) {
          // If no questions or quiz not active
          return;
        }

        // Simulate student reading and selecting answer
        const thinkTime =
          thinkTimeMinMs + Math.random() * (thinkTimeMaxMs - thinkTimeMinMs);

        setTimeout(() => {
          const submitStart = performance.now();

          socket.emit(
            'submitAnswerAndGetNext',
            {
              sessionId: resolvedSessionId,
              questionId: firstQuestion.questionId,
              response: firstQuestion.options?.[0] || 'A',
              timeTakenSecs: Math.max(1, Math.round(thinkTime / 1000)),
            },
            (submitAck) => {
              const rtt = performance.now() - submitStart;
              latencies.push(rtt);
              submittedCount++;

              if (!submitAck?.success) {
                errorCount++;
                parentPort.postMessage({
                  type: 'SUBMIT_ERROR',
                  workerId,
                  reason: submitAck?.message || 'submitAnswer failed',
                });
              } else {
                parentPort.postMessage({
                  type: 'SUBMITTED',
                  workerId,
                  latency: rtt,
                });
              }

              // Disconnect after submission to release socket
              socket.disconnect();
            }
          );
        }, thinkTime);
      });
    });

    socket.on('connect_error', (err) => {
      errorCount++;
      parentPort.postMessage({
        type: 'CONNECT_ERROR',
        workerId,
        reason: err.message,
      });
    });

    // Space connection initiations to prevent TCP SYN queue exhaustion
    if (rampDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, rampDelayMs));
    }
  }

  // Wait until all submitted or timed out
  const totalInWorker = endUserIndex - startUserIndex + 1;
  const maxWaitMs = 60000;
  const startTime = Date.now();

  const checkCompletion = setInterval(() => {
    const elapsed = Date.now() - startTime;
    if (submittedCount + errorCount >= totalInWorker || elapsed > maxWaitMs) {
      clearInterval(checkCompletion);

      // Clean up remaining open sockets
      for (const s of sockets) {
        if (s.connected) s.disconnect();
      }

      parentPort.postMessage({
        type: 'WORKER_DONE',
        workerId,
        latencies,
        submittedCount,
        errorCount,
      });
    }
  }, 500);
}

runWorker().catch((err) => {
  parentPort.postMessage({
    type: 'WORKER_FATAL',
    workerId,
    error: err.message,
  });
});
