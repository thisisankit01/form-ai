import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'form',
  isDev: process.env.NODE_ENV !== 'production',
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
