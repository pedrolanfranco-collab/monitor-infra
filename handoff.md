# Monitor Hidráulico — handoff

Resumen para pegar al arrancar un chat nuevo. Última actualización: **17/9/2026**.
El detalle del *cómo* está en la skill `monitor-hidraulico`; acá está el *dónde
quedó*.

---

## Estado

**v61.5**, todo pusheado a `origin/main` y publicado.

| | |
|---|---|
| Repo | `C:\Users\Pedro\repos\monitor-infra` → `pedrolanfranco-collab/monitor-infra` |
| App para el celular | `https://pedrolanfranco-collab.github.io/monitor-infra/` |
| Copia que abre Pedro | `file://` sobre `OneDrive\A Registros PEDRO LANFRANCO CRESPO\Aplicacion de agua y electricidad\index.html`, en **Brave** |
| Datos buenos | `Downloads\monitor_infra_CON_COTAS.json` — 116 elementos, 58 conexiones, 300 de historial, 81 cotas |
| Croquis para aprobar trazados | `https://claude.ai/artifact/UDeCqyxJi4s7MWtVSnAi4i` |

**Antes de confiar en cualquier export**: `node herramientas/revisar_export.js <archivo>`.
El 16/9 un export resultó ser el seed de fábrica porque la app se había abierto
en Chrome, y el `localStorage` no se comparte entre navegadores. La señal es
**100 elementos / 14 conexiones / 0 historial**.

---

## Cómo está armada la red

**Dos tanques físicos, cuatro salidas, cuatro sistemas.** Cada tanque tiene dos
salidas y cada salida es un sistema. Se pueden unir abriendo las llaves de paso.

| Elemento | Sistema | Cota | Sostiene |
|---|---|---|---|
| Tanque Cerro Norte | 1 | 197,2 m | 2 bebederos |
| Tanque Cerro Sur | 2 | 197,2 m | **11 bebederos** |
| Tanque Casa Sur | 3 | 190,0 m | **ninguno** — sin caños dibujados |
| Tanque Casa Norte | 4 | 190,0 m | 5 bebederos |

Las cotas incluyen la columna de agua (Cerro +1,2 m, Casa +1,0 m) sobre el
terreno (196 y 189 m).

---

## Lo que se hizo (12 commits desde v60.6)

- **v61.0** — Las 81 cotas cargadas y **gravedad por fuente**: el motor recorre
  la red una vez por tanque, cada uno limitado por su propia cota. Antes usaba
  un techo global que le daba agua a un punto alto colgado de un tanque bajo.
  Seed refrescado (tenía 100/14 contra 116/58) y decodificado como UTF-8
  (`atob()` a secas rompía los acentos). `sw.js` toma la versión con decimal.
- **v61.1** — Panel **"🧩 Conexiones pendientes"** y los 11 `sin_clasificar`
  pasan a dibujarse en el mapa (eran las uniones que hay que conectar, y no se
  veían).
- **v61.3** — El mapa queda encerrado en los límites del campo (`setMaxBounds`,
  mismo criterio que las apps de potreros) y un candado 🔒 trabado por defecto.
  "Respaldo de datos" pasa a ser la primera sección de Configuración.
- **v61.4** — Aviso **"🐄 Bebederos sin agua"**, separando **llave cerrada**
  (nombra la llave responsable) de **falta de caño**.
- **v61.5** — **Válvulas de retención en un solo sentido.** Tipo
  `valvula_retencion` con `salidaHacia`. La que existe sale hacia
  `Llave Corte 15`; está en serie y es el único camino a 7 bebederos.
- **Herramientas** en `herramientas/`: `revisar_export`, `poner_cotas`,
  `probar_motor`, `refrescar_seed`, `escenarios`, `simular_union`,
  `probar_retencion`, `proponer_trazado`, `armar_croquis`.

---

## Lo que falta

**1. Completar el diseño de caños — es el bloqueo principal.**
21 puntos no llegan a ningún tanque, el **sistema 3 (Casa Sur) no tiene ninguna
conexión dibujada**, y los 14 elementos de unión/paso tienen 0 conexiones.
Pedro dijo: *"el diseño de caños no se completó del todo"*.

