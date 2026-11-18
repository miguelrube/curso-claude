// Hook PreToolUse: impide leer el fichero CONSTANTS.js (Read, Grep, Glob y
// comandos de shell de lectura). Crear o escribir el fichero sigue permitido.
import { readInput, shellCommand, filePaths, deny } from './lib.mjs';

const input = await readInput();
const tool = input.tool_name ?? '';

const TARGET = /(^|[\\/\s'"=:])CONSTANTS\.js\b/i;
const MSG = 'Bloqueado: la lectura de CONSTANTS.js no está permitida en este proyecto.';

if (tool === 'Read' || tool === 'Grep' || tool === 'Glob') {
  if (filePaths(input).some((p) => TARGET.test(p) || /^CONSTANTS\.js$/i.test(p))) deny(MSG);
}

if (tool === 'Bash' || tool === 'PowerShell') {
  const cmd = shellCommand(input);
  const readers =
    /(^|[\s;&|(])(cat|type|more|less|head|tail|sed|awk|grep|egrep|rg|ag|nl|od|xxd|strings|cp|Get-Content|gc|Select-String|sls|Import-Csv|Copy-Item|code|node|bat)\b/i;
  const redirectIn = /<\s*\S*CONSTANTS\.js\b/i;
  if (TARGET.test(cmd) && (readers.test(cmd) || redirectIn.test(cmd))) deny(MSG);
}
