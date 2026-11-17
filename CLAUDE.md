# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Resttek: plataforma de gestión de restaurantes. Monorepo con **npm workspaces** (`packages/*`, Node 22+): una API (`api`, Express 5 + TypeScript + SQLite) y tres apps Angular 21 (`web-admin` :4200, `web-empleados` :4201, `web-clientes` :4202) más la librería `web-shared`. Documentación en español en `docs/` (arquitectura y dominio) y `README.md`; léela antes de cambios grandes.

## Comandos

Todo se lanza desde la raíz (un único `npm install` instala todo):

```bash
npm install
npm run seed            # puebla SQLite (INSERT OR IGNORE, es idempotente)
npm run dev:api         # API en :3000 (tsx watch)
npm run dev:admin       # :4200
npm run dev:empleados   # :4201
npm run dev:clientes    # :4202
npm test                # solo tests de la API (Vitest)
```

Un solo test (desde `packages/api`): `npx vitest run src/services/order.service.test.ts` o `npx vitest run -t "nombre del test"`. Modo watch: `npm run test:watch` dentro de `packages/api`.

No hay lint configurado ni tests de frontend. `supertest` está instalado pero no se usa: no hay tests HTTP.

Los frontends hacen proxy de `/api` a `http://localhost:3000` mediante `proxy.conf.json` (script `start` = `ng serve --proxy-config proxy.conf.json`). La API lee `PORT` (por defecto 3000), útil si el 3000 está ocupado; en ese caso hay que pasar al `ng serve` un proxy que apunte al nuevo puerto.

Credenciales de prueba tras `seed`: la contraseña es el propio email (`admin@resttek.com`, `gerente1@resttek.com`, `cocinero1@resttek.com`, `camarero1@resttek.com`, `cliente1@resttek.com`…; lista completa en el README). `GET /health` (sin prefijo `/api/v1`) devuelve `{status:"ok"}`.

## Arquitectura de la API (`packages/api`)

Conviven **dos estilos**; identifica cuál aplica antes de tocar código:

- **Hexagonal + DDD solo para `employee`** (`src/contexts/employee/{domain,application,infrastructure}`): entidad `Employee` con constructor privado + `Employee.create()`, value objects `Email` y `Role`, casos de uso con `execute()` (`LoginUseCase`, `CreateEmployeeUseCase`, `RegisterClientUseCase`), interfaces con prefijo `I`. El cableado de dependencias está en `infrastructure/http/dependencies.ts`. `contexts/shared` contiene `Email`, los middlewares (`authenticate`, `authorize(roles)`) y el `errorHandler`.
- **Por capas para `restaurant`, `dish`, `ingredient`, `order`**: `models/` (interfaces planas + `normalizeX()`), `repositories/` (interfaz sin prefijo `I` + implementación Sqlite en el mismo fichero), `services/` (lógica y validación), `controllers/`, `routes/`. La composición de dependencias (repo → service → controller) se hace dentro del propio fichero de rutas. Routers bajo `/restaurants/:restaurantId/...` necesitan `Router({ mergeParams: true })`.

Detalles que sorprenden:
- Todas las rutas cuelgan de `/api/v1`; los repositorios traducen `snake_case`→`camelCase` con alias en el SQL.
- **Errores:** `AppError` → errores en `errors/DomainErrors.ts`. El `errorHandler` decide el HTTP por el *nombre* de la clase (404 solo para los `*NotFoundError` listados, 401 `InvalidCredentialsError`, 400 el resto de `AppError`, 500 lo demás). `OrderNotFoundError` no está en la lista de 404, y `OrderController` es el único que no usa `next(error)` sino su propio try/catch (por eso `GET /orders/:id` da 404 y el `PATCH` de estado da 400).
- Las rutas de pedidos no usan `authorize()`: basta un JWT válido. Los ingredientes son más restrictivos que los platos (solo `admin` escribe).
- Al crear un pedido, un ítem con `quantity: 3` se guarda como 3 filas con `quantity: 1` (estado por unidad).
- **Path aliases** (`@config`, `@errors`, `@shared`, `@employee`, `@models`, `@repositories`, `@services`, `@controllers`, `@routes`, `@scripts`) en `tsconfig.json`; los imports llevan extensión `.js` (ESM, `module: nodenext`). Si añades un alias nuevo, el tests lo resuelven con `vite-tsconfig-paths`.
- **BD:** la clase `Database` (`config/database.ts`) envuelve `sqlite3` con promesas; las tablas se crean al iniciar (`CREATE TABLE IF NOT EXISTS`). Usa `:memory:` si `NODE_ENV=test`; en otro caso `packages/api/resttek.db`.
- Los tests unitarios conviven con el código y usan dobles en `mocks/` (`contexts/employee/application/mocks/`, `repositories/mocks/`).

## Arquitectura de los frontends

Angular 21: standalone components, signals, **zoneless** (sin zone.js), guards/interceptors funcionales, iconos con `lucide-angular`. RxJS solo para HTTP.

- `web-admin` y `web-empleados`: features con `pages/ services/ store/ models/`. Patrón **Store**: servicio `providedIn: 'root'` con signals privadas expuestas con `asReadonly()` (`loading`/`error`/datos); el service devuelve `Observable` y el store lo convierte con `firstValueFrom`; los componentes solo hablan con el store. `OrderStore` de empleados hace polling cada 30 s (no hay websockets).
- `web-clientes` es distinta: modelos/servicios en `core/`, features como componentes sueltos que usan `.subscribe()` directamente; el único store es `CartStore` (local). El polling de pedidos es con `setInterval` en los componentes.
- `@resttek/web-shared` se consume **desde el fuente** (`main: src/index.ts`, sin build): contiene `AuthService`/`AuthStore` (sesión en localStorage `auth_token`/`auth_user`), `authGuard`, `authInterceptor` (Bearer), `errorInterceptor` (401 → logout + `/login`), componentes login/register, token `API_URL` y `styles/base.css`. Los cambios en `web-shared` requieren reiniciar el dev server del frontend.

## Dominio

Roles: `admin`, `manager`, `camarero`, `cocinero`, `cliente`. Estados de pedido: `pendiente → preparando → listo → entregado`. Categorías de plato: entrante, principal, postre, bebida. Unidades de ingrediente: kg, g, l, ml, unidad. Más detalle en `docs/dominio/`.
