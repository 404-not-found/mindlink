import { Command } from 'commander';
import { select, isCancel, cancel } from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, mkdirSync } from 'fs';
import { join, resolve, extname } from 'path';
import AdmZip from 'adm-zip';
import { BRAIN_DIR } from '../utils/paths.js';

export const importCommand = new Command('import')
  .description('Import a Brainlink memory zip into the current project')
  .argument('<file>', 'Path to the .zip file exported by brainlink export')
  .option('-y, --yes', 'Skip confirmation and overwrite existing memory')
  .addHelpText('after', `
What gets imported:
  All .brain/ files found in the zip (MEMORY.md, SESSION.md, SHARED.md, LOG.md,
  and any LOG archive files). Agent instruction files are also imported if the zip
  contains them.

If .brain/ already exists, you will be asked whether to:
  Merge     — import only files that don't exist yet (keeps your current memory)
  Overwrite — replace everything (use when onboarding from a teammate's export)
  Cancel    — do nothing

Use cases:
  Onboard on a new machine — copy the zip, run: brainlink import brain.zip
  Restore from backup      — brainlink import my-app-brain-2026-04-10.zip
  Accept a colleague's brain — merge their context into your project

Examples:
  brainlink import my-app-brain-2026-04-10.zip
  brainlink import ~/Desktop/my-app-brain-2026-04-10.zip --yes
  `)
  .action(async (file, opts) => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);
    const zipPath = resolve(file);

    console.log('');

    if (!existsSync(zipPath)) {
      console.log(`  ${chalk.red('✗')}  File not found: ${zipPath}`);
      console.log('');
      process.exit(1);
    }

    if (extname(zipPath) !== '.zip') {
      console.log(`  ${chalk.red('✗')}  Expected a .zip file. Got: ${zipPath}`);
      console.log('');
      process.exit(1);
    }

    // --- Load and validate zip ---
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipPath);
    } catch (err: unknown) {
      console.log(`  ${chalk.red('✗')}  Could not read zip: ${err instanceof Error ? err.message : String(err)}`);
      console.log('');
      process.exit(1);
    }

    const entries = zip.getEntries();
    const brainEntries = entries.filter(e => e.entryName.startsWith('.brain/') && !e.isDirectory);

    if (brainEntries.length === 0) {
      console.log(`  ${chalk.red('✗')}  This zip doesn't contain any .brain/ files.`);
      console.log(`     Make sure it was created with ${chalk.cyan('brainlink export')}.`);
      console.log('');
      process.exit(1);
    }

    // --- Handle existing .brain/ ---
    let mode: 'merge' | 'overwrite' = 'overwrite';

    if (existsSync(brainDir)) {
      if (opts.yes) {
        mode = 'overwrite';
      } else {
        console.log(`  ${chalk.yellow('!')}  .brain/ already exists in this project.`);
        console.log('');

        const action = await select({
          message: 'How should the import handle existing memory?',
          options: [
            { value: 'merge',     label: 'Merge',     hint: 'add files that don\'t exist yet — keep your current memory' },
            { value: 'overwrite', label: 'Overwrite', hint: 'replace everything with the imported version' },
            { value: 'cancel',    label: 'Cancel',    hint: '' },
          ],
        });

        if (isCancel(action) || action === 'cancel') {
          cancel('Cancelled.');
          console.log('');
          return;
        }

        mode = action as 'merge' | 'overwrite';
        console.log('');
      }
    }

    // --- Extract ---
    mkdirSync(brainDir, { recursive: true });

    const written: string[] = [];
    const skipped: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const destPath = join(projectPath, entry.entryName);
      const destDir = join(projectPath, entry.entryName.split('/').slice(0, -1).join('/'));

      if (mode === 'merge' && existsSync(destPath)) {
        skipped.push(entry.entryName);
        continue;
      }

      mkdirSync(destDir, { recursive: true });
      zip.extractEntryTo(entry, destDir, false, true);
      written.push(entry.entryName);
    }

    // --- Output ---
    for (const f of written) console.log(`  ${chalk.green('✓')}  ${f}`);
    for (const f of skipped) console.log(`  ${chalk.dim('–')}  ${f} ${chalk.dim('(already exists, kept)')}`);
    console.log('');

    if (written.length === 0) {
      console.log(`  ${chalk.dim('Nothing imported — all files already exist (merge mode).')}`);
    } else {
      console.log(`  ${chalk.green('✓')}  Memory imported. Your AI will wake up fully briefed.`);
      if (!existsSync(join(brainDir, '../CLAUDE.md')) && !existsSync(join(brainDir, '../CURSOR.md'))) {
        console.log(`  ${chalk.dim('No agent instruction files found. Run brainlink init to set them up.')}`);
      }
    }
    console.log('');
  });
