# Auditoría OWASP Top 10 (2021) - Resttek

Alcance: código fuente de `packages/api`, `packages/web-shared` y los frontends Angular (revisión estática, sin ejecutar exploits). Las rutas son relativas a `packages/api/src/` salvo indicación. No se ha ejecutado `npm audit`; lo dicho sobre dependencias se basa solo en los `package.json`.

---

## A01:2021 - Pérdida de control de acceso

### A01-1. IDOR / acceso entre restaurantes en recursos anidados (CRÍTICA)
- Ficheros: `routes/dish.routes.ts:14-18`, `routes/ingredient.routes.ts:14-18`, `contexts/employee/infrastructure/http/restaurant-employee.routes.ts:7`, `controllers/dish.controller.ts:17,28,37,49,65`, `controllers/ingredient.controller.ts:15,25,34`, `services/dish.service.ts:48-77`, `services/ingredient.service.ts:39-64`.
- Descripción: `authorize()` comprueba solo el rol; nunca se compara `req.params.restaurantId` con `req.user.restaurantId` del JWT. Además `GET/PUT/DELETE /:id` de platos e ingredientes buscan por `id` sin filtrar por restaurante (el `:restaurantId` de la URL se ignora).
- Explotación: un `manager` del restaurante A hace `POST /restaurants/B/dishes`, o `PUT/DELETE /restaurants/A/dishes/<id-de-plato-de-B>` y modifica o borra platos de B. Un `cocinero` lee ingredientes de cualquier restaurante.
- Remedio: middleware que exija `user.role==='admin' || user.restaurantId===req.params.restaurantId`, y repositorios con `WHERE id = ? AND restaurant_id = ?` en lectura, actualización y borrado.

### A01-2. Rutas de pedidos sin `authorize()` ni comprobación de propiedad (CRÍTICA)
- Ficheros: `routes/order.routes.ts:14-18`, `controllers/order.controller.ts:28-41,57-68,70-85`, `services/order.service.ts:57-84`.
- Descripción: basta cualquier JWT válido (incluido el de un `cliente` autoregistrado).
  - `GET /orders/active?restaurantId=X` lista los pedidos activos de cualquier restaurante (con `clientId`, notas, mesa).
  - `GET /orders/:id` devuelve cualquier pedido por su UUID.
  - `PATCH /orders/:orderId/items/:itemId/status` permite a un cliente marcar ítems como `listo`/`entregado` (acción del personal) en pedidos ajenos.
- Explotación: un cliente registrado llama al `PATCH` sobre ítems de otros pedidos para sabotear el servicio, o enumera pedidos activos de la competencia.
- Remedio: `authorize(['admin','manager','camarero','cocinero'])` en `/active` y `PATCH`; verificar que el restaurante del usuario coincide con el del pedido; en `GET /:id` permitir solo al `clientId` propietario o al personal del restaurante.

### A01-3. Datos de contacto del propietario expuestos (BAJA)
- `controllers/restaurant.controller.ts:54-61,80-92`: el endpoint público `GET /public/restaurants` devuelve `email`, `phone`, `ownerFirstName`, `ownerLastName`. Además `routes/restaurant.routes.ts:16` deja a cualquier usuario autenticado (incluido `cliente`) leer cualquier restaurante por id.
- Remedio: DTO público reducido (nombre, dirección, logo).

### A01-4. Alta de empleados sin validar restaurante/rol (BAJA)
- `contexts/employee/infrastructure/http/EmployeeController.ts:14-22` y `contexts/employee/application/CreateEmployeeUseCase.ts:22-40`: solo `admin` puede invocarlo (correcto), pero no se valida que `restaurantId` exista ni la coherencia rol/restaurante. Riesgo de integridad, no de escalada.

### Hechos positivos
- `GET /orders/mine` filtra por `user.id` del token (`controllers/order.controller.ts:43-55`).
- El registro público fuerza el rol `cliente` (`contexts/employee/application/RegisterClientUseCase.ts:46`), sin mass-assignment del rol.

---

## A02:2021 - Fallos criptográficos

### A02-1. Secreto JWT por defecto hardcodeado (CRÍTICA)
- Ficheros: `contexts/shared/infrastructure/http/middlewares.ts:4` y `contexts/employee/infrastructure/BcryptAuthService.ts:5` (`process.env.JWT_SECRET || 'super-secret-resttek-key'`).
- Descripción: si `JWT_SECRET` no está definido (no hay validación al arrancar ni `.env.example`), se usa un secreto público presente en el repositorio. Está duplicado en dos ficheros.
- Explotación: cualquiera que conozca el valor firma `{id, role:'admin'}` y obtiene control total de la API.
- Remedio: abortar el arranque si `JWT_SECRET` falta o es débil (>= 32 bytes aleatorios) fuera de `NODE_ENV=test`; centralizar su lectura.

