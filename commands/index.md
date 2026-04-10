# Brainlink CLI Reference

> Full command reference for the Brainlink CLI.

---

## Commands

| Command | Description |
|---|---|
| [init](init.md) | Set up memory for the current project |
| [status](status.md) | Show last session summary and what's next |
| [sync](sync.md) | Sync shared context between sessions |
| [log](log.md) | View full session history |
| [config](config.md) | Change settings after init |
| [clear](clear.md) | Reset SESSION.md for a fresh session start |
| [reset](reset.md) | Wipe all .brain/ memory back to blank templates |
| [update](update.md) | Update brainlink to the latest version |

## Global Flags

These flags work on every command.

| Flag | Description |
|---|---|
| `--help`, `-h` | Show help for the command |
| `--version`, `-v` | Show the installed version |
| `--no-progress` | Disable progress bars (useful in scripts and CI) |
| `--json` | Output as JSON where supported |
| `--debug` | Show verbose debug output and stack traces |

## Getting Help

```bash
brainlink help
brainlink help <command>
brainlink <command> --help
```

All three forms show the same help for a command.
