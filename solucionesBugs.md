# Soluciones a bugs (web-admin)

Resumen de los tres issues de `scripts/issues.json` resueltos, con su causa y arreglo.

## 1. Página en blanco al entrar en la URL de platos

- **Causa:** a `packages/web-admin/src/index.html` le faltaba `<base href="/">` (web-empleados y web-clientes sí lo tienen).
- **Efecto:** al entrar directamente en `/restaurants/rest-2/dishes`, el navegador pedía `/restaurants/rest-2/styles.css` y los bundles con rutas relativas. El servidor devolvía el HTML de la app en vez del JS, y la página quedaba en blanco. Desde el menú funcionaba porque la URL ya estaba cargada.
- **Arreglo:** añadir `<base href="/">` en `index.html`.

## 2. No cargan los datos

- **Causa:** al pasar del restaurante 1 al 2 en el menú lateral, la ruta es la misma y solo cambia `:restaurantId`. Angular reutiliza el componente y no vuelve a ejecutar `ngOnInit`. El `restaurantId` se leía una sola vez con `snapshot`, así que se quedaban los datos del restaurante 1.
- **Arreglo:** los componentes se suscriben a `route.parent.params` con `takeUntilDestroyed` y recargan cuando cambia el restaurante.
- **Alcance:** `dish-list`, `ingredient-list`, `employee-list` y `restaurant-dashboard` (los dos últimos tenían el mismo fallo, aunque el issue no los menciona).
- **Comprobado:** tras el arreglo, el restaurante 2 muestra sus propios datos en ingredientes y platos.

## 3. Accesibilizar el formulario de platos (WCAG 2.2 AA)

Cambios en `dish-form.component.{html,ts,css}` y en `styles.css`:

- **Teclado:** el formulario es un `<form>` real. Los `div` clicables ahora son `<button>` o `<a>`: Guardar (`type="submit"`), Cancelar, Añadir ingrediente y Quitar. Enter envía el formulario y Espacio activa los botones. El orden de tabulación sigue el orden visual.
- **Etiquetas:** cada campo tiene `<label for>` real (antes eran `div` falsos). El título es un `h1`, los ingredientes van en `fieldset`/`legend` y la lista de ingredientes añadidos es una `<ul>`. Los iconos son decorativos (`aria-hidden`) y los botones de icono tienen `aria-label`.
- **Foco visible:** `:focus-visible` global con contorno de 3px. Antes `button { outline: none }` lo quitaba.
- **Errores:** nombre y precio son obligatorios, y el precio debe ser mayor que 0. Al enviar con errores aparece un resumen (`role="alert"`) con enlaces a cada campo, y cada campo tiene su mensaje (`aria-invalid` y `aria-describedby`). El foco pasa al primer campo con error y los errores se actualizan mientras se escribe.
- **Contraste:** se subió el color del placeholder, de los botones de quitar ingrediente y de los errores.
- **Aviso al lector de pantalla:** una región `aria-live` anuncia cuando se añade o quita un ingrediente.
- **Precio:** ahora empieza vacío en vez de en 0, para que «sin rellenar» sea detectable.

## Vídeo

`videos/formulario-platos-teclado.webm` (unos 60 s, con un recuadro que muestra la tecla pulsada):

- Inicio de sesión con Tab y Enter.
- Tab hasta Guardar y Enter con el formulario vacío, que muestra los dos errores.
- Rellenar el nombre y pulsar Enter, que deja solo el error del precio.
- Completar el precio, elegir categoría e ingrediente con las flechas y añadir con Espacio.
- Guardar con Enter, que redirige a la lista.

El foco inicial se coloca por script en el enlace «volver», para no tabular todo el menú lateral.
