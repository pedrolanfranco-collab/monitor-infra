/* Corre las funciones REALES de codigos de index.html contra un archivo de datos.
   Uso: node herramientas/probar_codigos.js <datos.json> [--tabla]

   Saca las funciones del HTML en vez de reimplementarlas (mismo criterio que
   probar_motor.js). Verifica: ningun codigo repetido, ninguna pieza sin codigo,
   formato valido, y que una pieza nueva reciba una sugerencia segun su lugar.
   Sale con codigo 1 si algo falla. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

function extraerFn(html, nombre) {
  const i = html.indexOf('function ' + nombre + '(');
  if (i < 0) throw new Error('no encontre la funcion ' + nombre + ' en el HTML');
  let d = 0;
  for (let k = html.indexOf('{', i); k < html.length; k++) {
    if (html[k] === '{') d++;
    else if (html[k] === '}') { d--; if (!d) return html.slice(i, k + 1); }
  }
}
// "var NOMBRE={...};" o "var NOMBRE=10;" -> hasta el ; que cierra (fuera de llaves)
function extraerVar(html, nombre) {
  const i = html.indexOf('var ' + nombre + '=');
  if (i < 0) throw new Error('no encontre la variable ' + nombre + ' en el HTML');
  let d = 0;
  for (let k = i; k < html.length; k++) {
    if (html[k] === '{' || html[k] === '[') d++;
    else if (html[k] === '}' || html[k] === ']') d--;
    else if (html[k] === ';' && !d) return html.slice(i, k + 1);
  }
}

const FUNCS = ['ptInPoly', 'distPtoSeg', 'metrosEntre', 'codNorm', 'codUsados', 'etq', 'codRed',
  'codSistemaDe', 'codPotrerosDe', 'codBebederoDe', 'codConLetra', 'codSerie', 'codNumero',
  'sugerirCodigo', 'proponerCodigos', 'describirCodigo'];
const VARS = ['T', 'COD_LETRA', 'COD_DESC', 'COD_CERCA_ALAMBRADO', 'COD_CERCA_BEBEDERO'];

function contexto(S) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const src = VARS.map(v => extraerVar(html, v)).join('\n') + '\n' + FUNCS.map(f => extraerFn(html, f)).join('\n');
  const ctx = { S, console };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx;
}

const datos = process.argv[2];
if (!datos) { console.error('Uso: node probar_codigos.js <datos.json> [--tabla]'); process.exit(1); }
const S = JSON.parse(fs.readFileSync(datos, 'utf8'));
const ctx = contexto(S);
const run = code => vm.runInContext(code, ctx);

let fallas = 0;
function ok(cond, msg) { if (cond) console.log('  ok  ', msg); else { fallas++; console.log('  FALLA', msg); } }

const E = S.elems;
const piezas = Object.values(E).filter(e => e.type !== 'potrero');
const yaTenian = piezas.filter(e => e.cod).length;
const prop = run('proponerCodigos()');

console.log('Piezas:', piezas.length, '| ya tenian codigo:', yaTenian, '| propuestas:', prop.length);

// 1. todas las piezas quedan con codigo
ok(prop.every(p => p.cod), 'ninguna propuesta vacia');
ok(prop.length + yaTenian === piezas.length, 'toda pieza sin codigo recibe propuesta');

// 2. ningun codigo repetido (propuestos + los que ya estaban)
const todos = prop.map(p => p.cod).concat(piezas.filter(e => e.cod).map(e => e.cod));
const vistos = {}, rep = [];
todos.forEach(c => { const k = c.toLowerCase(); if (vistos[k]) rep.push(c); vistos[k] = 1; });
ok(!rep.length, 'ningun codigo repetido' + (rep.length ? ': ' + rep.join(', ') : ''));

// 3. formato
const FORMATO = /^(L?B) \S.*$|^(L|TL|T|XL|X|U|VR|LE|EN|PT|PX|B|P)\d-\d{2,}$|^TQ\d[b-z]?$|^(BS|BE)\d*$/;
const mal = prop.filter(p => !FORMATO.test(p.cod));
ok(!mal.length, 'formato valido' + (mal.length ? ': ' + mal.map(p => p.cod).join(', ') : ''));

// 4. describirCodigo entiende todo lo que propone
const sinDesc = prop.filter(p => /código propio/.test(run('describirCodigo(' + JSON.stringify(p.cod) + ')')));
ok(!sinDesc.length, 'describirCodigo explica todos los codigos' + (sinDesc.length ? ': ' + sinDesc.map(p => p.cod).join(', ') : ''));

// 5. determinista: dos corridas dan lo mismo
const prop2 = run('proponerCodigos()');
ok(JSON.stringify(prop) === JSON.stringify(prop2), 'la propuesta es la misma en dos corridas');

// 6. no pisa los que ya tienen codigo
ok(prop.every(p => !E[p.id].cod), 'no propone para piezas que ya tienen codigo');

// 7. aplicar la propuesta y pedir codigo para piezas NUEVAS segun el lugar
prop.forEach(p => { E[p.id].cod = p.cod; });
ok(run('proponerCodigos()').length === 0, 'despues de aplicar no queda nada por adjudicar');

const beb = Object.values(E).find(e => e.type === 'bebedero' && e.geom && e.geom.type === 'Point');
if (beb) {
  const nuevoBeb = run('sugerirCodigo(' + JSON.stringify({ id: '', type: 'bebedero', sistema: 1, geom: beb.geom }) + ')');
  ok(nuevoBeb !== beb.cod && nuevoBeb.toLowerCase().indexOf(beb.cod.toLowerCase()) === 0,
    'bebedero nuevo en el lugar de ' + beb.cod + ' -> ' + nuevoBeb + ' (mismo potrero, no repite)');
  const nuevaLl = run('sugerirCodigo(' + JSON.stringify({ id: '', type: 'llave_agua', sistema: 1, geom: beb.geom }) + ')');
  ok(/^LB /.test(nuevaLl) && !vistos[nuevaLl.toLowerCase()], 'llave nueva pegada a ' + beb.cod + ' -> ' + nuevaLl);
}
const tq = Object.values(E).find(e => e.type === 'tanque' && (e.sistema || 1) === 2);
if (tq) {
  const g = { type: 'Point', lat: tq.geom.lat + 0.0003, lng: tq.geom.lng };
  const nuevaT = run('sugerirCodigo(' + JSON.stringify({ id: '', type: 'llave_t', sistema: 1, geom: g }) + ')');
  ok(/^TL\d-\d\d$/.test(nuevaT) && !vistos[nuevaT.toLowerCase()], 'T con llave nueva cerca del tanque del sistema 2 -> ' + nuevaT);
}

if (process.argv.includes('--tabla')) {
  console.log('\nCODIGO                 | TIPO              | NOMBRE VIEJO');
  prop.forEach(p => {
    const e = E[p.id];
    console.log(p.cod.padEnd(22), '|', e.type.padEnd(17), '|', e.name);
  });
}

console.log(fallas ? '\n' + fallas + ' FALLA(S)' : '\nTodo bien.');
process.exit(fallas ? 1 : 0);
