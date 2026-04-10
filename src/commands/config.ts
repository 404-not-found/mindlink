import { Command } from 'commander';
import { select, multiselect, isCancel, cancel } from '@clack/prompts';
import chalk from 'chalk';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  unlinkSync,
} from 'fs';
import { join, resolve, dirname } from 'path';
import { BRAIN_DIR, AGENT_TEMPLATES_DIR, HOOKS_TEMPLATES_DIR } from '../utils/paths.js';
import { AGENTS } from '../utils/agents.js';

interface BrainConfig {
  gitTracking: boolean;
  autoSync: boolean;
  agents: string[];
  maxLogEntries: number;
}

function readConfig(brainDir: string): BrainConfig {
  return JSON.parse(readFileSync(join(brainDir, 'config.json'), 'utf8'));
}

function saveConfig(brainDir: string, config: BrainConfig): void {
  writeFileSync(join(brainDir, 'config.json'), JSON.stringify(config, null, 2));
}

function enableGitTracking(projectPath: string): void {
  const gitignorePath = join(projectPath, '.gitignore');
  if (!existsSync(gitignorePath)) return;
  const content = readFileSync(gitignorePath, 'utf8');
  // Remove the brainlink .brain/ block
  const cleaned = content
    .replace(/\n# Brainlink memory[^\n]*\n\.brain\/\n?/g, '')
    .replace(/\n?\.brain\/\n?/g, '\n');
  writeFileSync(gitignorePath, cleaned.trimEnd() + '\n');
}

function disableGitTracking(projectPath: string): void {
  const gitignorePath = join(projectPath, '.gitignore');
  const entry = '\n# Brainlink memory (personal — not shared with team)\n.brain/\n';
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf8');
    if (!content.includes('.brain/')) appendFileSync(gitignorePath, entry);
  } else {
    writeFileSync(gitignorePath, entry.trim() + '\n');
  }
}

function addAgentFile(projectPath: string, agentValue: string): string | null {
  const agent = AGENTS.find(a => a.value === agentValue);
  if (!agent) return null;
  const destPath = join(projectPath, agent.destFile);
  if (existsSync(destPath)) return null; // already there
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, readFileSync(join(AGENT_TEMPLATES_DIR, agent.templateFile), 'utf8'));
  return agent.destFile;
}

function removeAgentFile(projectPath: string, agentValue: string): string | null {
  const agent = AGENTS.find(a => a.value === agentValue);
  if (!agent) return null;
  const destPath = join(projectPath, agent.destFile);
  if (!existsSync(destPath)) return null;
  unlinkSync(destPath);
  return agent.destFile;
}

function addClaudeHook(projectPath: string): boolean {
  const hookDest = join(projectPath, '.claude', 'settings.json');
  if (existsSync(hookDest)) return false;
  mkdirSync(dirname(hookDest), { recursive: true });
  writeFileSync(hookDest, readFileSync(join(HOOKS_TEMPLATES_DIR, 'claude-settings.json'), 'utf8'));
  return true;
}

