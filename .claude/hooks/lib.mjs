// Utilidades compartidas por los hooks PreToolUse (Node, sin dependencias).

export async function readInput() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Texto del comando para herramientas de shell (Bash / PowerShell).
export function shellCommand(input) {
  return String(input.tool_input?.command ?? '');
}

// Rutas que toca una herramienta de ficheros.
export function filePaths(input) {
  const ti = input.tool_input ?? {};
  return [ti.file_path, ti.notebook_path, ti.path, ti.glob, ti.pattern]
    .filter((v) => typeof v === 'string');
}

export function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}