### A02-2. JWT sin algoritmo fijado, sin `iss/aud` y sin revocación (MEDIA)
- `contexts/employee/infrastructure/BcryptAuthService.ts:18` (HS256 por defecto, 8 h) y `contexts/shared/infrastructure/http/middlewares.ts:25` (`jwt.verify` sin `algorithms`). El rol queda embebido 8 h: un cambio de rol o baja no surte efecto hasta que expire.
- Remedio: `jwt.verify(..., { algorithms: ['HS256'], issuer, audience })`, vida más corta + refresh.

### A02-3. Fichero de base de datos SQLite versionado en git (MEDIA)
- `packages/api/resttek.db` aparece en `git ls-files` aunque `.gitignore` lo lista (el ignore no afecta a ficheros ya añadidos). Contiene hashes bcrypt y datos personales de los usuarios de seed.
- Remedio: dejar de rastrear el fichero con `git rm --cached` (conserva el archivo local) y purgar el histórico si hubiera datos reales. Nota: esta auditoría no ha tocado ese fichero.

### A02-4. Sin forzar HTTPS ni cabeceras HSTS (BAJA)
- `app.ts` / `server.ts:11`: sin `helmet`, sin HSTS. Terminar TLS en un proxy y añadir `helmet()`.

### Hechos positivos
- bcrypt con coste 10 (`contexts/employee/infrastructure/BcryptAuthService.ts:6,9`); aceptable, recomendable >= 12.

---

## A03:2021 - Inyección

### Inyección SQL: sin hallazgos
- Los repositorios revisados (`contexts/employee/infrastructure/SqliteEmployeeRepository.ts`, `repositories/order.repository.ts`, `repositories/dish.repository.ts`) y la capa `Database` (`config/database.ts:48-73`) usan consultas parametrizadas (`?`). Una búsqueda de `${` en `repositories/*.ts` no devolvió interpolación en SQL. `limit/offset` pasan por `parseInt` y se parametrizan (`EmployeeController.ts:38-39`).

### A03-1. Validación de entrada insuficiente (MEDIA)
- `controllers/order.controller.ts:9` y `services/order.service.ts:27-37`: `items`, `quantity`, `dishId`, `notes` no se validan. `quantity` enorme provoca millones de filas (ver A04-2); `quantity` negativa/decimal, `items` ausente (TypeError devuelto en el 400) o `dishId` de otro restaurante o inexistente no se comprueban.
- `contexts/employee/infrastructure/http/AuthController.ts:13-16,28-33` y `EmployeeController.ts:14`: `req.body.*` se pasa sin comprobar tipos.
- XSS: no se encontraron `innerHTML` ni `bypassSecurityTrust*` en `packages/*/src`; Angular escapa por defecto. `logoUrl` se acepta sin validar esquema en la API (`controllers/restaurant.controller.ts:17,72`) y se usa en `<img>` del frontend (`packages/web-admin/src/app/features/restaurants/pages/restaurant-list/restaurant-list.component.html:37`).
- Remedio: esquemas (zod/joi) en el borde HTTP, topes de `quantity`/`items`, validar URLs `http(s)`.

---

## A04:2021 - Diseño inseguro

### A04-1. Sin rate limiting ni protección contra fuerza bruta (ALTA)
- `app.ts:16-17`, `contexts/employee/infrastructure/http/auth.routes.ts:6-7`: no hay limitador ni bloqueo en `/auth/login` y `/auth/register`; `packages/api/package.json` no incluye ninguna librería de este tipo.
- Explotación: fuerza bruta de credenciales, alta masiva de cuentas, spam de pedidos por cualquier cliente.
- Remedio: limitador por IP/cuenta en auth y `POST /orders`; retardo progresivo.

### A04-2. Bucle controlado por el atacante en pedidos, sin transacción (MEDIA)
- `services/order.service.ts:27-37`: un ítem con `quantity: N` genera N inserciones secuenciales (`repositories/order.repository.ts:50-55`) sin tope; un fallo a mitad deja un pedido parcial.
- Remedio: tope de cantidad y transacción SQLite.

### A04-3. Sin política de contraseñas; credenciales previsibles en seed (MEDIA)
- `RegisterClientUseCase.ts:38`, `CreateEmployeeUseCase.ts:28`: sin longitud ni complejidad mínimas.
- `scripts/seed.ts:22,51`: la contraseña es el propio email (`admin@resttek.com`). Documentado como datos de prueba, pero si el seed se ejecuta en un entorno expuesto, el administrador es trivial de adivinar.
- Remedio: mínimo 10 caracteres; el seed debe leer la contraseña de una variable de entorno y negarse a ejecutar en producción.

