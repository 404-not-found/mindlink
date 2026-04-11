import { Command } from 'commander';
import { text, confirm, isCancel, cancel } from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readdirSync } from 'fs';
import { join, resolve, basename } from 'path';
import AdmZip from 'adm-zip';
import { BRAIN_DIR } from '../utils/paths.js';
import { AGENTS } from '../utils/agents.js';

export const exportCommand = new Command('export')
  .description('Export .brain/ memory to a shareable zip file')
  .option('--output <path>', 'Directory or full path to save the zip file')
  .option('--include-agents', 'Also include agent instruction files (CLAUDE.md, CURSOR.md, etc.)')
  .addHelpText('after', `
What gets exported:
  - .brain/MEMORY.md   — permanent project facts
  - .brain/SESSION.md  — current session state
  - .brain/SHARED.md   — shared context across sessions
  - .brain/LOG.md      — full session history
  - .brain/config.json — settings (excluded by default; use --include-agents for agent files)

Use cases:
  Onboard a new teammate  — send them the zip; they run: brainlink import brain.zip
  Back up before reset    — export first, then brainlink reset
  Share project context   — hand off to a consultant without giving repo access

Examples:
  brainlink export
  brainlink export --output ~/Desktop
  brainlink export --output ~/Desktop/my-app-brain.zip
  brainlink export --include-agents
  `)
  .action(async (opts) => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);

    if (!existsSync(brainDir)) {
      console.log('');
      console.log(`  ${chalk.red('✗')}  No .brain/ found in this directory.`);
      console.log(`     Run ${chalk.cyan('brainlink init')} to get started.`);
      console.log('');
      process.exit(1);
    }

    console.log('');

    // --- Determine output path ---
    const projectName = basename(projectPath);
    const date = new Date().toISOString().slice(0, 10);
    const defaultFilename = `${projectName}-brain-${date}.zip`;

    let outputPath: string;

    if (opts.output) {
      // If they gave a directory, append default filename
      const given = resolve(opts.output);
      if (existsSync(given) && !given.endsWith('.zip')) {
        outputPath = join(given, defaultFilename);
      } else {
        outputPath = given;
      }
    } else if (process.stdin.isTTY) {
      // Interactive: prompt for location
      const answer = await text({
        message: 'Where should the zip be saved?',
        placeholder: projectPath,
        initialValue: projectPath,
        hint: `default filename: ${defaultFilename}`,
      });

      if (isCancel(answer)) { cancel('Cancelled.'); process.exit(0); }

      const dest = resolve(answer as string);
      // If the answer is a directory (or ends without .zip), append default filename
      if (!dest.endsWith('.zip')) {
        outputPath = join(dest, defaultFilename);
      } else {
        outputPath = dest;
      }
    } else {
      // Non-interactive: drop in cwd
      outputPath = join(projectPath, defaultFilename);
    }

    // --- Build zip ---
    const zip = new AdmZip();

    // Core .brain/ files
    const brainFiles = ['MEMORY.md', 'SESSION.md', 'SHARED.md', 'LOG.md'];
    const included: string[] = [];
    const skipped: string[] = [];

    for (const file of brainFiles) {
      const filePath = join(brainDir, file);
      if (existsSync(filePath)) {
        zip.addLocalFile(filePath, '.brain');
        included.push(`.brain/${file}`);
      } else {
        skipped.push(`.brain/${file}`);
      }
    }

    // Also include any LOG archive files
    const archiveFiles = readdirSync(brainDir).filter(f => /^LOG-\d{4}-\d{2}-\d{2}\.md$/.test(f));
    for (const file of archiveFiles) {
      zip.addLocalFile(join(brainDir, file), '.brain');
      included.push(`.brain/${file}`);
    }

    // Agent instruction files (optional)
    if (opts.includeAgents) {
      for (const agent of AGENTS) {
        const agentPath = join(projectPath, agent.destFile);
        if (existsSync(agentPath)) {
          const dir = agent.destFile.includes('/') ? agent.destFile.split('/').slice(0, -1).join('/') : '';
          zip.addLocalFile(agentPath, dir);
          included.push(agent.destFile);
        }
      }
    }

    // Write zip
    try {
      zip.writeZip(outputPath);
    } catch (err: unknown) {
      console.log(`  ${chalk.red('✗')}  Could not write zip: ${err instanceof Error ? err.message : String(err)}`);
      console.log('');
      process.exit(1);
    }

    // --- Output ---
    for (const f of included) console.log(`  ${chalk.green('✓')}  ${f}`);
    if (skipped.length > 0) {
      for (const f of skipped) console.log(`  ${chalk.dim('–')}  ${f} ${chalk.dim('(not found, skipped)')}`);
    }
    console.log('');
    console.log(`  ${chalk.green('✓')}  Exported to: ${chalk.bold(outputPath)}`);
    console.log('');
    console.log(`  ${chalk.dim('To import on another machine or project:')}`);
    console.log(`  ${chalk.cyan(`brainlink import ${basename(outputPath)}`)}`);
    console.log('');
  });
