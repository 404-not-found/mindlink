import { Command } from 'commander';
import chalk from 'chalk';
import { VERSION } from '../utils/version.js';

export const versionCommand = new Command('version')
  .description('Show the current MindLink version')
  .action(() => {
    console.log('');
    console.log(`  ${chalk.bold('◉ MindLink')}  v${VERSION}`);
    console.log('');
    console.log(`  ${chalk.dim('Run')} ${chalk.cyan('mindlink update')} ${chalk.dim('to check for a newer version.')}`);
    console.log('');
  });
