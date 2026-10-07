import mongoose from 'mongoose';
import { Logger } from 'traceability';
import { env } from '../infrastructure/config/env';
import { resetDatabase, runSeed } from './run-seed';

async function main() {
  const shouldReset = process.argv.includes('--reset');
  if (
    shouldReset &&
    env.isProduction &&
    process.env.SEED_ALLOW_RESET !== 'true'
  ) {
    throw new Error(
      'Refusing to reset a production database without SEED_ALLOW_RESET=true',
    );
  }
  await mongoose.connect(env.databaseUri);
  try {
    if (shouldReset) {
      await resetDatabase();
    }
    await runSeed();
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: Error) => {
  Logger.error(error.message, { eventName: 'seed.failed', stack: error.stack });
  process.exit(1);
});
