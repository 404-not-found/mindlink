import { Command } from 'commander';
import {
  intro,
  multiselect,
  select,
  spinner,
  note,
  cancel,
  isCancel,
} from '@clack/prompts';
import chalk from 'chalk';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  readdirSync,
} from 'fs';
import { execSync } from 'child_process';
import { join, resolve, dirname, basename } from 'path';
import { BRAIN_TEMPLATES_DIR, AGENT_TEMPLATES_DIR, HOOKS_TEMPLATES_DIR, BRAIN_DIR } from '../utils/paths.js';
import { printBanner } from '../utils/banner.js';
import { AGENTS } from '../utils/agents.js';
import { registerProject } from '../utils/registry.js';

interface ProjectInfo {
  name: string;
  description: string;
  stack: string;
  recentActivity: string;
  topDirs: string;
  date: string;
}

function detectProjectInfo(projectPath: string): ProjectInfo {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  let name = basename(projectPath);
  let description = '';
  let stack = '';
  let recentActivity = '';
  let topDirs = '';

  // Try package.json
  const pkgPath = join(projectPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (pkg.name) name = pkg.name;
      if (pkg.description) description = pkg.description;
      // Derive stack from package.json deps
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const layers: string[] = ['Node.js'];
      if (deps['typescript'] || deps['ts-node'] || deps['tsup']) layers.push('TypeScript');
      if (deps['react'] || deps['next']) layers.push(deps['next'] ? 'Next.js' : 'React');
      if (deps['express'] || deps['fastify'] || deps['koa']) layers.push('Express/Fastify');
      if (deps['vite']) layers.push('Vite');
      stack = layers.join(' + ');
    } catch {}
  }

  // Detect stack from manifest files (if no package.json)
  if (!stack) {
    if (existsSync(join(projectPath, 'Cargo.toml'))) stack = 'Rust';
    else if (existsSync(join(projectPath, 'go.mod'))) stack = 'Go';
    else if (existsSync(join(projectPath, 'pyproject.toml')) || existsSync(join(projectPath, 'requirements.txt'))) stack = 'Python';
    else if (existsSync(join(projectPath, 'pom.xml'))) stack = 'Java (Maven)';
    else if (existsSync(join(projectPath, 'build.gradle')) || existsSync(join(projectPath, 'build.gradle.kts'))) stack = 'Kotlin/Java (Gradle)';
    else if (existsSync(join(projectPath, 'composer.json'))) stack = 'PHP';
    else if (existsSync(join(projectPath, 'Gemfile'))) stack = 'Ruby';
  }

  // Read README for description if not found yet
  if (!description) {
    const readmePath = join(projectPath, 'README.md');
    if (existsSync(readmePath)) {
      try {
        const lines = readFileSync(readmePath, 'utf8').split('\n');
        // Find first non-heading, non-empty line as description
        for (const line of lines.slice(0, 30)) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!') && !trimmed.startsWith('<') && trimmed.length > 10) {
            description = trimmed.replace(/\*\*/g, '').slice(0, 120);
            break;
          }
        }
      } catch {}
    }
  }

  // Get recent git activity
  try {
    const log = execSync('git log --oneline -5', { cwd: projectPath, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim();
    if (log) {
      recentActivity = log.split('\n').slice(0, 3).join(' · ');
    }
  } catch {}

  // Top-level dirs (skip hidden, node_modules, dist, etc.)
  const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.brain', 'binaries', '.cache', 'coverage', '.next', 'out']);
  try {
    const entries = readdirSync(projectPath, { withFileTypes: true });
    const dirs = entries
      .filter(e => e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith('.'))
      .map(e => e.name)
      .slice(0, 6);
    if (dirs.length > 0) topDirs = dirs.join(', ');
  } catch {}

  return { name, description, stack, recentActivity, topDirs, date };
}

/** Returns true if MEMORY.md has at least one real (non-comment, non-heading, non-empty) line */
function memoryHasRealContent(memoryPath: string): boolean {
  try {
    const lines = readFileSync(memoryPath, 'utf8').split('\n');
    return lines.some(line => {
      const t = line.trim();
      return t.length > 0 && !t.startsWith('#') && !t.startsWith('<!--') && !t.startsWith('>') && !t.startsWith('|') && t !== '---';
    });
  } catch {
    return false;
  }
}

function buildMemoryMd(templateContent: string, info: ProjectInfo): string {
  let content = templateContent;

  // Inject project name + description under "What this project is"
  const whatLine = info.description
    ? `**${info.name}** — ${info.description}`
    : `**${info.name}**`;
  content = content.replace(
    /### What this project is\n<!--[^]*?-->/,
    `### What this project is\n${whatLine}\n<!-- 2–3 lines: what it does, who it's for, what problem it solves -->`
  );

  // Inject detected stack under "Stack"
  if (info.stack) {
    content = content.replace(
      /### Stack\n<!--[^]*?-->/,
      `### Stack\n${info.stack}\n<!-- Add layers: Frontend, Backend, Infra, etc. -->`
    );
  }

  // Inject top dirs and recent activity under "Current focus"
  const focusLines: string[] = [];
  if (info.topDirs) focusLines.push(`Directories: ${info.topDirs}`);
  if (info.recentActivity) focusLines.push(`Recent commits: ${info.recentActivity}`);
  const focusBlock = focusLines.length > 0
    ? focusLines.join('\n') + `\n<!-- Initialized ${info.date} — update to reflect the current active focus -->`
    : `<!-- Initialized ${info.date} — ask your AI to fill this in after your first session -->`;
  content = content.replace(
    /### Current focus\n<!--[^]*?-->/,
    `### Current focus\n${focusBlock}`
  );

  return content;
}

const BRAIN_FILES = [
  { templateFile: 'MEMORY.md',  label: '.brain/MEMORY.md',  desc: 'permanent project facts'  },
  { templateFile: 'SESSION.md', label: '.brain/SESSION.md', desc: 'current session state'    },
  { templateFile: 'SHARED.md',  label: '.brain/SHARED.md',  desc: 'shared across sessions'   },
  { templateFile: 'LOG.md',     label: '.brain/LOG.md',     desc: 'full session history'     },
];

const DEFAULT_MAX_LOG_ENTRIES = 50;


export const initCommand = new Command('init')
  .description('Set up memory for the current project')
  .option('-y, --yes', 'Skip all prompts, use defaults')
  .addHelpText('after', `
Examples:
  mindlink init
  mindlink init --yes
  `)
  .action(async (opts) => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);

    printBanner();

    // --- Already initialized? ---
    if (existsSync(brainDir)) {
      const memoryPath = join(brainDir, 'MEMORY.md');
      const hasMemory = existsSync(memoryPath) && memoryHasRealContent(memoryPath);

      // Team onboarding mode: .brain/ exists with real content but no agent files for this user
      if (!opts.yes && hasMemory) {
        const hasAnyAgentFile = AGENTS.some(a => existsSync(join(projectPath, a.destFile)));
        if (!hasAnyAgentFile) {
          console.log('');
          console.log(`  ${chalk.cyan('◉')}  MindLink memory found in this project.`);
          console.log(`     ${chalk.dim('MEMORY.md has content — this looks like a team project.')}`);
          console.log('');

          const action = await select({
            message: 'What would you like to do?',
            options: [
              { value: 'restore', label: 'Set up agent files',  hint: 'recommended for new team members — writes CLAUDE.md, .cursorrules, etc.' },
              { value: 'reinit',  label: 'Full re-init',        hint: 'recreate everything, reconfigure settings'                                },
              { value: 'exit',    label: 'Cancel',              hint: ''                                                                          },
            ],
          });

          if (isCancel(action) || action === 'exit') { process.exit(0); }

          if (action === 'restore') {
            // Just write agent instruction files — skip all config prompts
            const agentChoices = AGENTS.map(a => ({
              value: a.value,
              label: `${a.label.padEnd(18)} ${chalk.dim(a.hint)}`,
              hint: a.selected ? 'recommended' : undefined,
            }));
            const agentResult = await multiselect({
              message: 'Which AI agents do you use?',
              options: agentChoices,
              initialValues: AGENTS.filter(a => a.selected).map(a => a.value),
              required: false,
            });
            if (isCancel(agentResult)) { cancel('Cancelled.'); process.exit(0); }

            const toRestore = agentResult as string[];
            const restored: string[] = [];
            for (const agentValue of toRestore) {
              const agent = AGENTS.find(a => a.value === agentValue);
              if (!agent) continue;
              const destPath = join(projectPath, agent.destFile);
              mkdirSync(dirname(destPath), { recursive: true });
              writeFileSync(destPath, readFileSync(join(AGENT_TEMPLATES_DIR, agent.templateFile), 'utf8'));
              restored.push(agent.destFile);
            }
            if (toRestore.includes('claude')) {
              const hookDest = join(projectPath, '.claude', 'settings.json');
              if (!existsSync(hookDest)) {
                mkdirSync(dirname(hookDest), { recursive: true });
                writeFileSync(hookDest, readFileSync(join(HOOKS_TEMPLATES_DIR, 'claude-settings.json'), 'utf8'));
                restored.push('.claude/settings.json');
              }
            }

            // Write config.json if missing — needed so mindlink update tracks this project
            const configPath = join(brainDir, 'config.json');
            if (!existsSync(configPath)) {
              const config = {
                gitTracking: true,
                autoSync: true,
                agents: toRestore,
                maxLogEntries: DEFAULT_MAX_LOG_ENTRIES,
              };
              writeFileSync(configPath, JSON.stringify(config, null, 2));
              restored.push('.brain/config.json');
            }

            // Register with project registry so update/sync can find it
            try { registerProject(projectPath); } catch {}

            console.log('');
            for (const f of restored) console.log(`  ${chalk.green('✓')}  ${f}`);
            console.log('');
            console.log(`  ${chalk.green('✓')}  Agent files ready. Start a new session — your AI is already briefed.`);
            console.log('');
            process.exit(0);
          }

          // action === 'reinit' — fall through to normal init flow below
          // Remove brainDir so the rest of init proceeds fresh
          // (we don't remove it — we'll overwrite files in place)
        } else {
          // Already fully initialized for this user
          if (opts.yes) {
            console.log(`  ${chalk.red('✗')}  Already initialized at this path.`);
            console.log(`     Run ${chalk.cyan('mindlink config')} to change settings.`);
            console.log('');
            process.exit(1);
          }

          const action = await select({
            message: '.brain/ already exists at this path. What would you like to do?',
            options: [
              { value: 'config', label: 'Change settings',     hint: 'mindlink config' },
              { value: 'status', label: 'View current status', hint: 'mindlink status' },
              { value: 'exit',   label: 'Nothing — exit',      hint: ''                },
            ],
          });

          if (isCancel(action) || action === 'exit') { process.exit(0); }
          if (action === 'status') {
            try { execSync('mindlink status', { cwd: projectPath, stdio: 'inherit' }); } catch {}
          }
          if (action === 'config') {
            console.log(`  Run ${chalk.cyan('mindlink config')} to change settings.`);
          }
          console.log('');
          process.exit(0);
        }
      } else if (opts.yes) {
        // --yes flag on already-initialized project: error out
        console.log(`  ${chalk.red('✗')}  Already initialized at this path.`);
        console.log(`     Run ${chalk.cyan('mindlink config')} to change settings.`);
        console.log('');
        process.exit(1);
      } else if (!hasMemory) {
        // .brain/ exists but is empty — treat as re-init, fall through
      } else {
        const action = await select({
          message: '.brain/ already exists at this path. What would you like to do?',
          options: [
            { value: 'config', label: 'Change settings',     hint: 'mindlink config' },
            { value: 'status', label: 'View current status', hint: 'mindlink status' },
            { value: 'exit',   label: 'Nothing — exit',      hint: ''                },
          ],
        });
        if (isCancel(action) || action === 'exit') { process.exit(0); }
        if (action === 'status') {
          try { execSync('mindlink status', { cwd: projectPath, stdio: 'inherit' }); } catch {}
        }
        if (action === 'config') {
          console.log(`  Run ${chalk.cyan('mindlink config')} to change settings.`);
        }
        console.log('');
        process.exit(0);
      }
    }

    intro(chalk.bold('Initializing memory for this project:'));
    console.log(`  ${chalk.dim(projectPath)}`);
    console.log(`  ${chalk.dim('This creates a .brain/ folder scoped to this project only.')}`);
    console.log(`  ${chalk.dim('Run mindlink init once per project — never needs to be run again.')}`);
    console.log('');

    // Windows warning: hooks are bash scripts, won't run on Windows
    if (process.platform === 'win32') {
      console.log(`  ${chalk.yellow('⚠')}  ${chalk.bold('Windows detected')}`);
      console.log(`     Claude Code hooks use bash and won't run on Windows.`);
      console.log(`     Memory enforcement (Stop hook, session timestamps) will be disabled.`);
      console.log(`     All other features work normally.`);
      console.log('');
    }

    // --- Prompt 1: Agent selection ---
    let selectedAgents: string[];

    if (opts.yes) {
      selectedAgents = AGENTS.filter(a => a.selected).map(a => a.value);
    } else {
      const agentChoices = AGENTS.map(a => ({
        value: a.value,
        label: `${a.label.padEnd(18)} ${chalk.dim(a.hint)}`,
        hint: a.selected ? 'recommended' : undefined,
      }));

      const agentResult = await multiselect({
        message: 'Which AI agents do you use?',
        options: agentChoices,
        initialValues: AGENTS.filter(a => a.selected).map(a => a.value),
        required: false,
      });

      if (isCancel(agentResult)) { cancel('Cancelled.'); process.exit(0); }
      selectedAgents = agentResult as string[];
      console.log(`  ${chalk.dim('↩  Add or remove agents anytime: mindlink config → Agent instruction files')}`);
      console.log('');
    }

    // --- Prompt 2: Git tracking ---
    let gitTracking: boolean;

    if (opts.yes) {
      gitTracking = true;
    } else {
      console.log(`  ${chalk.dim('.brain/ is your AI\'s memory — MEMORY.md, SESSION.md, SHARED.md, LOG.md.')}`);
      console.log(`  ${chalk.dim('Plain Markdown files. Commit them to share with your team, or keep them local.')}`);
      console.log('');
      const gitResult = await select({
        message: 'Should .brain/ be committed to git?',
        options: [
          { value: 'enable',  label: 'Enable',  hint: 'team shares the same AI memory' },
          { value: 'disable', label: 'Disable', hint: 'add to .gitignore — personal memory only' },
        ],
      });
      if (isCancel(gitResult)) { cancel('Cancelled.'); process.exit(0); }
      gitTracking = gitResult === 'enable';
      console.log(`  ${chalk.dim('↩  Change anytime: mindlink config → Git tracking')}`);
      console.log('');
    }

    // --- Prompt 3: Auto-sync ---
    let autoSync: boolean;

    if (opts.yes) {
      autoSync = true;
    } else {
      const syncResult = await select({
        message: 'Auto-sync between sessions?',
        options: [
          { value: 'enable',  label: 'Enable',  hint: 'watch for changes, sync automatically (recommended)' },
          { value: 'disable', label: 'Disable', hint: 'run mindlink sync manually when needed' },
        ],
      });
      if (isCancel(syncResult)) { cancel('Cancelled.'); process.exit(0); }
      autoSync = syncResult === 'enable';
      console.log(`  ${chalk.dim('↩  Change anytime: mindlink config → Auto-sync')}`);
      console.log('');
    }

    // --- Create files ---
    const s = spinner();
    s.start('Creating memory files...');

    const created: string[] = [];
    const errors: string[] = [];

    try {
      mkdirSync(brainDir, { recursive: true });
      try { registerProject(projectPath); } catch {}

      const projectInfo = detectProjectInfo(projectPath);

      // .brain/ template files
      for (const file of BRAIN_FILES) {
        const dest = join(brainDir, file.templateFile);
        const templateContent = readFileSync(join(BRAIN_TEMPLATES_DIR, file.templateFile), 'utf8');
        const content = file.templateFile === 'MEMORY.md'
          ? buildMemoryMd(templateContent, projectInfo)
          : templateContent;
        writeFileSync(dest, content);
        created.push(`${file.label.padEnd(32)} ${chalk.dim(file.desc)}`);
      }

      // Agent instruction files
      for (const agentValue of selectedAgents) {
        const agent = AGENTS.find(a => a.value === agentValue);
        if (!agent) continue;
        const destPath = join(projectPath, agent.destFile);
        mkdirSync(dirname(destPath), { recursive: true });
        writeFileSync(destPath, readFileSync(join(AGENT_TEMPLATES_DIR, agent.templateFile), 'utf8'));
        created.push(`${agent.destFile.padEnd(32)} ${chalk.dim(agent.label)}`);
      }

      // .claude/settings.json hook for Claude Code
      if (selectedAgents.includes('claude')) {
        const hookDest = join(projectPath, '.claude', 'settings.json');
        if (!existsSync(hookDest)) {
          mkdirSync(dirname(hookDest), { recursive: true });
          writeFileSync(hookDest, readFileSync(join(HOOKS_TEMPLATES_DIR, 'claude-settings.json'), 'utf8'));
          created.push(`.claude/settings.json${' '.repeat(14)} ${chalk.dim('Claude Code compact hook')}`);
        }
      }

      // .gitignore
      if (!gitTracking) {
        const gitignorePath = join(projectPath, '.gitignore');
        const entry = '\n# MindLink memory (personal — not shared with team)\n.brain/\n';
        if (existsSync(gitignorePath)) {
          const current = readFileSync(gitignorePath, 'utf8');
          if (!current.includes('.brain/')) appendFileSync(gitignorePath, entry);
        } else {
          writeFileSync(gitignorePath, entry.trim() + '\n');
        }
        created.push(`.gitignore${' '.repeat(23)} ${chalk.dim('.brain/ excluded')}`);
      }

      // Save config (includes maxLogEntries for log rotation)
      const config = {
        gitTracking,
        autoSync,
        agents: selectedAgents,
        maxLogEntries: DEFAULT_MAX_LOG_ENTRIES,
      };
      writeFileSync(join(brainDir, 'config.json'), JSON.stringify(config, null, 2));

    } catch (err: unknown) {
      errors.push(err instanceof Error ? err.message : String(err));
    }

    s.stop('Done.');
    console.log('');

    for (const line of created) {
      console.log(`  ${chalk.green('✓')}  ${line}`);
    }
    if (errors.length > 0) {
      console.log('');
      for (const err of errors) console.log(`  ${chalk.red('✗')}  ${err}`);
    }

    console.log('');
    note(
      `Your AI finally has a brain.\n\nEvery new session wakes up knowing the project, past decisions,\ncurrent task, and what other sessions have shared. No more\nre-explaining from scratch. No more goldfish moments.\n\nLike any good brain, it remembers what matters and quietly\nlets go of the old stuff — that's what MEMORY.md is for:\npromote anything important there and it stays forever.\n\nStart a new AI session — it'll hit the ground running.\n\nRun ${chalk.cyan('mindlink help')} to see all commands.`,
      '◉ MindLink active'
    );
    console.log('');
  });
