import { INestApplication } from '@nestjs/common';
import session from 'express-session';

export function setupSession(app: INestApplication) {
  app.use(
    session({
      secret: process.env.JWT_SECRET || 'super-secreto-papu-pro',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 600000, // 10 minutes - needed for OAuth flows
        httpOnly: true,
        sameSite: 'lax', // Allow cookies in OAuth redirects
      },
    }),
  );
}
