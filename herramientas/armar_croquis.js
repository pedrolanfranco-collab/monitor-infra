/* Genera el croquis interactivo (HTML) para que Pedro apruebe o corrija el
   trazado propuesto. Uso: node herramientas/armar_croquis.js [salida.html] */
const fs = require('fs');
const path = require('path');

const DATOS = 'C:/Users/Pedro/Downloads/monitor_infra_CON_COTAS.json';
const ORIGEN = JSON.parse(fs.readFileSync(DATOS, 'utf8'));
const CROQUIS = JSON.parse(fs.readFileSync(path.join(__dirname, 'croquis_datos.json'), 'utf8'));
const E = ORIGEN.elems;

/* potreros simplificados, sólo como referencia visual */
const potreros = Object.values(E)
  .filter(e => e.geom && e.geom.type === 'Polygon' && e.geom.coords && e.geom.coords.length > 2)
  .map(e => ({ n: e.name, c: e.geom.coords.filter((_, i) => i % 2 === 0 || i === e.geom.coords.length - 1) }));

const datos = {
  elementos: CROQUIS.elementos,
  conexiones: CROQUIS.conexiones,
  propuestas: CROQUIS.propuestas.map(p => ({
    ...p,
    deNombre: E[p.de].name, aNombre: E[p.a].name,
    deTipo: E[p.de].type, aTipo: E[p.a].type,
  })),
  potreros,
};

