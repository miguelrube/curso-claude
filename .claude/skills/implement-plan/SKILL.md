---
name: implement-plan
description: Implementa un plan de la carpeta plans aplicando TDD estricto, tarea a tarea, con una rama propia y un commit por tarea. Úsala cuando el usuario pase un plan para implementarlo
argument-hint: <ruta_del_plan>
---

# Implementar un plan

Implementa el plan indicado por el usuario, tarea a tarea, con TDD estricto

Argumentos del usuario: $ARGUMENTS

## Pasos

1. **Lee el plan**
   - La ruta viene en los argumentos (por ejemplo `plans/0-login-registro-jwt.md`). Si no viene, pregúntala con `AskUserQuestion`
   - Lee `CLAUDE.md` y el plan completo: tareas, criterios de aceptación, dudas abiertas y decisiones tomadas
   - Si las dudas abiertas tienen respuesta del usuario, esas respuestas mandan sobre lo que dicen las tareas. Si una respuesta contradice una tarea, ajusta la tarea al implementarla y anótalo en el plan
   - Si hay dudas abiertas sin responder que bloquean la implementación, pregunta antes de seguir

2. **Prepara la rama**
   - El nombre de la rama viene en el plan. Si no aparece de forma explícita, pregúntalo con `AskUserQuestion`
   - Comprueba que el árbol de trabajo está limpio salvo ficheros sin seguimiento ajenos al plan. Si hay cambios sin commitear que puedan mezclarse, avisa al usuario
   - Comprueba si existe la rama `development` con `git branch --list development`
   - Si no existe, créala a partir de `main` o, si no existe `main`, de `master`
   - Crea la rama del plan a partir de `development` y cámbiate a ella. Si ya existe, pregunta antes de reutilizarla
   - No hagas `git push`

3. **Implementa las tareas de una en una, en orden.** Para cada tarea aplica este ciclo sin saltarte ningún paso

   1. **Red**: escribe primero el test descrito en la tarea
   2. Ejecútalo y comprueba que **falla por la razón esperada** (aserción o función inexistente, no un error de sintaxis o de configuración del test). Si pasa sin código nuevo, el test no vale: corrígelo
   3. **Green**: escribe el código mínimo para que el test pase
   4. Ejecútalo de nuevo y comprueba que pasa
   5. **Refactor** si la tarea lo indica o hace falta, y ejecuta **toda** la suite para comprobar que no has roto nada
   6. Marca la tarea en el plan cambiando `- [ ]` por `- [x]`
   7. Haz un commit con la skill `commit` que incluya los tests, el código y el plan actualizado. Un commit por tarea, nunca varias tareas juntas. **No pidas confirmación al usuario** del mensaje: salta el paso de confirmación con `AskUserQuestion` de `commit` y ejecuta el `git commit` directamente

   Si una tarea falla y no consigues resolverla, para y explica el problema al usuario. No marques la tarea ni hagas el commit

4. **Comprueba los criterios de aceptación** cuando todas las tareas estén hechas
   - Verifica cada criterio de verdad (ejecuta la suite completa, revisa el código, prueba el endpoint si hace falta), no los marques por inercia
   - Marca con `- [x]` los que se cumplan. Los que no se cumplan se dejan sin marcar y se explican al usuario
   - Cambia el estado del plan en los metadatos a `Implementado` si se cumplen todos
   - Haz un commit final `docs` con el plan actualizado, también sin pedir confirmación

5. **Resume al usuario**: rama creada, tareas completadas, criterios cumplidos o no, y cualquier desviación respecto al plan. No hagas `git push` ni abras PR salvo que te lo pidan

## Reglas

- TDD estricto: nunca escribas código de producción sin un test rojo previo que lo exija
- Un cambio de código de producción sin test que lo cubra no entra en el commit
- Ejecuta los tests con el comando del proyecto (mira `package.json`; los tests usan `node --test`). Si `npm test` sigue siendo un placeholder, actualízalo la primera vez que haga falta y menciónalo en el commit
- Respeta la arquitectura por capas (controllers, services, repositories), SQL a mano con `better-sqlite3` sin ORMs, funciones en snake_case y mensajes y logs en español
- Cada commit deja el proyecto funcionando y con todos los tests en verde
- No `git add -A` a ciegas: añade solo los ficheros de la tarea y el plan. Nunca `data/` ni ficheros con secretos
- No hagas nada fuera del alcance del plan
- No uses "." salvo cuando sea necesario
