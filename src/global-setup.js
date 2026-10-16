import fs from 'fs';

/**
 * Global setup runs once before all workers start
 * This ensures results.ndjson is initialized properly for parallel execution
 */
export default async function globalSetup() {
  // Initialize empty results file
  fs.writeFileSync('results.ndjson', '');

  // Clean up any old lock files
  if (fs.existsSync('results.ndjson.lock')) {
    fs.unlinkSync('results.ndjson.lock');
  }

  console.log('✓ Initialized results.ndjson for parallel execution');
}
