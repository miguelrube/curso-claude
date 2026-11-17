---
name: plan-feature
description: Genera un plan de implementación en markdown para una feature, siguiendo TDD y la arquitectura por capas del proyecto. Úsala cuando el usuario pida planificar una feature, issue o cambio antes de implementarlo
argument-hint: <num_issue> [descripción de la feature]
---

# Plan de feature

Genera un plan de implementación en la carpeta `plans` a partir de la plantilla `assets/plantilla-plan.md` de esta skill

Argumentos del usuario: $ARGUMENTS

## Pasos

1. **Obtén los datos de entrada**
   - El número de issue es obligatorio. Si no viene en los argumentos, pregúntalo con `AskUserQuestion`
   - Si la descripción de la feature es ambigua o falta, pide aclaración antes de seguir

2. **Investiga el código**
   - Lee `CLAUDE.md` y los ficheros relevantes de `src` para entender la arquitectura actual
   - Si la feature toca paginación, lee `docs/api/api-pagination.md`
   - Identifica qué capas se ven afectadas (controllers, services, repositories) y qué tests existen

3. **Lee la plantilla** `assets/plantilla-plan.md` y úsala como base. Respeta su estructura, el orden de las secciones y su formato. No añadas ni quites secciones

4. **Rellena el plan**
   - **Metadatos**: issue, título, fecha de hoy, estado (`Borrador`) y autor
   - **Objetivo y alcance**: qué se consigue, qué entra y qué queda fuera explícitamente
   - **Contexto**: estado actual del código, ficheros implicados y restricciones relevantes
   - **Tareas**: lista con checkboxes (`- [ ]`) siguiendo las reglas de abajo
   - **Criterios de aceptación**: lista con checkboxes (`- [ ]`) verificables que indican cuándo el plan está terminado
   - **Dudas abiertas**: preguntas que no puedes resolver tú, para que el usuario las conteste
   - **Decisiones tomadas**: decisiones que has tomado por tu cuenta, con su motivo, para que el usuario pueda corregirlas

5. **Guarda el plan** en `plans/<num_issue>-<breve_descripcion>.md`
   - `breve_descripcion` va en minúsculas, en kebab-case, sin tildes ni caracteres especiales y con 2-5 palabras (ejemplo: `plans/42-filtro-por-categoria.md`)
   - Crea la carpeta `plans` si no existe
   - Si el fichero ya existe, no lo sobrescribas sin preguntar

6. **Resume al usuario** la ruta del plan, las dudas abiertas y las decisiones tomadas más importantes. No implementes nada del plan

## Reglas para las tareas

- Cada tarea debe poder completarse en 5-10 minutos. Si es más grande, divídela
- Cada tarea incluye los tests del TDD y el código mínimo para que pasen. Descríbela con este orden: test que falla (red), código para pasarlo (green) y refactor si procede
- Indica en cada tarea los ficheros que se tocan y la capa a la que pertenecen
- Ordena las tareas de forma que el proyecto quede funcionando al terminar cada una
- Sigue la arquitectura por capas (controllers, services, repositories) y SQL a mano con `better-sqlite3`, sin ORMs
- Respeta las convenciones del proyecto: funciones en snake_case, mensajes y logs en español
- Antes de crear tests con supertest, comprueba si hace falta separar la creación de `app` del `listen` y, si es así, hazlo la primera tarea

## Reglas generales

- Todo el plan va en español
- No uses "." salvo cuando sea necesario
- No inventes datos: si algo no se puede deducir del código o de la petición, va a dudas abiertas
