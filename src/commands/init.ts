import { Command } from 'commander';
import {
  intro,
  outro,
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
import { join, resolve } from 'path';
import { BRAIN_TEMPLATES_DIR, AGENT_TEMPLATES_DIR, BRAIN_DIR } from '../utils/paths.js';
import { printBanner } from '../utils/banner.js';

const AGENTS = [
  { value: 'claude',   label: 'Claude Code',     hint: 'CLAUDE.md',                          templateFile: 'CLAUDE.md',                 destFile: 'CLAUDE.md',                              selected: true  },
  { value: 'cursor',   label: 'Cursor',           hint: 'CURSOR.md',                          templateFile: 'CURSOR.md',                 destFile: 'CURSOR.md',                              selected: true  },
  { value: 'codex',    label: 'Codex / OpenAI',   hint: 'AGENTS.md',                          templateFile: 'AGENTS.md',                 destFile: 'AGENTS.md',                              selected: true  },
  { value: 'gemini',   label: 'Gemini CLI',       hint: 'GEMINI.md',                          templateFile: 'GEMINI.md',                 destFile: 'GEMINI.md',                              selected: true  },
  { value: 'copilot',  label: 'GitHub Copilot',   hint: '.github/copilot-instructions.md',    templateFile: 'copilot-instructions.md',   destFile: '.github/copilot-instructions.md',        selected: true  },
  { value: 'windsurf', label: 'Windsurf',         hint: '.windsurfrules',                     templateFile: '.windsurfrules',            destFile: '.windsurfrules',                         selected: true  },
  { value: 'cline',    label: 'Cline',            hint: '.clinerules',                        templateFile: '.clinerules',               destFile: '.clinerules',                            selected: false },
  { value: 'aider',    label: 'Aider',            hint: 'CONVENTIONS.md',                     templateFile: 'CONVENTIONS.md',            destFile: 'CONVENTIONS.md',                         selected: false },
];

const BRAIN_FILES = [
  { templateFile: 'MEMORY.md',  label: '.brain/MEMORY.md',  desc: 'permanent project facts'         },
  { templateFile: 'SESSION.md', label: '.brain/SESSION.md', desc: 'current session state'            },
  { templateFile: 'SHARED.md',  label: '.brain/SHARED.md',  desc: 'shared across sessions'           },
  { templateFile: 'LOG.md',     label: '.brain/LOG.md',     desc: 'full session history'             },
];

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

    // Already initialized?
    if (existsSync(brainDir)) {
      console.log(`  ${chalk.red('✗')}  .brain/ already exists at this path.`);
      console.log(`     Run ${chalk.cyan('brainlink status')} to see current memory state.`);
      console.log(`     Run ${chalk.cyan('brainlink config')} to change settings.`);
      console.log('');
      process.exit(1);
    }

    intro(chalk.bold(`Initializing memory for this project:`));
    console.log(`  ${chalk.dim(projectPath)}`);
    console.log(`  ${chalk.dim('This creates a .brain/ folder scoped to this project only.')}`);
    console.log(`  ${chalk.dim('Run brainlink init separately in each project you want to give memory.')}`);
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

      if (isCancel(agentResult)) {
        cancel('Cancelled.');
        process.exit(0);
      }

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

      if (isCancel(gitResult)) {
        cancel('Cancelled.');
        process.exit(0);
      }

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

      if (isCancel(syncResult)) {
        cancel('Cancelled.');
        process.exit(0);
      }

      autoSync = syncResult === 'enable';
      console.log(`  ${chalk.dim('↩  Change anytime: brainlink config → Auto-sync')}`);
      console.log('');
    }

    // --- Create files ---
    const s = spinner();
    s.start('Creating memory files...');

    const created: string[] = [];
    const errors: string[] = [];

    // Create .brain/ directory
    try {
      mkdirSync(brainDir, { recursive: true });

      // Copy .brain/ template files
      for (const file of BRAIN_FILES) {
        const src = join(BRAIN_TEMPLATES_DIR, file.templateFile);
        const dest = join(brainDir, file.templateFile);
        writeFileSync(dest, readFileSync(src, 'utf8'));
        created.push(`${file.label.padEnd(30)} ${chalk.dim(file.desc)}`);
      }

      // Copy selected agent instruction files
      for (const agentValue of selectedAgents) {
        const agent = AGENTS.find(a => a.value === agentValue);
        if (!agent) continue;

        const src = join(AGENT_TEMPLATES_DIR, agent.templateFile);
        const destPath = join(projectPath, agent.destFile);

        // Create parent dir if needed (e.g. .github/)
        const destDir = destPath.substring(0, destPath.lastIndexOf('/'));
        if (destDir !== projectPath) {
          mkdirSync(destDir, { recursive: true });
        }

        writeFileSync(destPath, readFileSync(src, 'utf8'));
        created.push(`${agent.destFile.padEnd(30)} ${chalk.dim(agent.label)}`);
      }

      // Handle .gitignore for .brain/
      if (!gitTracking) {
        const gitignorePath = join(projectPath, '.gitignore');
        const entry = '\n# Brainlink memory (personal — not shared with team)\n.brain/\n';
        if (existsSync(gitignorePath)) {
          const current = readFileSync(gitignorePath, 'utf8');
          if (!current.includes('.brain/')) {
            appendFileSync(gitignorePath, entry);
          }
        } else {
          writeFileSync(gitignorePath, entry.trim() + '\n');
        }
        created.push(`.gitignore${' '.repeat(22)} ${chalk.dim('.brain/ excluded')}`);
      }

      // Save brainlink config
      const config = { gitTracking, autoSync, agents: selectedAgents };
      writeFileSync(join(brainDir, 'config.json'), JSON.stringify(config, null, 2));

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
    }

    s.stop('Done.');
    console.log('');

    // Print created files
    for (const line of created) {
      console.log(`  ${chalk.green('✓')}  ${line}`);
    }

    if (errors.length > 0) {
      console.log('');
      for (const err of errors) {
        console.log(`  ${chalk.red('✗')}  ${err}`);
      }
    }

    console.log('');
    note(
      `Your AI now has a permanent memory.\nStart a new session — it will wake up fully informed.\n\nRun ${chalk.cyan('brainlink help')} to see all commands.`,
      'Done'
    );
    console.log('');
  });
