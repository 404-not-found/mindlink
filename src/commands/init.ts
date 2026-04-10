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
} from 'fs';
import { join, resolve, dirname } from 'path';
import { BRAIN_TEMPLATES_DIR, AGENT_TEMPLATES_DIR, HOOKS_TEMPLATES_DIR, BRAIN_DIR } from '../utils/paths.js';
import { printBanner } from '../utils/banner.js';
import { AGENTS } from '../utils/agents.js';

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
  brainlink init
  brainlink init --yes
  `)
  .action(async (opts) => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);

    printBanner();

    // --- Already initialized? Show recovery menu ---
    if (existsSync(brainDir)) {
      if (opts.yes) {
        console.log(`  ${chalk.red('✗')}  Already initialized at this path.`);
        console.log(`     Run ${chalk.cyan('brainlink config')} to change settings.`);
        console.log('');
        process.exit(1);
      }

      const action = await select({
        message: '.brain/ already exists at this path. What would you like to do?',
        options: [
          { value: 'config', label: 'Change settings',     hint: 'brainlink config' },
          { value: 'status', label: 'View current status', hint: 'brainlink status' },
          { value: 'exit',   label: 'Nothing — exit',      hint: ''                 },
        ],
      });

      if (isCancel(action) || action === 'exit') {
        process.exit(0);
      }
      if (action === 'status') {
        const { execSync } = await import('child_process');
        try { execSync('brainlink status', { stdio: 'inherit' }); } catch {}
      }
      if (action === 'config') {
        console.log(`  Run ${chalk.cyan('brainlink config')} to change settings.`);
      }
      console.log('');
      process.exit(0);
    }

    intro(chalk.bold('Initializing memory for this project:'));
    console.log(`  ${chalk.dim(projectPath)}`);
    console.log(`  ${chalk.dim('This creates a .brain/ folder scoped to this project only.')}`);
    console.log(`  ${chalk.dim('Run brainlink init once per project — never needs to be run again.')}`);
    console.log('');

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
      console.log(`  ${chalk.dim('↩  Add or remove agents anytime: brainlink config → Agent instruction files')}`);
      console.log('');
    }

    // --- Prompt 2: Git tracking ---
    let gitTracking: boolean;

    if (opts.yes) {
      gitTracking = true;
    } else {
      const gitResult = await select({
        message: 'Should .brain/ be tracked by git?',
        options: [
          { value: 'enable',  label: 'Enable',  hint: 'commit memory — share with your team' },
          { value: 'disable', label: 'Disable', hint: 'add to .gitignore — keep memory personal' },
        ],
      });
      if (isCancel(gitResult)) { cancel('Cancelled.'); process.exit(0); }
      gitTracking = gitResult === 'enable';
      console.log(`  ${chalk.dim('↩  Change anytime: brainlink config → Git tracking')}`);
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
          { value: 'disable', label: 'Disable', hint: 'run brainlink sync manually when needed' },
        ],
      });
      if (isCancel(syncResult)) { cancel('Cancelled.'); process.exit(0); }
      autoSync = syncResult === 'enable';
      console.log(`  ${chalk.dim('↩  Change anytime: brainlink config → Auto-sync')}`);
      console.log('');
    }

    // --- Create files ---
    const s = spinner();
    s.start('Creating memory files...');

    const created: string[] = [];
    const errors: string[] = [];

    try {
      mkdirSync(brainDir, { recursive: true });

      // .brain/ template files
      for (const file of BRAIN_FILES) {
        const dest = join(brainDir, file.templateFile);
        writeFileSync(dest, readFileSync(join(BRAIN_TEMPLATES_DIR, file.templateFile), 'utf8'));
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
        const entry = '\n# Brainlink memory (personal — not shared with team)\n.brain/\n';
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
      `Your AI now has a permanent memory.\nStart a new session — it will wake up fully informed.\n\nRun ${chalk.cyan('brainlink help')} to see all commands.`,
      'Done'
    );
    console.log('');
  });
