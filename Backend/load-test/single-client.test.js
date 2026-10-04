/**
 * Single Virtual Student Sanity Test
 *
 * Verifies that a virtual student can:
 * 1. Authenticate using an in-memory signed JWT cookie
 * 2. Connect to the WebSocket server
 * 3. Emit `joinSession` with a session code or UUID
 * 4. Receive the quiz payload
 * 5. Emit `submitAnswerAndGetNext` and measure round-trip ACK latency
 *
 * Usage:
 *   node load-test/single-client.test.js <SESSION_CODE_OR_ID> [SERVER_URL]
 */

const { io } = require('socket.io-client');
const { createStudentCookie } = require('./auth-helper');

const sessionId = process.argv[2];
const serverUrl = process.argv[3] || process.env.TEST_SERVER_URL || 'http://localhost:7777';

if (!sessionId) {
  console.error('\x1b[31mError: Please provide a session code or session UUID.\x1b[0m');
  console.log('Usage: node load-test/single-client.test.js <SESSION_CODE_OR_ID> [SERVER_URL]');
  process.exit(1);
}

async function runSingleTest() {
  console.log(`\n🧪 Testing single student connection to: ${serverUrl}`);
  console.log(`🔑 Target Session: ${sessionId}\n`);

  const cookie = createStudentCookie(1);
  const startTime = Date.now();

  const socket = io(serverUrl, {
    transports: ['websocket'],
    extraHeaders: {
      Cookie: cookie,
    },
    reconnection: false,
    timeout: 5000,
  });

  socket.on('connect', () => {
    const connectLatency = Date.now() - startTime;
    console.log(`✅ [1/3] Connected via WebSocket in ${connectLatency} ms (Socket ID: ${socket.id})`);

    // Step 1: Join Session
    console.log('📡 [2/3] Emitting joinSession...');
    const joinStart = performance.now();

    socket.emit('joinSession', { sessionId }, (ack) => {
      const joinLatency = (performance.now() - joinStart).toFixed(2);

      if (!ack?.success) {
        console.error(`❌ joinSession failed (${joinLatency} ms):`, ack);
        socket.disconnect();
        process.exit(1);
      }

      console.log(`✅ [2/3] Joined session in ${joinLatency} ms!`);
      const quiz = ack.data?.quizPayload;
      const resolvedSessionId = ack.data?.sessionId;

      if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        console.warn('⚠️ No active questions in this session. Status:', ack.data?.status);
        socket.disconnect();
        return;
      }

      const q1 = quiz.questions[0];
      console.log(`📝 First Question ID: ${q1.questionId} ("${q1.title || 'Question 1'}")`);

      // Step 2: Submit Answer & Request Next
      console.log('⚡ [3/3] Emitting submitAnswerAndGetNext...');
      const submitStart = performance.now();

      socket.emit(
        'submitAnswerAndGetNext',
        {
          sessionId: resolvedSessionId,
          questionId: q1.questionId,
          response: q1.options?.[0] || 'A',
          timeTakenSecs: 3,
        },
        (submitAck) => {
          const submitLatency = (performance.now() - submitStart).toFixed(2);

          if (!submitAck?.success) {
            console.error(`❌ submitAnswerAndGetNext failed (${submitLatency} ms):`, submitAck);
          } else {
            console.log(`🎉 [3/3] Answer accepted and next question returned in ${submitLatency} ms!`);
            console.log('Next Question Payload:', submitAck.nextQuestion ? 'Received' : 'Quiz Completed');
          }

          console.log('\n=======================================');
          console.log(`  Round-Trip Submit Latency: ${submitLatency} ms`);
          console.log('=======================================\n');

          socket.disconnect();
          process.exit(0);
        }
      );
    });
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  });
}

runSingleTest();
