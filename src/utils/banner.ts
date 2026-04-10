import chalk from 'chalk';

export function printBanner(): void {
  console.log('');
  console.log(chalk.dim('  ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋'));
  console.log(`    ${chalk.cyan('◉')}  ${chalk.bold('B R A I N L I N K')}`);
  console.log(chalk.dim('  ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋'));
  console.log('');
}