Hay 23 propuestas esperando su revisión en el croquis. Las decisiones **se
guardan solas en su navegador**, así que puede ir de a poco; cuando tenga una
tanda, copia el resumen y lo pasa. Tres marcadas como dudosas:
- Los cuatro `Paso Zanja Caño` están a 0 m entre sí: hay que **borrar tres**, no
  conectarlos.
- Tres tiradas largas elegidas sólo por cercanía: `Bebedero 8` (528 m),
  `Psso Caño Zanja` (338 m), `Bebedero 7 9` (336 m).
- La unión Cerro ↔ Casa de 279 m — la más valiosa y la que menos se sabe.

**Por qué importa unirlos**: hoy, si se corta el Cerro quedan **5** de 18
bebederos con agua; unidos quedarían **16**.

**2. Tres anomalías de llaves, a verificar en el campo.**
- `Llave B 101` no corta nada; el corte real de B 101 es `Llave (2)`.
- `Bebedero 16 - Calle` no tiene una llave que lo corte solo.
- `Llave sur` y `Llave Norte` cortan exactamente los mismos 5 bebederos, y
  además existe una `Llave Sur` con mayúscula que es otro elemento.

**3. Importar las cotas en Brave**, si Pedro todavía no lo hizo
(`monitor_infra_CON_COTAS.json`). La migración del código no trae las cotas.

**4. Obra futura: caño presurizado desde la bomba eléctrica.**
Se va a sacar un caño de la cañería de la bomba eléctrica para unirlo primero
con el Tanque Casa Sur y después con el Casa Norte, dejando el sistema
presurizado. **Implicancia**: el motor hoy usa sólo los tanques como fuente y
aplica un techo de cota. Una bomba **empuja agua por encima de su propia cota**,
así que hay que tratarla como fuente con altura manométrica, o eximirla del
techo. `bomba_solar` ya figura con `src:true` pero el motor no la usa como
origen.

---

## Cosas que no son obvias

- **El `localStorage` no se comparte entre navegadores ni orígenes.** Brave con
  `file://`, Chrome con `file://` y GitHub Pages son tres instalaciones
  distintas. Los datos de Pedro están en **Brave sobre el `file://` de
  OneDrive**. No hay sincronización entre celular y PC.
- **Cerrar un tanque bloquea también el paso a través de él** (`tanque` tiene
  `valve:true`), no sólo su aporte.
- **OpenStreetMap bloquea los tiles al abrir por `file://`** (403). No es un
  problema de datos; el botón "Satelital" usa Esri y anda.
- **La rama `claude/worker-days-registry-l6lh4w`** (v60.7, jornales del
  personal) **no se mergea**: Pedro decidió que no pertenece al monitor. Queda
  en GitHub sin borrar.
- **Al desplegar** hay que copiar `index.html` y `sw.js` **también** a la
  carpeta de OneDrive, y subir la versión en los dos archivos.
- **Git no tiene identidad configurada en este repo**: usar
  `git -c user.name="Pedro Lanfranco" -c user.email="pedro.lanfranco@gmail.com" commit`.
- **Para probar en el navegador**: el puerto 8000 lo ocupa la app de
  contabilidad de Pedro. Usar `PORT=8770 node .claude/servidor.js`.
- **Esta revisión del croquis Pedro la hace en la PC**, no en el celular.

---

## Relación con las apps de potreros

Las dos apps modelan **los mismos objetos físicos por duplicado**: 35 puntos con
el mismo nombre y la misma coordenada, 26 potreros coincidentes, mismas
librerías. Se analizó fusionarlas y **quedó postergado** hasta terminar el
monitor. Decisiones ya tomadas: un solo código que genere varias apps (no una
app única), y las herramientas de configuración sólo en la variante PC.
Estimación de la fusión: ~6–7 sesiones. Plan completo en
`C:\Users\Pedro\.claude\plans\quiero-saber-si-es-reflective-mitten.md`.
