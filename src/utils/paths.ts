import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Root of dist/ — templates live at dist/templates/
export const TEMPLATES_DIR = join(__dirname, 'templates');

export const BRAIN_TEMPLATES_DIR = join(TEMPLATES_DIR, 'brain');
export const AGENT_TEMPLATES_DIR = join(TEMPLATES_DIR, 'agents');
export const HOOKS_TEMPLATES_DIR = join(TEMPLATES_DIR, 'hooks');

export const BRAIN_DIR = '.brain';

// Global MindLink directory — cross-project user profile lives here
export const GLOBAL_MINDLINK_DIR = join(homedir(), '.mindlink');
export const GLOBAL_USER_PROFILE_PATH = join(GLOBAL_MINDLINK_DIR, 'USER.md');

// Windsurf global MCP config (Windsurf only supports global, not project-level)
export const GLOBAL_WINDSURF_MCP_PATH = join(homedir(), '.codeium', 'windsurf', 'mcp_config.json');

// Cline global MCP config (VS Code extension — global settings file)
export const GLOBAL_CLINE_MCP_PATH = join(homedir(), '.cline', 'data', 'settings', 'cline_mcp_settings.json');
