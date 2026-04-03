import { registerHandler } from '../runtime';
import { qmdSearchHandler } from './qmd-search';
import { googleDriveHandler } from './google-drive';

export function registerBuiltinHandlers(): void {
  registerHandler(qmdSearchHandler);
  registerHandler(googleDriveHandler);
}

// Auto-register on import
registerBuiltinHandlers();
