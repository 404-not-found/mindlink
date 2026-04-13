export interface AgentDef {
  value: string;
  label: string;
  hint: string;
  templateFile: string;
  destFile: string;
  selected: boolean;
}

export const AGENTS: AgentDef[] = [
  { value: 'claude',   label: 'Claude Code',   hint: 'CLAUDE.md',                       templateFile: 'CLAUDE.md',               destFile: 'CLAUDE.md',                       selected: true  },
  { value: 'cursor',   label: 'Cursor',         hint: 'CURSOR.md',                       templateFile: 'CURSOR.md',               destFile: 'CURSOR.md',                       selected: true  },
  { value: 'codex',    label: 'Codex / OpenAI', hint: 'AGENTS.md',                       templateFile: 'AGENTS.md',               destFile: 'AGENTS.md',                       selected: true  },
  { value: 'gemini',   label: 'Gemini CLI',     hint: 'GEMINI.md',                       templateFile: 'GEMINI.md',               destFile: 'GEMINI.md',                       selected: true  },
  { value: 'copilot',  label: 'GitHub Copilot', hint: '.github/copilot-instructions.md', templateFile: 'copilot-instructions.md', destFile: '.github/copilot-instructions.md', selected: true  },
  { value: 'windsurf', label: 'Windsurf',       hint: '.windsurfrules',                  templateFile: '.windsurfrules',          destFile: '.windsurfrules',                  selected: true  },
  { value: 'cline',    label: 'Cline',          hint: '.clinerules',                          templateFile: '.clinerules',          destFile: '.clinerules',                          selected: false },
  { value: 'aider',    label: 'Aider',          hint: 'CONVENTIONS.md',                       templateFile: 'CONVENTIONS.md',       destFile: 'CONVENTIONS.md',                       selected: false },
  { value: 'zed',      label: 'Zed',            hint: '.rules',                               templateFile: '.rules',               destFile: '.rules',                               selected: false },
  { value: 'kiro',     label: 'Kiro',            hint: '.kiro/steering/mindlink.md',           templateFile: 'kiro-steering.md',     destFile: '.kiro/steering/mindlink.md',           selected: false },
  { value: 'continue', label: 'Continue.dev',   hint: '.continue/rules/mindlink.md',          templateFile: 'continue-rules.md',    destFile: '.continue/rules/mindlink.md',          selected: false },
  { value: 'trae',     label: 'Trae',           hint: '.trae/rules/mindlink.md',              templateFile: 'trae-rules.md',        destFile: '.trae/rules/mindlink.md',              selected: false },
];
