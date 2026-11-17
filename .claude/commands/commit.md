---
description: Crea un commit siguiendo la especificación Conventional Commits
argument-hint: [contexto opcional sobre el cambio]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

# Commit con Conventional Commits

## Contexto

- Estado: !`git status --short`
- Cambios en staging: !`git diff --cached`
- Cambios sin stage: !`git diff`
- Últimos commits (para seguir el estilo): !`git log --oneline -10`

Contexto adicional del usuario: $ARGUMENTS

## Tarea

Crea un único commit con los cambios actuales siguiendo la especificación Conventional Commits 1.0.0

### Formato

```
<tipo>(<ámbito opcional>)<!>: <descripción>

[cuerpo opcional]

[footer(s) opcional(es)]
```

### Tipos permitidos

- `feat`: nueva funcionalidad (SemVer MINOR)
- `fix`: corrección de un bug (SemVer PATCH)
- `docs`: cambios solo en documentación
- `style`: formato que no afecta al significado del código
- `refactor`: cambio de código que no corrige un bug ni añade funcionalidad
- `perf`: mejora de rendimiento
- `test`: añadir o corregir tests
- `build`: cambios en el sistema de build o dependencias
- `ci`: cambios en la configuración de CI
- `chore`: tareas de mantenimiento que no tocan src ni tests
- `revert`: revierte un commit anterior

### Reglas

1. La descripción va en español, en imperativo y minúsculas, sin punto final y con un máximo de 72 caracteres en la primera línea
2. El ámbito es opcional y describe la zona afectada (por ejemplo `vendehumos`, `db`, `health`)
3. Cambios incompatibles: añade `!` tras el tipo/ámbito y un footer `BREAKING CHANGE: <explicación>`
4. El cuerpo explica el qué y el porqué, no el cómo, separado por una línea en blanco
5. Si los cambios mezclan varios propósitos, propón dividirlos en commits separados y haz stage solo de los ficheros de cada uno
6. No incluyas ficheros que parezcan secretos (`.env`, credenciales) ni `data/`; avisa si los detectas

### Pasos

1. Analiza los cambios y decide el tipo, el ámbito y la descripción
2. Si no hay nada en staging, haz `git add` de los ficheros relevantes (nunca `git add -A` a ciegas)
3. Muestra el mensaje propuesto y pide que lo confirme antes de ejecutar `git commit`. Debe confirmarlo con la tool `AskUserQuestion. Si da OK, continúa con el siguiente paso, y si no, propón un nuevo mensaje y vuelve a preguntar.
4. Termina el mensaje con la línea de atribución indicada por el sistema, si la hay
5. No hagas `git push`
6. Si hay un hook que falla, corrige el problema y crea un commit nuevo; no uses `--no-verify` ni `--amend`
