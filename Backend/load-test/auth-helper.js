const jwt = require('jsonwebtoken');
const cookieSignature = require('cookie-signature');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_SECRET = process.env.COOKIE_SECRET;

if (!JWT_SECRET || !COOKIE_SECRET) {
  throw new Error('JWT_SECRET and COOKIE_SECRET must be set in your .env file');
}

/**
 * Generates a cryptographically valid signed JWT cookie for a virtual student.
 * This satisfies WsJwtGuard without needing to insert records into Postgres.
 *
 * @param {string|number} studentId
 * @param {string} role
 * @returns {string} Cookie header string e.g. "jwt=s%3A..."
 */
const crypto = require('crypto');

function createStudentCookie(studentId, role = 'STUDENT') {
  let uid;
  if (typeof studentId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId)) {
    uid = studentId;
  } else if (typeof studentId === 'number') {
    // Generate valid deterministic UUIDv4 format e.g. 00000000-0000-4000-8000-000000000001
    uid = `00000000-0000-4000-8000-${studentId.toString(16).padStart(12, '0')}`;
  } else {
    uid = crypto.randomUUID();
  }

  const token = jwt.sign(
    {
      sub: uid,
      email: `student-${uid.slice(0, 8)}@benchmark.quizforge.local`,
      role: role,
      name: `Student ${studentId}`,
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  // Express / cookie-parser signed cookie format: "s:<token>.<hmac-sha256-signature>"
  const signed = 's:' + cookieSignature.sign(token, COOKIE_SECRET);
  return `jwt=${encodeURIComponent(signed)}`;
}

module.exports = {
  createStudentCookie,
  JWT_SECRET,
  COOKIE_SECRET,
};
