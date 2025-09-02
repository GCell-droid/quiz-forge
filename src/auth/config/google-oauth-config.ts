import { registerAs } from '@nestjs/config';

export default registerAs('googleOauth', () => ({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURI: process.env.GOOGLE_CALLBACK_URI,
}));
