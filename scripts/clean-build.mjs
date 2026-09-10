import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

// Wrangler can copy local development variables into its build output.
// Production receives runtime secrets from Sites; never ship local settings.
async function clean(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.name === '.dev.vars' || entry.name.startsWith('.dev.vars.')) {
      await rm(path, { force: true });
    } else if (entry.isDirectory()) {
      await clean(path);
    }
  }
}
await clean('dist');