const HTML = `<title>Croquis de la red de agua</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&family=Bitter:wght@400;600&display=swap">
<style>
:root{
  --papel:#f4f1e9; --papel2:#eae5d9; --linea:#d6cfbe;
  --tinta:#1f2e28; --tinta2:#5c6b63; --tinta3:#8b968e;
  --s-cerroSur:#1f6f97; --s-casaNorte:#946420; --s-cerroNorte:#2f7d5a; --s-casaSur:#9c3b33;
  --propuesta:#c2410c; --ok:#2f7d5a; --no:#9c3b33; --duda:#a06a00; --foco:#7c2d91;
  --sombra:0 1px 2px rgba(31,46,40,.08);
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  --papel:#141a17; --papel2:#1c2420; --linea:#2e3a34;
  --tinta:#e7e4d9; --tinta2:#a3b0a7; --tinta3:#74817a;
  --s-cerroSur:#5fa9d0; --s-casaNorte:#d2a04a; --s-cerroNorte:#63b98d; --s-casaSur:#d97066;
  --propuesta:#f08a52; --ok:#63b98d; --no:#d97066; --duda:#d2a04a; --foco:#e07bf0;
  --sombra:0 1px 2px rgba(0,0,0,.4);
}}
:root[data-theme="dark"]{
  --papel:#141a17; --papel2:#1c2420; --linea:#2e3a34;
  --tinta:#e7e4d9; --tinta2:#a3b0a7; --tinta3:#74817a;
  --s-cerroSur:#5fa9d0; --s-casaNorte:#d2a04a; --s-cerroNorte:#63b98d; --s-casaSur:#d97066;
  --propuesta:#f08a52; --ok:#63b98d; --no:#d97066; --duda:#d2a04a; --foco:#e07bf0;
  --sombra:0 1px 2px rgba(0,0,0,.4);
}
*{box-sizing:border-box}
body{margin:0;background:var(--papel);color:var(--tinta);
  font-family:Bitter,Georgia,serif;font-size:15px;line-height:1.55}
.wrap{max-width:1180px;margin:0 auto;padding:0 16px;padding-block:28px}
h1,h2,h3,.lbl{font-family:"Barlow Condensed",Arial Narrow,sans-serif}
h1{font-size:34px;font-weight:700;letter-spacing:.4px;margin:0 0 4px;text-wrap:balance}
.bajada{color:var(--tinta2);margin:0 0 22px;max-width:62ch}
h2{font-size:21px;font-weight:600;letter-spacing:.5px;margin:26px 0 10px;
  padding-bottom:5px;border-bottom:1px solid var(--linea)}
.lbl{text-transform:uppercase;letter-spacing:1.1px;font-size:11px;color:var(--tinta3);font-weight:600}
.num{font-variant-numeric:tabular-nums}

.cols{display:block}
/* En pantalla angosta el plano viaja pegado arriba mientras se recorre la
   lista. En ancha, la columna se estira hasta la altura de la lista y el
   plano queda pegajoso dentro: sin ese estirón no tiene recorrido y se va
   con el scroll apenas pasás su altura. */
.colmapa{position:sticky;top:env(safe-area-inset-top,0px);z-index:3;
  background:var(--papel);padding-bottom:8px;margin-bottom:14px}
.plano{background:var(--papel2);border:1px solid var(--linea);border-radius:3px;overflow:hidden}
.lienzo{position:relative;height:38vh;min-height:230px;touch-action:none;cursor:grab}
@media(min-width:900px){
  .cols{display:grid;grid-template-columns:1.05fr .95fr;gap:22px}
  .colmapa{position:static;padding-bottom:0;margin-bottom:0}
  .plano{position:sticky;top:env(safe-area-inset-top,0px)}
  .lienzo{height:64vh;min-height:420px}
}
.lienzo.arrastrando{cursor:grabbing}
.lienzo #svgbox{position:absolute;inset:0}
.lienzo svg{display:block;width:100%;height:100%}
.zoombar{position:absolute;top:8px;right:8px;display:flex;flex-direction:column;gap:4px;z-index:2}
.zoombar button{width:30px;height:30px;border-radius:3px;border:1px solid var(--linea);
  background:var(--papel);color:var(--tinta);font-family:"Barlow Condensed",sans-serif;
  font-size:17px;font-weight:700;cursor:pointer;line-height:1;box-shadow:var(--sombra)}
.zoombar button:hover{border-color:var(--tinta3)}
.zoombar button:focus-visible{outline:2px solid var(--propuesta);outline-offset:2px}
.zoombar .chico{font-size:10px;letter-spacing:.3px}
.ayuda{position:absolute;left:8px;bottom:8px;z-index:2;font-size:11px;color:var(--tinta3);
  background:var(--papel);border:1px solid var(--linea);border-radius:3px;padding:2px 7px}
.rot{fill:var(--tinta2);font-family:"Barlow Condensed",sans-serif;font-size:11px;
  paint-order:stroke;stroke:var(--papel2);stroke-width:3px;stroke-linejoin:round;
  opacity:0;transition:opacity .15s;pointer-events:none}
svg.cerca .rot{opacity:1}
.rot.suelto{fill:var(--propuesta);font-weight:600}
.rot.enfoco{opacity:1 !important;fill:var(--foco);font-weight:600}
.leyenda{display:flex;flex-wrap:wrap;gap:2px 12px;padding:6px 10px;border-top:1px solid var(--linea);font-size:11px;color:var(--tinta2)}
.leyenda span{display:flex;align-items:center;gap:5px}
.sw{width:15px;height:3px;border-radius:2px;flex:none}
.sw.d{background:none;border-top:3px dashed var(--propuesta)}

.grupo{margin-bottom:6px}
.fila{border:1px solid var(--linea);border-left:3px solid var(--propuesta);border-radius:3px;
  background:var(--papel2);padding:9px 11px;margin-bottom:7px;cursor:pointer;box-shadow:var(--sombra)}
.fila:hover{border-color:var(--tinta3)}
.fila.sel{outline:2px solid var(--propuesta);outline-offset:1px}
.fila.foco{border-color:var(--foco);box-shadow:0 0 0 2px var(--foco) inset}
.fila.si{border-left-color:var(--ok)}
.fila.no{border-left-color:var(--no);opacity:.55}
.fila.duda{border-left-color:var(--duda)}
.ruta{font-weight:600;display:flex;flex-wrap:wrap;gap:4px;align-items:baseline;font-size:14px}
.flecha{color:var(--tinta3)}
.meta{font-size:12.5px;color:var(--tinta2);margin-top:2px}
.aviso{font-size:12.5px;color:var(--duda);margin-top:3px;font-weight:600;font-family:"Barlow Condensed",sans-serif;letter-spacing:.3px}
.acc{display:flex;gap:6px;margin-top:8px}
.acc button{font-family:"Barlow Condensed",sans-serif;font-size:13px;font-weight:600;letter-spacing:.4px;
  padding:3px 12px;border-radius:3px;border:1px solid var(--linea);background:var(--papel);
  color:var(--tinta2);cursor:pointer}
.acc button:hover{border-color:var(--tinta3);color:var(--tinta)}
.acc button.on-si{background:var(--ok);border-color:var(--ok);color:#fff}
.acc button.on-no{background:var(--no);border-color:var(--no);color:#fff}
.acc button:focus-visible{outline:2px solid var(--propuesta);outline-offset:2px}

/* En pantalla chica el resumen NO va fijo: entre el plano pegado arriba y él
   pegado abajo quedaban tres filas visibles. Se lee al final, no mientras
   se decide. */
.tot{background:var(--papel);border-top:2px solid var(--linea);
  padding:12px 0 calc(12px + env(safe-area-inset-bottom,0px));margin-top:16px}
@media(min-width:900px){.tot{position:sticky;bottom:0}}
.cifras{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:8px}
.cifra b{font-family:"Barlow Condensed",sans-serif;font-size:26px;font-weight:700;display:block;line-height:1}
.resumen{background:var(--papel2);border:1px solid var(--linea);border-radius:3px;padding:11px 13px;
  font-size:13.5px;white-space:pre-wrap;max-height:220px;overflow:auto}
.nota{font-size:13px;color:var(--tinta2);margin-top:9px}
.pie{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:9px}
.pie button{font-family:"Barlow Condensed",sans-serif;font-size:13px;font-weight:600;letter-spacing:.4px;
  padding:4px 13px;border-radius:3px;border:1px solid var(--linea);background:var(--papel2);
  color:var(--tinta);cursor:pointer}
.pie button:hover{border-color:var(--tinta3)}
.pie button:focus-visible{outline:2px solid var(--propuesta);outline-offset:2px}
.guardado{font-size:12px;color:var(--tinta3);font-family:"Barlow Condensed",sans-serif;letter-spacing:.4px}
.pt{font-family:"Barlow Condensed",sans-serif;font-size:9.5px;fill:var(--tinta3)}
</style>

<div class="wrap">
  <h1>Croquis de la red de agua</h1>
  <p class="bajada">Los caños que hoy están dibujados dejan la red partida en cuatro sistemas sueltos y 21 puntos sin conexión. Acá abajo hay un trazado propuesto: revisalo, aprobá lo que esté bien y rechazá lo que no. Lo que marques se dibuja en el plano.</p>

  <div class="cols">
    <div class="colmapa">
      <div class="plano">
        <div class="lienzo" id="lienzo">
          <div id="svgbox"></div>
          <div class="zoombar">
            <button id="z-mas" title="Acercar" aria-label="Acercar">+</button>
            <button id="z-menos" title="Alejar" aria-label="Alejar">−</button>
            <button id="z-todo" class="chico" title="Ver todo el campo" aria-label="Ver todo el campo">TODO</button>
          </div>
          <div class="ayuda" id="ayuda">Arrastrá para mover · rueda o pellizco para acercar</div>
        </div>
        <div class="leyenda">
          <span><i class="sw" style="background:var(--s-cerroSur)"></i>Cerro Sur</span>
          <span><i class="sw" style="background:var(--s-cerroNorte)"></i>Cerro Norte</span>
          <span><i class="sw" style="background:var(--s-casaNorte)"></i>Casa Norte</span>
          <span><i class="sw" style="background:var(--s-casaSur)"></i>Casa Sur</span>
          <span><i class="sw d"></i>propuesto</span>
        </div>
      </div>
    </div>

    <div>
      <h2>Unir los sistemas</h2>
      <div class="grupo" id="g-sistema"></div>
      <h2>Puntos sueltos</h2>
      <div class="grupo" id="g-suelto"></div>
    </div>
  </div>

  <div class="tot">
    <div class="cifras">
      <div class="cifra"><b id="n-si" style="color:var(--ok)">0</b><span class="lbl">aprobadas</span></div>
      <div class="cifra"><b id="n-no" style="color:var(--no)">0</b><span class="lbl">rechazadas</span></div>
      <div class="cifra"><b id="n-pend">23</b><span class="lbl">sin decidir</span></div>
    </div>
    <div class="resumen" id="resumen">Todavía no decidiste ninguna.</div>
    <div class="pie">
      <button id="btn-copiar">Copiar resumen</button>
      <button id="btn-limpiar">Empezar de nuevo</button>
      <span class="guardado" id="guardado"></span>
    </div>
    <p class="nota">Podés ir decidiendo de a poco: lo que marcás queda guardado en este navegador y sigue acá cuando vuelvas. Cuando termines, copiá el resumen y pasámelo.</p>
  </div>
</div>

<script>
const D = __DATOS__;
const COLOR = {
  'Tanque Cerro Sur':'var(--s-cerroSur)', 'Tanque Cerro Norte':'var(--s-cerroNorte)',
  'Tanque Casa Norte':'var(--s-casaNorte)', 'Tanque Casa Sur':'var(--s-casaSur)',
};
const porId = {}; D.elementos.forEach(e => porId[e.id] = e);

/* --- proyección a coordenadas de dibujo --- */
const K = Math.cos(-31.4 * Math.PI / 180);
const todos = D.elementos.concat(...D.potreros.map(p => p.c.map(c => ({ lat: c[0], lon: c[1] }))));
const minLat = Math.min(...todos.map(e => e.lat)), maxLat = Math.max(...todos.map(e => e.lat));
const minLon = Math.min(...todos.map(e => e.lon)), maxLon = Math.max(...todos.map(e => e.lon));
const W = 1000, PAD = 26;
const escala = (W - PAD * 2) / ((maxLon - minLon) * K);
const H = Math.round((maxLat - minLat) * escala + PAD * 2);
const X = lon => PAD + (lon - minLon) * K * escala;
const Y = lat => PAD + (maxLat - lat) * escala;

/* --- vista: el viewBox es la ventana que se mueve sobre el plano --- */
let vista = { x: 0, y: 0, w: W, h: H };
const CERCA = W / 3.2;   // a partir de acá se muestran los nombres

function aplicarVista(){
  const svg = document.querySelector('#svgbox svg');
  if (!svg) return;
  svg.setAttribute('viewBox', vista.x.toFixed(1) + ' ' + vista.y.toFixed(1) + ' ' + vista.w.toFixed(1) + ' ' + vista.h.toFixed(1));
  svg.classList.toggle('cerca', vista.w < CERCA);
  const a = document.getElementById('ayuda');
  if (a) a.textContent = vista.w < W - 1
    ? 'Zoom ' + (W / vista.w).toFixed(1) + '× · arrastrá para mover'
    : 'Arrastrá para mover · rueda o pellizco para acercar';
}

function verTodo(){ vista = { x: 0, y: 0, w: W, h: H }; dibujar(); }

function acercar(f, cx, cy){
  const nw = Math.min(W, Math.max(W / 40, vista.w * f));
  const k = nw / vista.w;
  if (cx === undefined) { cx = vista.x + vista.w / 2; cy = vista.y + vista.h / 2; }
  vista = { x: cx - (cx - vista.x) * k, y: cy - (cy - vista.y) * k, w: nw, h: vista.h * k };
  dibujar();
}

/* encuadra un tramo propuesto, con aire alrededor */
function enfocar(i){
  const p = D.propuestas[i]; if (!p) return;
  const a = porId[p.de], b = porId[p.a]; if (!a || !b) return;
  const x1 = X(a.lon), y1 = Y(a.lat), x2 = X(b.lon), y2 = Y(b.lat);
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  const w = Math.max(Math.abs(x2 - x1) * 3, Math.abs(y2 - y1) * 3 * W / H, W / 6);
  vista = { x: cx - w / 2, y: cy - (w * H / W) / 2, w: w, h: w * H / W };
  dibujar();
}

function dibujar(){
  const dec = estado;
  /* Los tamanos van en unidades del dibujo, asi que al acercarse crecerian.
     Escalarlos por k los deja constantes en pantalla a cualquier zoom. */
  const k = vista.w / W;
  let s = '<svg viewBox="' + vista.x + ' ' + vista.y + ' ' + vista.w + ' ' + vista.h +
          '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Plano de la red de agua">';
  s += '<rect x="-2000" y="-2000" width="6000" height="6000" fill="var(--papel2)"/>';
  D.potreros.forEach(p => {
    s += '<polygon points="' + p.c.map(c => X(c[1]).toFixed(1) + ',' + Y(c[0]).toFixed(1)).join(' ') +
         '" fill="none" stroke="var(--linea)" stroke-width="' + (1*k).toFixed(2) + '"/>';
  });
  D.conexiones.forEach(c => {
    const a = porId[c.de], b = porId[c.a]; if (!a || !b) return;
    s += '<line x1="' + X(a.lon).toFixed(1) + '" y1="' + Y(a.lat).toFixed(1) +
         '" x2="' + X(b.lon).toFixed(1) + '" y2="' + Y(b.lat).toFixed(1) +
         '" stroke="' + (COLOR[a.sistema] || 'var(--tinta3)') + '" stroke-width="' + (2.4*k).toFixed(2) + '" stroke-linecap="round"/>';
  });
  D.propuestas.forEach((p, i) => {
    const a = porId[p.de], b = porId[p.a]; if (!a || !b) return;
    const d = dec[i];
    if (d === 'no') return;
    const col = i === foco ? 'var(--foco)' : (d === 'si' ? 'var(--ok)' : 'var(--propuesta)');
    s += '<line x1="' + X(a.lon).toFixed(1) + '" y1="' + Y(a.lat).toFixed(1) +
         '" x2="' + X(b.lon).toFixed(1) + '" y2="' + Y(b.lat).toFixed(1) +
         '" stroke="' + col + '" stroke-width="' + ((i === foco ? 5.5 : i === sel ? 4.5 : 2.6)*k).toFixed(2) + '"' +
         (d === 'si' ? '' : ' stroke-dasharray="' + (7*k).toFixed(2) + ' ' + (5*k).toFixed(2) + '"') + ' stroke-linecap="round"/>';
  });
  const extremos = foco === null ? new Set()
    : new Set([D.propuestas[foco].de, D.propuestas[foco].a]);
  D.elementos.forEach(e => {
    if (extremos.has(e.id)) {
      s += '<circle cx="' + X(e.lon).toFixed(1) + '" cy="' + Y(e.lat).toFixed(1) +
           '" r="' + (11 * k).toFixed(2) + '" fill="none" stroke="var(--foco)" stroke-width="' +
           (2 * k).toFixed(2) + '" opacity=".85"/>';
    }
    const r = (extremos.has(e.id) ? 7 : e.tipo === 'tanque' ? 6 : e.tipo === 'bebedero' ? 4 : 2.6) * k;
    const f = extremos.has(e.id) ? 'var(--foco)'
            : e.tipo === 'tanque' ? (COLOR[e.sistema] || 'var(--tinta2)')
            : e.suelto ? 'var(--propuesta)' : (COLOR[e.sistema] || 'var(--tinta3)');
    s += '<circle cx="' + X(e.lon).toFixed(1) + '" cy="' + Y(e.lat).toFixed(1) + '" r="' + r.toFixed(2) +
         '" fill="' + f + '" stroke="var(--papel2)" stroke-width="' + (1*k).toFixed(2) + '"/>';
  });
  /* nombres: los tanques siempre; el resto al acercar */
  D.elementos.forEach(e => {
    const esTanque = e.tipo === 'tanque';
    const txt = esTanque ? e.nombre.replace('Tanque ', '') + ' · ' + e.cota + ' m' : e.nombre;
    s += '<text class="' + (esTanque ? 'pt' : 'rot' + (e.suelto ? ' suelto' : '')) +
         (extremos.has(e.id) ? ' rot enfoco' : '') + '" x="' +
         (X(e.lon) + 7*k).toFixed(1) + '" y="' + (Y(e.lat) + 3.5*k).toFixed(1) +
         '" font-size="' + ((esTanque ? 9.5 : 11) * k).toFixed(2) + '" stroke-width="' + (3*k).toFixed(2) + '">' +
         txt.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>';
  });
  s += '</svg>';
  document.getElementById('svgbox').innerHTML = s;
  aplicarVista();
}

/* --- arrastrar, rueda y pellizco --- */
function instalarGestos(){
  const box = document.getElementById('lienzo');
  const aPlano = ev => {
    const r = box.getBoundingClientRect();
    const esc = Math.max(vista.w / r.width, vista.h / r.height);   // por el letterboxing
    return {
      x: vista.x + vista.w / 2 + (ev.clientX - (r.left + r.width / 2)) * esc,
      y: vista.y + vista.h / 2 + (ev.clientY - (r.top + r.height / 2)) * esc,
      esc,
    };
  };
  let arr = null, pellizco = null;

  box.addEventListener('pointerdown', ev => {
    if (ev.target.closest('.zoombar')) return;
    box.setPointerCapture(ev.pointerId);
    arr = { id: ev.pointerId, px: ev.clientX, py: ev.clientY, vx: vista.x, vy: vista.y };
    box.classList.add('arrastrando');
  });
  box.addEventListener('pointermove', ev => {
    if (!arr || ev.pointerId !== arr.id || pellizco) return;
    const r = box.getBoundingClientRect();
    const esc = Math.max(vista.w / r.width, vista.h / r.height);
    vista.x = arr.vx - (ev.clientX - arr.px) * esc;
    vista.y = arr.vy - (ev.clientY - arr.py) * esc;
    aplicarVista();
  });
  const soltar = ev => { if (arr && ev.pointerId === arr.id) { arr = null; box.classList.remove('arrastrando'); } };
  box.addEventListener('pointerup', soltar);
  box.addEventListener('pointercancel', soltar);

  box.addEventListener('wheel', ev => {
    ev.preventDefault();
    const p = aPlano(ev);
    acercar(ev.deltaY > 0 ? 1.18 : 1 / 1.18, p.x, p.y);
  }, { passive: false });

  /* pellizco con dos dedos */
  const dedos = new Map();
  box.addEventListener('pointerdown', ev => { dedos.set(ev.pointerId, ev); });
  box.addEventListener('pointermove', ev => {
    if (!dedos.has(ev.pointerId)) return;
    dedos.set(ev.pointerId, ev);
    if (dedos.size !== 2) return;
    arr = null;
    const [a, b] = [...dedos.values()];
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (pellizco) {
      const p = aPlano({ clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 });
      acercar(pellizco / d, p.x, p.y);
    }
    pellizco = d;
  });
  const quitar = ev => { dedos.delete(ev.pointerId); if (dedos.size < 2) pellizco = null; };
  box.addEventListener('pointerup', quitar);
  box.addEventListener('pointercancel', quitar);

  document.getElementById('z-mas').addEventListener('click', () => acercar(1 / 1.5));
  document.getElementById('z-menos').addEventListener('click', () => acercar(1.5));
  document.getElementById('z-todo').addEventListener('click', verTodo);
}

/* --- propuestas dudosas: vale la pena que las mire dos veces --- */
function duda(p){
  if (p.metros === 0 && p.deNombre === p.aNombre) return 'Son dos elementos con el mismo nombre en el mismo lugar: probablemente haya que borrar uno, no conectarlos.';
  if (p.metros > 300) return 'Tirada larga (' + p.metros + ' m). La elegí por cercanía, no porque sepa que el caño va por ahí.';
  return null;
}

/* Las decisiones quedan guardadas en este navegador, para poder decidir de a
   poco y volver otro día. Puede fallar (ventana privada, datos del sitio
   borrados), asi que todo va envuelto y la pagina funciona igual sin esto. */
const CLAVE = 'croquis_red_agua_v1';
let estado = {};
try {
  const g = localStorage.getItem(CLAVE);
  if (g) estado = JSON.parse(g) || {};
} catch (e) { estado = {}; }

function guardar(){
  try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) {}
  const n = Object.keys(estado).length;
  const el = document.getElementById('guardado');
  if (el) el.textContent = n ? 'Guardado · ' + n + ' de ' + D.propuestas.length + ' decididas' : '';
}

let sel = null;
let foco = null;   // fila sobre la que esta el puntero

function render(){
  ['sistema','suelto'].forEach(tipo => {
    const cont = document.getElementById('g-' + tipo);
    cont.innerHTML = '';
    D.propuestas.forEach((p, i) => {
      if (p.tipo !== tipo) return;
      const d = estado[i], av = duda(p);
      const div = document.createElement('div');
      div.className = 'fila' + (d ? ' ' + d : (av ? ' duda' : '')) + (sel === i ? ' sel' : '') + (foco === i ? ' foco' : '');
      div.innerHTML =
        '<div class="ruta">' + p.deNombre + ' <span class="flecha">→</span> ' + p.aNombre + '</div>' +
        '<div class="meta num">' + p.metros + ' m · ' + p.deTipo.replace(/_/g,' ') + ' → ' + p.aTipo.replace(/_/g,' ') + '</div>' +
        (av ? '<div class="aviso">⚠ ' + av + '</div>' : '') +
        '<div class="acc">' +
          '<button data-i="' + i + '" data-v="si" class="' + (d === 'si' ? 'on-si' : '') + '">✓ Está bien</button>' +
          '<button data-i="' + i + '" data-v="no" class="' + (d === 'no' ? 'on-no' : '') + '">✗ No va</button>' +
        '</div>';
      div.addEventListener('click', ev => {
        if (ev.target.tagName === 'BUTTON') return;
        sel = sel === i ? null : i; render(); dibujar(); if (sel !== null) enfocar(sel);
      });
      /* Resaltar al pasar por encima: se toca la clase de la fila a mano en vez
         de re-renderizar, porque render() borra el nodo que tiene el puntero. */
      div.addEventListener('pointerenter', () => {
        foco = i; div.classList.add('foco'); dibujar();
      });
      div.addEventListener('pointerleave', () => {
        if (foco !== i) return;
        foco = null; div.classList.remove('foco'); dibujar();
      });
      cont.appendChild(div);
    });
  });
  document.querySelectorAll('.acc button').forEach(b => b.addEventListener('click', ev => {
    const i = +b.dataset.i, v = b.dataset.v;
    estado[i] = estado[i] === v ? undefined : v;
    if (estado[i] === undefined) delete estado[i];
    guardar();
    sel = i; render(); dibujar(); enfocar(i);
  }));
  contar();
}

function contar(){
  const si = [], no = [];
  D.propuestas.forEach((p, i) => {
    if (estado[i] === 'si') si.push(p);
    if (estado[i] === 'no') no.push(p);
  });
  document.getElementById('n-si').textContent = si.length;
  document.getElementById('n-no').textContent = no.length;
  document.getElementById('n-pend').textContent = D.propuestas.length - si.length - no.length;
  const r = document.getElementById('resumen');
  if (!si.length && !no.length) { r.textContent = 'Todavía no decidiste ninguna.'; return; }
  let t = '';
  if (si.length) t += 'CONECTAR:\\n' + si.map(p => '  ' + p.deNombre + ' → ' + p.aNombre + '  (' + p.metros + ' m)').join('\\n');
  if (no.length) t += (t ? '\\n\\n' : '') + 'NO CONECTAR:\\n' + no.map(p => '  ' + p.deNombre + ' → ' + p.aNombre).join('\\n');
  r.textContent = t;
}

render();
dibujar();
instalarGestos();
guardar();

document.getElementById('btn-copiar').addEventListener('click', async () => {
  const t = document.getElementById('resumen').textContent;
  const b = document.getElementById('btn-copiar');
  try {
    await navigator.clipboard.writeText(t);
    b.textContent = 'Copiado';
  } catch (e) {
    /* sin permiso de portapapeles: se selecciona para copiar a mano */
    const r = document.createRange();
    r.selectNodeContents(document.getElementById('resumen'));
    const sn = getSelection(); sn.removeAllRanges(); sn.addRange(r);
    b.textContent = 'Seleccionado — copiá con Ctrl+C';
  }
  setTimeout(() => { b.textContent = 'Copiar resumen'; }, 2600);
});

document.getElementById('btn-limpiar').addEventListener('click', () => {
  if (!Object.keys(estado).length) return;
  if (!confirm('Se borran las ' + Object.keys(estado).length + ' decisiones tomadas. ¿Seguro?')) return;
  estado = {};
  guardar(); sel = null; render(); dibujar(); verTodo();
});
</script>`;

const salida = process.argv[2] || path.join(__dirname, 'croquis.html');
fs.writeFileSync(salida, HTML.replace('__DATOS__', JSON.stringify(datos)));
console.log('Croquis:', salida, '(' + Math.round(fs.statSync(salida).size / 1024) + ' KB)');
