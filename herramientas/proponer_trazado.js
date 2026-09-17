/* Propone un trazado para los elementos que no llegan a ningún tanque.
   Crece la red de a poco: en cada paso conecta el suelto más cercano a lo que
   ya está conectado. Escribe croquis_datos.json para armar el croquis.
   Uso: node herramientas/proponer_trazado.js [datos.json] */
const fs = require('fs');
const path = require('path');

const ORIGEN = JSON.parse(fs.readFileSync(
  process.argv[2] || 'C:/Users/Pedro/Downloads/monitor_infra_CON_COTAS.json', 'utf8'));
const E = ORIGEN.elems;

const adj = {}; Object.keys(E).forEach(i => adj[i] = []);
ORIGEN.conns.forEach(c => { adj[c.from].push(c.to); adj[c.to].push(c.from); });

const m = (a, b) => Math.hypot((a.geom.lat - b.geom.lat) * 111000, (a.geom.lng - b.geom.lng) * 95000);
const puntos = Object.values(E).filter(e => e.geom && e.geom.type === 'Point');

/* qué alcanza hoy el agua, ignorando si las llaves están abiertas */
function alcanzables(extra) {
  const a2 = {}; Object.keys(E).forEach(i => a2[i] = adj[i].slice());
  (extra || []).forEach(([x, y]) => { a2[x].push(y); a2[y].push(x); });
  const q = Object.values(E).filter(e => e.type === 'tanque').map(e => e.id);
  const v = new Set(q);
  while (q.length) { const x = q.shift(); (a2[x] || []).forEach(y => { if (!v.has(y)) { v.add(y); q.push(y); } }); }
  return v;
}

/* islas actuales, para poder nombrar cada sistema */
const vis = new Set(), isla = {}; let n = 0;
Object.keys(E).forEach(i => {
  if (vis.has(i)) return; n++;
  const q = [i]; vis.add(i);
  while (q.length) { const x = q.shift(); isla[x] = n; adj[x].forEach(y => { if (!vis.has(y)) { vis.add(y); q.push(y); } }); }
});
const sistemaDe = {};
Object.values(E).filter(e => e.type === 'tanque').forEach(t => {
  (sistemaDe[isla[t.id]] = sistemaDe[isla[t.id]] || []).push(t.name);
});

/* --- propuestas --- */
const propuestas = [];
const extra = [];

/* 1. unir las salidas del mismo tanque y los dos sistemas grandes */
function porNombre(nm) { return Object.values(E).find(e => e.name === nm); }
const tCerroSur = Object.values(E).filter(e => e.name === 'T').find(e => {
  const q = [e.id], v = new Set(q);
  while (q.length) { const x = q.shift(); if (E[x].name === 'Tanque Cerro Sur') return true;
    adj[x].forEach(y => { if (!v.has(y)) { v.add(y); q.push(y); } }); } return false;
});
[
  ['Unir las dos salidas del tanque del Cerro', porNombre('Llave 1 Norte'), porNombre('Tanque Cerro Sur')],
  ['Unir el sistema del Cerro con el de la Casa', tCerroSur, porNombre('Llave Bebedero 16')],
].forEach(([motivo, a, b]) => {
  if (!a || !b) return;
  propuestas.push({ de: a.id, a: b.id, metros: Math.round(m(a, b)), motivo, tipo: 'sistema' });
  extra.push([a.id, b.id]);
});

/* 2. los sueltos, del más cercano al más lejano */
let alc = alcanzables(extra);
let pendientes = puntos.filter(p => !alc.has(p.id));
let guarda = 0;
while (pendientes.length && guarda++ < 200) {
  let mejor = null;
  pendientes.forEach(p => {
    puntos.forEach(o => {
      if (!alc.has(o.id) || o.type === 'potrero') return;
      const d = m(p, o);
      if (!mejor || d < mejor.d) mejor = { p, o, d };
    });
  });
  if (!mejor) break;
  propuestas.push({
    de: mejor.p.id, a: mejor.o.id, metros: Math.round(mejor.d),
    motivo: `${mejor.p.name} no llega a ningún tanque`, tipo: 'suelto',
  });
  extra.push([mejor.p.id, mejor.o.id]);
  alc = alcanzables(extra);
  pendientes = puntos.filter(p => !alc.has(p.id));
}

const salida = {
  generado: new Date().toISOString().slice(0, 10),
  elementos: puntos.map(e => ({
    id: e.id, nombre: e.name, tipo: e.type, lat: e.geom.lat, lon: e.geom.lng,
    cota: e.cota, sistema: sistemaDe[isla[e.id]] ? sistemaDe[isla[e.id]].join('/') : null,
    suelto: !alcanzables([]).has(e.id),
  })),
  conexiones: ORIGEN.conns.map(c => ({ de: c.from, a: c.to })),
  propuestas,
  quedanSueltos: pendientes.map(p => p.name),
};

const destino = path.join(__dirname, 'croquis_datos.json');
fs.writeFileSync(destino, JSON.stringify(salida));
console.log('Propuestas:', propuestas.length);
propuestas.forEach(p => console.log(`  ${String(p.metros + ' m').padStart(7)}  ${E[p.de].name}  →  ${E[p.a].name}   (${p.motivo})`));
console.log('\nQuedarían sueltos:', salida.quedanSueltos.length ? salida.quedanSueltos.join(', ') : 'ninguno');
console.log('Datos del croquis:', destino);
