// Hook PreToolUse: impide borrar/sobrescribir la base de datos SQLite (resttek.db)
// o destruirla con SQL (DROP TABLE/DATABASE, TRUNCATE).
import { readInput, shellCommand, filePaths, deny } from './lib.mjs';

const input = await readInput();
const tool = input.tool_name ?? '';

const DB_FILE = /\.(db|sqlite3?)(-wal|-shm|-journal)?\b|resttek\.db/i;

if (tool === 'Bash' || tool === 'PowerShell') {
  const cmd = shellCommand(input);

  // SQL destructivo, venga de sqlite3, node, tsx, etc.
  if (/\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW)\b|\bTRUNCATE\b/i.test(cmd)) {
    deny('Bloqueado: SQL destructivo (DROP/TRUNCATE) sobre la base de datos. Hazlo tú a mano si es intencionado.');
  }

  // Borrar, mover o vaciar el fichero de la BD.
  const destructive =
    /(^|[\s;&|(])(rm|del|erase|rmdir|rd|unlink|shred|mv|move|truncate|Remove-Item|ri|Move-Item|Clear-Content)\b/i.test(cmd) ||
    /(^|[^>])>\s*\S*\.(db|sqlite3?)\b/i.test(cmd); // redirección que sobrescribe
  if (destructive && DB_FILE.test(cmd)) {
    deny('Bloqueado: no se permite borrar, mover ni sobrescribir la base de datos (resttek.db).');
  }
}

if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') {
  if (filePaths(input).some((p) => DB_FILE.test(p))) {
    deny('Bloqueado: no se permite escribir ni sobrescribir ficheros de base de datos (.db).');
  }
}