### A04-4. Enumeración de usuarios (BAJA)
- `RegisterClientUseCase.ts:33-36` responde "Email is already in use". En `LoginUseCase.ts:29-33` el mensaje es genérico (bien), pero si el usuario no existe no se ejecuta bcrypt, por lo que el tiempo de respuesta distingue ambos casos.
- Remedio: comparar contra un hash ficticio cuando no hay usuario.

---

## A05:2021 - Configuración de seguridad incorrecta

### A05-1. CORS abierto a cualquier origen (MEDIA)
- `app.ts:16`: `app.use(cors())` sin opciones (`Access-Control-Allow-Origin: *`). Al usar Bearer (no cookies) el impacto es moderado.
- Remedio: lista blanca de los tres orígenes frontend por entorno.

### A05-2. Sin cabeceras de seguridad (MEDIA)
- `app.ts:14-17`: sin `helmet`; Express anuncia `X-Powered-By`. Remedio: `helmet()` y `app.disable('x-powered-by')`.

### A05-3. Fuga de información en errores (MEDIA)
- `controllers/order.controller.ts:20-21,79-80` devuelve `error.message` crudo con 400; puede incluir mensajes SQLite (p. ej. fallo de clave foránea por `dishId` inexistente) o TypeError internos.
- `contexts/shared/infrastructure/http/errorHandler.ts:25-28` devuelve nombre de clase y mensaje; `DatabaseNotInitializedError` (`errors/DomainErrors.ts:147-151`) es un `AppError` y se respondería como 400 con texto interno. `contexts/employee/domain/value-objects/Role.ts:17` enumera los roles válidos.
- Inconsistencia: `OrderNotFoundError` no está en `NOT_FOUND_ERRORS` (`errorHandler.ts:4-9`) y `OrderController` no usa `next(error)`.
- Remedio: mensajes genéricos al cliente, detalle solo en logs; unificar en `next(error)`.

### A05-4. Configuración de entorno sin documentar (BAJA)
- No existe `.env.example`; `dotenv` está en `packages/api/package.json:15` pero en `server.ts` no se importa, de modo que `JWT_SECRET` solo se leerá si se exporta en el entorno del proceso. La BD se ubica dentro del árbol de código (`config/database.ts:18`).

### Hechos positivos
- `scripts/mcp.json` referencia el token de Slack mediante variables de entorno, sin secretos en claro.
- `.claude/settings.json` está en `.gitignore`.

---

## A06:2021 - Componentes vulnerables y obsoletos

### A06-1. Sin auditoría de dependencias evidenciada (BAJA/MEDIA)
- `packages/api/package.json:11-17`: `bcrypt ^6`, `cors ^2.8`, `express ^5.2`, `jsonwebtoken ^9`, `sqlite3 ^5.1.7` (módulo nativo con cadena transitiva de compilación). No hay evidencia de `npm audit`, Dependabot ni CI. Angular `^21.1.0` / `^21.2.0` con mínimos distintos entre apps.
- No se puede confirmar ninguna CVE concreta sin ejecutar `npm audit` (no ejecutado).
- Remedio: `npm audit --omit=dev` en CI, Dependabot/Renovate, alinear versiones de Angular.

---

## A07:2021 - Fallos de identificación y autenticación

### A07-1. Sin límite de intentos, sin política de contraseñas, sin verificación de email (ALTA)
- `auth.routes.ts:6-7`, `LoginUseCase.ts:28-57`, `RegisterClientUseCase.ts:32-69`. Ver A04-1 y A04-3. El registro devuelve token inmediato sin verificar email (`RegisterClientUseCase.ts:52-56`). No hay MFA para `admin`.

### A07-2. Token en `localStorage` (MEDIA)
- `packages/web-shared/src/lib/auth/auth.store.ts:6,9,18-19`: `auth_token` (JWT de 8 h) y `auth_user` en `localStorage`; cualquier XSS futuro o dependencia comprometida lo roba. No se halló XSS actual (ver A03-1), por eso es media.
- `auth.store.ts:9`: `JSON.parse` sin `try/catch`; un valor corrupto rompe la carga de la app.
- Los guards del frontend dependen de datos de `localStorage` modificables por el usuario: son solo UX; la autorización real debe estar en el backend (y los fallos de A01 la debilitan).
- Remedio: cookie `HttpOnly; Secure; SameSite` o token en memoria con refresh; CSP estricta.

### A07-3. Email sin normalizar (BAJA)
- `contexts/shared/domain/value-objects/Email.ts:15` y `config/database.ts:108`: `A@x.com` y `a@x.com` son cuentas distintas (UNIQUE sensible a mayúsculas). Normalizar a minúsculas.

---

## A08:2021 - Fallos en la integridad de software y datos