export const configCommand = new Command('config')
  .description('Change settings for the current project')
  .addHelpText('after', `
Examples:
  brainlink config
  `)
  .action(async () => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);

    if (!existsSync(brainDir)) {
      console.log(`  ${chalk.red('✗')}  No .brain/ found in this directory.`);
      console.log(`     Run ${chalk.cyan('brainlink init')} to get started.`);
      console.log('');
      process.exit(1);
    }

    // Non-TTY: just print current settings and exit
    if (!process.stdin.isTTY) {
      const cfg = readConfig(brainDir);
      const agentLabels = cfg.agents
        .map((v: string) => AGENTS.find(a => a.value === v)?.hint ?? v)
        .join(', ');
      console.log(JSON.stringify({ ...cfg, agentFiles: agentLabels }, null, 2));
      return;
    }

    let config = readConfig(brainDir);

    // ── Main menu loop ────────────────────────────────────────────────────────
    while (true) {
      console.log('');
      console.log(`  ${chalk.bold('Current settings')}  ${chalk.dim('·')}  ${chalk.dim(projectPath)}`);
      console.log('');
      console.log(`  Git tracking   : ${config.gitTracking ? chalk.green('enabled') : chalk.dim('disabled')}   ${chalk.dim(config.gitTracking ? '(team shares memory)' : '(.brain/ excluded from git)')}`);
      console.log(`  Auto-sync      : ${config.autoSync ? chalk.green('enabled') : chalk.dim('disabled')}   ${chalk.dim(config.autoSync ? '(watch mode)' : '(run brainlink sync manually)')}`);

      const agentLabels = config.agents
        .map(v => AGENTS.find(a => a.value === v)?.hint ?? v)
        .join(', ');
      console.log(`  Agent files    : ${chalk.dim(agentLabels || 'none')}`);
      console.log('');

      const action = await select({
        message: 'What would you like to change?',
        options: [
          { value: 'git',    label: 'Git tracking' },
          { value: 'sync',   label: 'Auto-sync' },
          { value: 'agents', label: 'Agent instruction files' },
          { value: 'exit',   label: 'Exit' },
        ],
      });

      if (isCancel(action) || action === 'exit') break;

      // ── Git tracking ───────────────────────────────────────────────────────
      if (action === 'git') {
        const choice = await select({
          message: 'Git tracking — should .brain/ be committed to git?',
          options: [
            { value: 'enable',  label: 'Enable',  hint: 'commit memory (share with your team)' },
            { value: 'disable', label: 'Disable', hint: 'add to .gitignore (keep memory personal)' },
            { value: 'back',    label: '↩  Back' },
          ],
          initialValue: config.gitTracking ? 'enable' : 'disable',
        });

        if (isCancel(choice) || choice === 'back') continue;

        const newValue = choice === 'enable';
        if (newValue === config.gitTracking) {
          console.log(`  ${chalk.dim('No change.')}`);
          continue;
        }

        if (newValue) {
          enableGitTracking(projectPath);
          console.log(`  ${chalk.green('✓')}  Git tracking enabled. .brain/ will be committed.`);
        } else {
          disableGitTracking(projectPath);
          console.log(`  ${chalk.green('✓')}  .gitignore updated. .brain/ will no longer be tracked.`);
        }

        config.gitTracking = newValue;
        saveConfig(brainDir, config);
        console.log(`  ${chalk.dim('↩  Change anytime: brainlink config → Git tracking')}`);
      }

      // ── Auto-sync ──────────────────────────────────────────────────────────
      if (action === 'sync') {
        const choice = await select({
          message: 'Auto-sync mode',
          options: [
            { value: 'enable',  label: 'Enable',  hint: 'watch for changes, sync automatically' },
            { value: 'disable', label: 'Disable', hint: 'run brainlink sync manually' },
            { value: 'back',    label: '↩  Back' },
          ],
          initialValue: config.autoSync ? 'enable' : 'disable',
        });

        if (isCancel(choice) || choice === 'back') continue;

        const newValue = choice === 'enable';
        if (newValue === config.autoSync) {
          console.log(`  ${chalk.dim('No change.')}`);
          continue;
        }

        config.autoSync = newValue;
        saveConfig(brainDir, config);
        console.log(`  ${chalk.green('✓')}  Auto-sync ${newValue ? 'enabled' : 'disabled'}.`);
        console.log(`  ${chalk.dim('↩  Change anytime: brainlink config → Auto-sync')}`);
      }

      // ── Agent files ────────────────────────────────────────────────────────
      if (action === 'agents') {
        const agentChoices = AGENTS.map(a => ({
          value: a.value,
          label: `${a.label.padEnd(18)} ${chalk.dim(a.hint)}`,
          hint: a.selected ? 'recommended' : undefined,
        }));

        const result = await multiselect({
          message: 'Which AI agents do you use?',
          options: agentChoices,
          initialValues: config.agents,
          required: false,
        });

        if (isCancel(result)) continue;

        const newAgents = result as string[];
        const added   = newAgents.filter(v => !config.agents.includes(v));
        const removed = config.agents.filter(v => !newAgents.includes(v));

        const addedFiles: string[] = [];
        const removedFiles: string[] = [];

        for (const v of added) {
          const f = addAgentFile(projectPath, v);
          if (f) addedFiles.push(f);
          if (v === 'claude') {
            if (addClaudeHook(projectPath)) addedFiles.push('.claude/settings.json');
          }
        }

        for (const v of removed) {
          const f = removeAgentFile(projectPath, v);
          if (f) removedFiles.push(f);
        }

        config.agents = newAgents;
        saveConfig(brainDir, config);

        if (addedFiles.length === 0 && removedFiles.length === 0) {
          console.log(`  ${chalk.dim('No change.')}`);
        } else {
          for (const f of addedFiles)   console.log(`  ${chalk.green('✓')}  ${f} added.`);
          for (const f of removedFiles) console.log(`  ${chalk.dim('✗')}  ${f} removed.`);
        }
        console.log(`  ${chalk.dim('↩  Change anytime: brainlink config → Agent instruction files')}`);
      }
    }

    console.log('');
  });
