---
name: monitor-hidraulico-la-vuelta
description: Trabajar sobre el Monitor Hidráulico y Eléctrico de La Vuelta (repo monitor-infra) — la app que sabe, para cada bebedero y cada potrero del campo, si tiene agua y energía, siguiendo la cañería real con sus llaves y sus cotas. Usar SIEMPRE que Pedro mencione "el monitor", "la app del agua", "bebederos sin agua", "llaves", "tanques", "cotas", "el motor", "propagación", "conexiones pendientes", "el croquis", "unir los sistemas", "el trazado", "Cerro Sur", "Casa Norte", "Lorentz", o pida agregar/arreglar algo en index.html, subir de versión, correr escenarios de apertura y cierre, revisar un export, o sacar números de la red para un informe. También usar si sube un export JSON del monitor o un KMZ del relevamiento aunque no diga qué hacer con él.
---

# Monitor Hidráulico y Eléctrico — La Vuelta

## Qué es

Una PWA de un solo archivo (`index.html`, ~200 KB) que modela la red de agua y
de electricidad del campo de Rivera y responde la pregunta que importa: **si
cierro esta llave, ¿quién se queda sin agua?**. Funciona entera sin conexión; el
estado vive en `localStorage` del dispositivo.

Repo: `pedrolanfranco-collab/monitor-infra`. Archivos que importan:

| Archivo | Qué es |
|---|---|
| `index.html` | La app completa: estilos, HTML y JS en un archivo. Incluye el seed de fábrica embebido en base64. |
| `sw.js` | Service worker. Nombra la caché leyendo la versión del `index.html`. |
| `manifest.json`, `icons/` | Instalación como app. |
| `herramientas/*.js` | Scripts de Node para analizar y transformar los datos fuera de la app. |
| `docs/` | Informes generados para terceros. |

## El modelo de datos

El estado es `S = { elems, conns, hist }`:

- **`elems`**: diccionario `id → elemento`. Cada uno tiene `type`, `name`,
  `sistema` (1-4), `on` (abierta/cerrada, encendida/apagada), `cota` (metros
  sobre el nivel del mar), `geom` (Point o Polygon) y, en los distribuidores,
  `outlets` (salidas individuales que se abren y cierran por separado).
- **`conns`**: lista de `{from, to, net}` con `net` en `'agua' | 'elec' | 'both'`.
- **`hist`**: log de operaciones.

Los tipos están en la tabla `T` del `index.html` (buscar `var T={`). Lo que
define el comportamiento de cada tipo son dos banderas:

- **`src: true`** — es una fuente (tanque, bomba solar, energizador). La
  propagación arranca de acá.
- **`valve: true`** — corta el flujo cuando está en `off`. Las llaves, las bombas
  y también los tanques y energizadores.

Los tipos sin `valve` (postes, bebederos, `sin_clasificar` que son uniones y
pasos de zanja) **dejan pasar el agua**. Que `sin_clasificar` estuviera fuera de
`T` fue un bug: los accesorios no se dibujaban.

`JUNC` lista los tipos que son distribuidores con salidas individuales.

## El motor: `calcStates()`

Es el corazón. Devuelve dos conjuntos, `energized` y `watered`. Cómo funciona,
que no es obvio:

1. **Energía**: un BFS desde todos los energizadores encendidos por aristas
   `elec`.
2. **Agua**: **un BFS por cada tanque encendido, por separado**, y cada recorrido
   lleva su propio techo de cota — la cota de *ese* tanque. Esto es lo importante:
   un techo global le daría agua a un punto alto que en realidad cuelga sólo de un
   tanque bajo. El agua no sube más alto que la fuente de la que viene.
3. Una llave cerrada **recibe** agua pero no la pasa (`reached.add()` y corta).
   Eso permite mostrar "el agua llega hasta acá".
4. En un distribuidor con `outlets`, cada vecino se mapea a una salida; si esa
   salida está cerrada, no pasa.
5. **Un potrero tiene agua si adentro de su polígono hay un bebedero con agua**
   (`ptInPoly`, ray casting). Este es el punto donde el monitor se toca con la app
   de hacienda por potrero.

Si tocás el motor, **no lo reimplementes para probarlo**: `herramientas/probar_motor.js`
extrae la función real del HTML y la corre en Node. Una reimplementación coincide
con lo que uno cree que hace el código, no con lo que hace.

## Las dos causas de un bebedero seco

Es la distinción más útil de la app, porque se arreglan de maneras
completamente distintas:

- **Sin agua por llave cerrada** → `alcanzablesDesdeTanques()` dice que el
  bebedero *sí* llega a un tanque ignorando el estado de las llaves, así que lo
  que falta es una maniobra. `llaveCulpable()` hace un BFS desde el bebedero y
  devuelve **la primera llave cerrada que encuentra**, para poder nombrarla.
- **Sin caño hasta ningún tanque** → no es alcanzable ni con todo abierto. Lo que
  falta es cañería, no maniobra. Se resuelve en Configuración → Conexiones
  pendientes.

## Cómo está la red hoy (relevamiento cerrado)

