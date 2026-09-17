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
  --propuesta:#c2410c; --ok:#2f7d5a; --no:#9c3b33; --duda:#a06a00;
  --sombra:0 1px 2px rgba(31,46,40,.08);
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  --papel:#141a17; --papel2:#1c2420; --linea:#2e3a34;
  --tinta:#e7e4d9; --tinta2:#a3b0a7; --tinta3:#74817a;
  --s-cerroSur:#5fa9d0; --s-casaNorte:#d2a04a; --s-cerroNorte:#63b98d; --s-casaSur:#d97066;
  --propuesta:#f08a52; --ok:#63b98d; --no:#d97066; --duda:#d2a04a;
  --sombra:0 1px 2px rgba(0,0,0,.4);
}}
:root[data-theme="dark"]{
  --papel:#141a17; --papel2:#1c2420; --linea:#2e3a34;
  --tinta:#e7e4d9; --tinta2:#a3b0a7; --tinta3:#74817a;
  --s-cerroSur:#5fa9d0; --s-casaNorte:#d2a04a; --s-cerroNorte:#63b98d; --s-casaSur:#d97066;
  --propuesta:#f08a52; --ok:#63b98d; --no:#d97066; --duda:#d2a04a;
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

.cols{display:grid;grid-template-columns:1fr;gap:22px}
@media(min-width:900px){.cols{grid-template-columns:1.05fr .95fr;align-items:start}}

.plano{background:var(--papel2);border:1px solid var(--linea);border-radius:3px;overflow:hidden;position:sticky;top:env(safe-area-inset-top,0px)}
.plano svg{display:block;width:100%;height:auto}
.leyenda{display:flex;flex-wrap:wrap;gap:4px 14px;padding:9px 12px;border-top:1px solid var(--linea);font-size:12px;color:var(--tinta2)}
.leyenda span{display:flex;align-items:center;gap:5px}
.sw{width:15px;height:3px;border-radius:2px;flex:none}
.sw.d{background:none;border-top:3px dashed var(--propuesta)}

.grupo{margin-bottom:6px}
.fila{border:1px solid var(--linea);border-left:3px solid var(--propuesta);border-radius:3px;
  background:var(--papel2);padding:9px 11px;margin-bottom:7px;cursor:pointer;box-shadow:var(--sombra)}
.fila:hover{border-color:var(--tinta3)}
.fila.sel{outline:2px solid var(--propuesta);outline-offset:1px}
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

.tot{position:sticky;bottom:0;background:var(--papel);border-top:2px solid var(--linea);
  padding:12px 0 calc(12px + env(safe-area-inset-bottom,0px));margin-top:16px}
.cifras{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:8px}
.cifra b{font-family:"Barlow Condensed",sans-serif;font-size:26px;font-weight:700;display:block;line-height:1}
.resumen{background:var(--papel2);border:1px solid var(--linea);border-radius:3px;padding:11px 13px;
  font-size:13.5px;white-space:pre-wrap;max-height:220px;overflow:auto}
.nota{font-size:13px;color:var(--tinta2);margin-top:9px}
.pt{font-family:"Barlow Condensed",sans-serif;font-size:9.5px;fill:var(--tinta3)}
</style>

<div class="wrap">
  <h1>Croquis de la red de agua</h1>
  <p class="bajada">Los caños que hoy están dibujados dejan la red partida en cuatro sistemas sueltos y 21 puntos sin conexión. Acá abajo hay un trazado propuesto: revisalo, aprobá lo que esté bien y rechazá lo que no. Lo que marques se dibuja en el plano.</p>

  <div class="cols">
    <div>
      <div class="plano">
        <div id="svgbox"></div>
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
    <p class="nota">Cuando termines, pasame lo que dice este resumen y dibujo los caños en la app.</p>
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

function dibujar(){
  const dec = estado;
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Plano de la red de agua">';
  s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="var(--papel2)"/>';
  D.potreros.forEach(p => {
    s += '<polygon points="' + p.c.map(c => X(c[1]).toFixed(1) + ',' + Y(c[0]).toFixed(1)).join(' ') +
         '" fill="none" stroke="var(--linea)" stroke-width="1"/>';
  });
  D.conexiones.forEach(c => {
    const a = porId[c.de], b = porId[c.a]; if (!a || !b) return;
    s += '<line x1="' + X(a.lon).toFixed(1) + '" y1="' + Y(a.lat).toFixed(1) +
         '" x2="' + X(b.lon).toFixed(1) + '" y2="' + Y(b.lat).toFixed(1) +
         '" stroke="' + (COLOR[a.sistema] || 'var(--tinta3)') + '" stroke-width="2.4" stroke-linecap="round"/>';
  });
  D.propuestas.forEach((p, i) => {
    const a = porId[p.de], b = porId[p.a]; if (!a || !b) return;
    const d = dec[i];
    if (d === 'no') return;
    const col = d === 'si' ? 'var(--ok)' : 'var(--propuesta)';
    s += '<line x1="' + X(a.lon).toFixed(1) + '" y1="' + Y(a.lat).toFixed(1) +
         '" x2="' + X(b.lon).toFixed(1) + '" y2="' + Y(b.lat).toFixed(1) +
         '" stroke="' + col + '" stroke-width="' + (i === sel ? 4.5 : 2.6) + '"' +
         (d === 'si' ? '' : ' stroke-dasharray="7 5"') + ' stroke-linecap="round"/>';
  });
  D.elementos.forEach(e => {
    const r = e.tipo === 'tanque' ? 6 : e.tipo === 'bebedero' ? 4 : 2.6;
    const f = e.tipo === 'tanque' ? (COLOR[e.sistema] || 'var(--tinta2)')
            : e.suelto ? 'var(--propuesta)' : (COLOR[e.sistema] || 'var(--tinta3)');
    s += '<circle cx="' + X(e.lon).toFixed(1) + '" cy="' + Y(e.lat).toFixed(1) + '" r="' + r +
         '" fill="' + f + '" stroke="var(--papel2)" stroke-width="1"/>';
  });
  D.elementos.filter(e => e.tipo === 'tanque').forEach(e => {
    s += '<text class="pt" x="' + (X(e.lon) + 9).toFixed(1) + '" y="' + (Y(e.lat) + 3).toFixed(1) + '">' +
         e.nombre.replace('Tanque ', '') + ' · ' + e.cota + ' m</text>';
  });
  s += '</svg>';
  document.getElementById('svgbox').innerHTML = s;
}

/* --- propuestas dudosas: vale la pena que las mire dos veces --- */
function duda(p){
  if (p.metros === 0 && p.deNombre === p.aNombre) return 'Son dos elementos con el mismo nombre en el mismo lugar: probablemente haya que borrar uno, no conectarlos.';
  if (p.metros > 300) return 'Tirada larga (' + p.metros + ' m). La elegí por cercanía, no porque sepa que el caño va por ahí.';
  return null;
}

const estado = {};
let sel = null;

function render(){
  ['sistema','suelto'].forEach(tipo => {
    const cont = document.getElementById('g-' + tipo);
    cont.innerHTML = '';
    D.propuestas.forEach((p, i) => {
      if (p.tipo !== tipo) return;
      const d = estado[i], av = duda(p);
      const div = document.createElement('div');
      div.className = 'fila' + (d ? ' ' + d : (av ? ' duda' : '')) + (sel === i ? ' sel' : '');
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
        sel = sel === i ? null : i; render(); dibujar();
      });
      cont.appendChild(div);
    });
  });
  document.querySelectorAll('.acc button').forEach(b => b.addEventListener('click', ev => {
    const i = +b.dataset.i, v = b.dataset.v;
    estado[i] = estado[i] === v ? undefined : v;
    if (estado[i] === undefined) delete estado[i];
    sel = i; render(); dibujar();
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
</script>`;

const salida = process.argv[2] || path.join(__dirname, 'croquis.html');
fs.writeFileSync(salida, HTML.replace('__DATOS__', JSON.stringify(datos)));
console.log('Croquis:', salida, '(' + Math.round(fs.statSync(salida).size / 1024) + ' KB)');
