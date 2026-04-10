import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Root of dist/ — templates live at dist/templates/
export const TEMPLATES_DIR = join(__dirname, 'templates');

export const BRAIN_TEMPLATES_DIR = join(TEMPLATES_DIR, 'brain');
export const AGENT_TEMPLATES_DIR = join(TEMPLATES_DIR, 'agents');
export const HOOKS_TEMPLATES_DIR = join(TEMPLATES_DIR, 'hooks');

export const BRAIN_DIR = '.brain';