81 puntos, 58 tramos de cañería dibujados, cotas de 166 a 197,2 m.

| Sistema | Elementos |
|---|---|
| Tanque Cerro Sur | 35 |
| Tanque Casa Norte | 16 (bomba eléctrica) |
| Tanque Cerro Norte | 8 (bomba solar Lorentz) |
| Tanque Casa Sur | 1 |
| Sin conectar a ningún tanque | 21 |

Por tipo: 31 llaves de agua, 21 bebederos, 11 uniones/accesorios, 6 llaves T,
4 tanques, 4 distribuidores T, 1 bomba eléctrica, 1 bomba solar, 1 llave cruz.

El trazado propuesto para completar la red son **23 tramos, ~2.621 m**, y el
tramo determinante es la **unión del sistema del Cerro con el de la Casa: 279 m**.
Todo eso está calculado en `herramientas/croquis_datos.json`
(`elementos`, `conexiones`, `propuestas`), que es la fuente cómoda para sacar
números sin abrir la app:

```bash
python3 -c "
import json, collections
d = json.load(open('herramientas/croquis_datos.json'))
print(collections.Counter(e['tipo'] for e in d['elementos']))
print('metros propuestos:', sum(p['metros'] for p in d['propuestas']))"
```

## Las herramientas

Todas se corren con `node herramientas/<script>.js`. Varias tienen la ruta al
JSON de datos apuntando a la PC de Pedro (`C:/Users/Pedro/...`); pasá el archivo
por argumento o ajustá la constante.

| Script | Para qué |
|---|---|
| `revisar_export.js` | **Correlo siempre primero** sobre un export nuevo, antes de confiar en él. |
| `probar_motor.js` | Corre el `calcStates()` real contra un archivo de datos. `--sin <tanque>` apaga uno. |
| `escenarios.js` / `escenarios_lote.js` | Abre y cierra llaves y muestra a quién le corta el agua. La prueba de que cada llave de bebedero corta sólo el suyo. |
| `poner_cotas.js` | Agrega la altimetría a todos los puntos de un export. |
| `proponer_trazado.js` | Propone cañería para los elementos sueltos: en cada paso une el más cercano a lo ya conectado. Escribe `croquis_datos.json`. |
| `armar_croquis.js` | Genera un HTML con el trazado propuesto para que Pedro lo apruebe o lo corrija. |
| `simular_union.js` | Simula un caño que hoy no existe, sobre una copia en memoria, para ver qué cambiaría. |
| `refrescar_seed.js` | Reescribe el seed embebido en `index.html` con los datos reales. |

## Trampas que ya costaron caro

**Un export puede ser el seed de fábrica y no los datos reales.** Pasó el
16/9/2026: se había abierto la app en otro navegador, y `localStorage` no se
comparte entre navegadores. La señal es *100 elementos / 14 conexiones / 0
historial*. Por eso existe `revisar_export.js`. Corrélo antes de sacar cualquier
conclusión.

**Nunca mezcles fuentes de cotas.** Los KML de Pedro difieren hasta 9 m entre sí
sobre un desnivel total de 30 m. Eso alcanza para invertir el signo de la
diferencia tanque-bebedero y hacer que el motor mienta. Una sola fuente para
todas las cotas, siempre. Y ojo: lo que manda hidráulicamente es **la altura del
pelo de agua**, no la cota del terreno que devuelve una API de elevación; por eso
`poner_cotas.js` suma la altura del tanque sobre el suelo.

**Los acentos se rompen fácil** al reescribir el seed embebido (va en base64).
`refrescar_seed.js` ya lo contempla; si tocás eso, verificá que "Cañería" y
"Válvula" sigan bien después.

## Subir de versión

Cada cambio sube el número, y **el número vive en un solo lugar**: el
`<div class="sub">` del encabezado, con el formato exacto
`MONITOR HIDRÁULICO Y ELÉCTRICO · v61.4`. El service worker lo lee de ahí con una
expresión regular para nombrar su caché. Si cambiás ese texto, actualizá también
`FALLBACK_CACHE` en `sw.js`.

Ojo con el decimal: la regex es `(v[\d.]+)` justamente porque con `(v\d+)` un
salto de v61.0 a v61.1 reusaba la misma caché y el celular seguía viendo la
versión vieja.

Claves de `localStorage`, por si hay que depurar: `mhe_v1` (el estado),
`mhe_user_seed` (seed propio del dispositivo), `mhe_pin`, `mhe_last_export`,
`mhe_map_lock`.

## Cuando el pedido es un informe

Si lo que Pedro quiere es un documento para mandarle a un tercero (un proveedor
de sensores, un técnico, el Plan Agropecuario), los números de la red salen de
`croquis_datos.json` como se muestra arriba, y el formato lo cubre la skill
`informes-pdf-livianos`. Ya hay uno hecho en
`docs/Informe_sensor_tanque_La_Vuelta.pdf` que sirve de modelo: explica primero
el problema del campo en lenguaje llano, después las funcionalidades, después los
números, y recién al final el pedido concreto.