### A08-1. Integridad de estados y pedidos (MEDIA)
- `services/order.service.ts:69-84`: no se valida el flujo `pendiente -> preparando -> listo -> entregado`; se puede saltar o retroceder estados. `repositories/order.repository.ts:44-56`: creación sin transacción. Ver A01-2.

### A08-2. Cadena de suministro vía MCP (BAJA)
- `scripts/mcp.json:4-5`: `npx -y @modelcontextprotocol/server-slack` ejecuta la última versión de un paquete sin fijar. Remedio: fijar versión exacta.

### Sin hallazgos adicionales
- No se detectó `eval`, `Function`, `vm` ni deserialización de objetos arbitrarios. No se evaluó CI/firma de artefactos (no hay pipeline en el repo).

---

## A09:2021 - Fallos en el registro y monitorización de seguridad

### A09-1. Sin logging de eventos de seguridad (MEDIA)
- Solo hay `console.log/console.error` de arranque en `server.ts:9,12,15`. No se registran logins fallidos (`LoginUseCase.ts:31-38`), 401/403 (`middlewares.ts:13,20,29,36`), altas de empleados (`CreateEmployeeUseCase.ts:40`), cambios de estado de pedido ni errores 500: `errorHandler.ts:32` no registra nada y `controllers/order.controller.ts:39,53,65,82` descartan la excepción. No hay log de acceso HTTP ni alertas.
- Remedio: logger estructurado (pino) con eventos de autenticación y acceso denegado, sin contraseñas ni tokens; registrar los 500 con stack en servidor.

---

## A10:2021 - Server-Side Request Forgery (SSRF)

Sin hallazgos. La API no realiza peticiones HTTP salientes a URLs aportadas por el usuario (no hay `fetch`/`axios`/`http.request` en `packages/api/src`). `logoUrl` solo se almacena y es el navegador quien la carga. Si el servidor llegara a descargar logos, validar esquema/host y bloquear rangos privados.

---

## Tabla resumen priorizada

| # | Categoría | Hallazgo | Severidad | Ubicación principal |
|---|-----------|----------|-----------|---------------------|
| 1 | A02 | Secreto JWT por defecto hardcodeado | Crítica | `contexts/shared/infrastructure/http/middlewares.ts:4`; `contexts/employee/infrastructure/BcryptAuthService.ts:5` |
| 2 | A01 | IDOR entre restaurantes en platos/ingredientes/empleados | Crítica | `routes/dish.routes.ts:14-18`; `routes/ingredient.routes.ts:14-18`; `services/dish.service.ts:48-77` |
| 3 | A01 | Pedidos sin `authorize()` ni propiedad: lectura y cambio de estado ajenos | Crítica | `routes/order.routes.ts:14-18`; `controllers/order.controller.ts:28-85` |
| 4 | A04/A07 | Sin rate limiting / fuerza bruta en login y registro | Alta | `app.ts:16-17`; `auth.routes.ts:6-7` |
| 5 | A04/A07 | Sin política de contraseñas; seed con contraseña = email | Media-Alta | `RegisterClientUseCase.ts:38`; `scripts/seed.ts:22,51` |
| 6 | A02 | Fichero SQLite versionado en git | Media | `packages/api/resttek.db` |
| 7 | A07/A02 | JWT en `localStorage`, 8 h, sin revocación, `verify` sin `algorithms` | Media | `packages/web-shared/src/lib/auth/auth.store.ts:6-19`; `middlewares.ts:25` |
| 8 | A03/A04 | Validación de entrada ausente; bucle por `quantity` sin tope | Media | `services/order.service.ts:27-37`; `controllers/order.controller.ts:9` |
| 9 | A05 | Fuga de información en errores | Media | `controllers/order.controller.ts:20-21,79-80`; `errorHandler.ts:25-28` |
| 10 | A05 | CORS abierto y sin helmet | Media | `app.ts:16` |
| 11 | A09 | Sin logging de seguridad ni registro de 500 | Media | `errorHandler.ts:32`; `server.ts` |
| 12 | A08 | Estados de pedido sin máquina de estados ni transacciones | Media | `services/order.service.ts:69-84`; `repositories/order.repository.ts:44-56` |
| 13 | A06 | Sin auditoría de dependencias (`npm audit` no ejecutado) | Baja/Media | `packages/api/package.json` |
| 14 | A04/A07 | Enumeración de usuarios y email sin normalizar | Baja | `RegisterClientUseCase.ts:33-36`; `Email.ts:15` |
| 15 | A01 | Datos de contacto del propietario en endpoint público | Baja | `controllers/restaurant.controller.ts:54-61,80-92` |
| 16 | A08 | MCP con `npx -y` sin versión fija | Baja | `scripts/mcp.json:4-5` |
| 17 | A10 | SSRF | Sin hallazgos | - |
| 18 | A03 | Inyección SQL | Sin hallazgos (consultas parametrizadas) | `repositories/*.ts` |
