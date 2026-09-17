/* Simula unir los sistemas con un caño que hoy NO está dibujado, para ver qué
   cambiaría. No modifica nada: trabaja sobre una copia en memoria.
   Uso: node herramientas/simular_union.js [datos.json] */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const T = {
  energizador:{net:'elec',src:true,valve:true}, llave_elec:{net:'elec',valve:true},
  bomba:{net:'elec',valve:true}, poste_t:{net:'elec'}, poste_x:{net:'elec'},
  bomba_solar:{net:'agua',src:true,valve:true}, tanque:{net:'agua',src:true,valve:true},
  llave_agua:{net:'agua',valve:true}, llave_t:{net:'agua',valve:true},
  llave_x:{net:'agua',valve:true}, distribuidor_t:{net:'agua',valve:true},
  distribuidor_x:{net:'agua',valve:true}, bebedero:{net:'agua'}, potrero:{net:'both'},
  sin_clasificar:{net:'agua'},
};
const JUNC = ['distribuidor_t','distribuidor_x','llave_t','llave_x'];

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const ex = n => { const i = HTML.indexOf('function ' + n + '('); let d = 0;
  for (let k = HTML.indexOf('{', i); k < HTML.length; k++) {
    if (HTML[k] === '{') d++; else if (HTML[k] === '}') { d--; if (!d) return HTML.slice(i, k + 1); } } };
const MOTOR = ex('calcStates') + '\n' + ex('ptInPoly');

const ORIGEN = JSON.parse(fs.readFileSync(
  process.argv[2] || 'C:/Users/Pedro/Downloads/monitor_infra_CON_COTAS.json', 'utf8'));

const porNombre = n => Object.values(ORIGEN.elems).find(e => e.name === n);

function correr(unir, apagar) {
  const S = JSON.parse(JSON.stringify(ORIGEN));
  (unir || []).forEach(([a, b]) => S.conns.push({ id: 'sim' + Math.random(), from: a, to: b, net: 'agua' }));
  (apagar || []).forEach(id => { if (S.elems[id]) S.elems[id].on = false; });
  const ctx = { S, T, JUNC, console }; vm.createContext(ctx);
  vm.runInContext(MOTOR + '\nglobalThis.__r=calcStates();', ctx);
  const beb = Object.values(S.elems).filter(e => e.type === 'bebedero');
  return {
    conAgua: new Set(beb.filter(b => ctx.__r.watered.has(b.id)).map(b => b.name)),
    total: beb.length,
    potreros: Object.values(S.elems).filter(e => e.type === 'potrero' && ctx.__r.watered.has(e.id)).length,
  };
}

const base = correr();
console.log('HOY (sistemas separados)');
console.log('  bebederos con agua:', base.conAgua.size, 'de', base.total, '| potreros:', base.potreros);

function probar(titulo, unir, apagar) {
  const r = correr(unir, apagar);
  const ganan = [...r.conAgua].filter(n => !base.conAgua.has(n));
  const pierden = [...base.conAgua].filter(n => !r.conAgua.has(n));
  console.log('\n' + titulo);
  console.log('  bebederos con agua:', r.conAgua.size, '(' + (r.conAgua.size >= base.conAgua.size ? '+' : '') + (r.conAgua.size - base.conAgua.size) + ')',
              '| potreros:', r.potreros, '(' + (r.potreros >= base.potreros ? '+' : '') + (r.potreros - base.potreros) + ')');
  if (ganan.length) console.log('  GANAN agua:', ganan.join(', '));
  if (pierden.length) console.log('  PIERDEN agua:', pierden.join(', '));
  if (!ganan.length && !pierden.length) console.log('  sin cambios');
  return r;
}

const cerroN = porNombre('Llave 1 Norte');      // punta de la isla del Cerro Norte
const cerroS = porNombre('Tanque Cerro Sur');
const tCerro = porNombre('T');                   // el "T" de la isla del Cerro Sur (178 m)
const casaN  = porNombre('Llave Bebedero 16');   // punta de la isla de la Casa Norte
const casaSur = porNombre('Tanque Casa Sur');

// El "T" correcto es el de la isla del Cerro Sur: hay tres elementos llamados "T"
const adj = {}; Object.keys(ORIGEN.elems).forEach(i => adj[i] = []);
ORIGEN.conns.forEach(c => { adj[c.from].push(c.to); adj[c.to].push(c.from); });
const tCerroSur = Object.values(ORIGEN.elems).filter(e => e.name === 'T')
  .find(e => { const q = [e.id], v = new Set(q);
    while (q.length) { const x = q.shift(); if (ORIGEN.elems[x].name === 'Tanque Cerro Sur') return true;
      adj[x].forEach(y => { if (!v.has(y)) { v.add(y); q.push(y); } }); } return false; });

probar('A) Unir las dos salidas del tanque del Cerro (están a 2 m)',
  [[cerroN.id, cerroS.id]]);

probar('B) Unir Cerro Sur con la Casa (caño de 279 m que no está dibujado)',
  [[tCerroSur.id, casaN.id]]);

probar('C) Las dos uniones a la vez',
  [[cerroN.id, cerroS.id], [tCerroSur.id, casaN.id]]);

probar('D) Todo unido, y se cierran los dos tanques del Cerro\n   (la Casa, a 190 m, tendría que abastecer sola)',
  [[cerroN.id, cerroS.id], [tCerroSur.id, casaN.id]],
  Object.values(ORIGEN.elems).filter(e => e.type === 'tanque' && /Cerro/.test(e.name)).map(e => e.id));

probar('E) Todo unido, y se cierran los dos tanques de la Casa\n   (el Cerro, a 197,2 m, abastecería solo)',
  [[cerroN.id, cerroS.id], [tCerroSur.id, casaN.id]],
  Object.values(ORIGEN.elems).filter(e => e.type === 'tanque' && /Casa/.test(e.name)).map(e => e.id));
