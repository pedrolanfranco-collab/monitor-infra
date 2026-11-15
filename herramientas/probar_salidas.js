/* Prueba la regla de salidas de T y cruces (v61.8) con las funciones REALES de index.html.
   Uso: node herramientas/probar_salidas.js

   Red de juguete:   tanque -- X (T o cruz) -- a (bebedero)
                                  \-- b (bebedero)
   Regla: cada salida se vincula con su caño; si lleva llave y está cerrada,
   corta ese caño en los dos sentidos. Sin configurar, todo funciona como antes.
   Sale con código 1 si algo falla. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extraerFn(nombre) {
  const i = html.indexOf('function ' + nombre + '(');
  if (i < 0) throw new Error('no encontre la funcion ' + nombre);
  let d = 0;
  for (let k = html.indexOf('{', i); k < html.length; k++) {
    if (html[k] === '{') d++;
    else if (html[k] === '}') { d--; if (!d) return html.slice(i, k + 1); }
  }
}
function extraerVar(nombre) {
  const i = html.indexOf('var ' + nombre + '=');
  if (i < 0) throw new Error('no encontre la variable ' + nombre);
  let d = 0;
  for (let k = i; k < html.length; k++) {
    if (html[k] === '{' || html[k] === '[') d++;
    else if (html[k] === '}' || html[k] === ']') d--;
    else if (html[k] === ';' && !d) return html.slice(i, k + 1);
  }
}
const SRC = ['T', 'JUNC', 'COD_DESC'].map(extraerVar).join('\n') + '\n' +
  ['ptInPoly', 'codNorm', 'salidasConfiguradas', 'salidaBloquea', 'codigoSalida', 'salidaCerradaEntre',
    'salidasPorOrden', 'calcStates', 'describirCodigo'].map(extraerFn).join('\n');

function red(tipo, salidas) {
  return {
    elems: {
      tank: { id: 'tank', type: 'tanque', name: 'Tanque', on: true, sistema: 2 },
      x: { id: 'x', type: tipo, name: 'Pieza', cod: tipo === 'llave_x' ? 'XL2-03' : 'TL2-04', on: true, outlets: salidas },
      a: { id: 'a', type: 'bebedero', name: 'A' },
      b: { id: 'b', type: 'bebedero', name: 'B' },
    },
    conns: [{ from: 'tank', to: 'x', net: 'agua' }, { from: 'x', to: 'a', net: 'agua' }, { from: 'b', to: 'x', net: 'agua' }],
  };
}
function ctx(S) {
  const c = vm.createContext({ S, console });
  vm.runInContext(SRC, c);
  return expr => vm.runInContext(expr, c);
}

let fallas = 0;
function ok(cond, msg) { if (cond) console.log('  ok  ', msg); else { fallas++; console.log('  FALLA', msg); } }
const agua = run => id => run('calcStates().watered.has("' + id + '")');

for (const tipo of ['llave_x', 'llave_t', 'distribuidor_t', 'distribuidor_x']) {
  console.log('\n' + tipo);
  const pref = tipo === 'llave_x' ? 'XL2-03' : 'TL2-04';

  // 1. salida libre y salida con llave cerrada
  let run = ctx(red(tipo, [
    { vecinoId: 'tank', tieneLlave: false, open: true },
    { vecinoId: 'a', tieneLlave: false, open: false },   // sin llave: aunque diga cerrada, pasa
    { vecinoId: 'b', tieneLlave: true, open: false },
  ]));
  let con = agua(run);
  ok(run('salidasConfiguradas(S.elems.x)') === true, 'queda configurada al tener salidas con `tieneLlave`');
  ok(con('a') === true, 'salida SIN llave: el agua pasa siempre');
  ok(con('b') === false, 'salida CON llave cerrada: corta su caño');
  ok(run('codigoSalida(S.elems.x,2)') === pref + '-L3' && run('codigoSalida(S.elems.x,1)') === '', 'codigo por salida: ' + pref + '-L3, y la salida libre no lleva');
  ok(run('salidaCerradaEntre(S.elems.x,S.elems.b).name') === pref + '-L3' && run('salidaCerradaEntre(S.elems.b,S.elems.x).name') === pref + '-L3',
    'la llave culpable se nombra por su codigo, mirando el caño desde cualquier punta');
  ok(run('salidaCerradaEntre(S.elems.x,S.elems.a)') === null, 'un caño sin llave cerrada no tiene culpable');

  // 2. reapertura
  ok(run('S.elems.x.outlets[2].open=true;calcStates().watered.has("b")') === true, 'al reabrir vuelve el agua');

  // 3. alimentacion alternativa
  ok(run('S.elems.x.outlets[2].open=false;S.conns.push({from:"a",to:"b",net:"agua"});calcStates().watered.has("b")') === true,
    'con la llave cerrada pero otro caño que llega (a-b): tiene agua');

  // 4. corta en los dos sentidos: llave en la ENTRADA
  run = ctx(red(tipo, [
    { vecinoId: 'tank', tieneLlave: true, open: false },
    { vecinoId: 'a', tieneLlave: false, open: true },
    { vecinoId: 'b', tieneLlave: false, open: true },
  ]));
  con = agua(run);
  ok(con('x') === false && con('a') === false && con('b') === false, 'llave cerrada del lado del tanque: no pasa nada hacia abajo (corta en los dos sentidos)');

  // 5. sin configurar: igual que antes (reparto por orden de caño, corta solo al salir)
  run = ctx(red(tipo, [{ open: true, name: 'Salida 1' }, { open: false, name: 'Salida 2' }, { open: true, name: 'Salida 3' }]));
  con = agua(run);
  ok(run('salidasConfiguradas(S.elems.x)') === false, 'sin `tieneLlave` no esta configurada');
  ok(con('a') === false && con('b') === true, 'sin configurar: la salida 2 es el 2º caño (a), como en el motor viejo');
  ok(JSON.stringify(run('salidasPorOrden(S.elems.x)')) === JSON.stringify({ tank: 0, a: 1, b: 2 }), 'salidasPorOrden da el mismo reparto que usa el motor viejo');
  ok(run('codigoSalida(S.elems.x,1)') === '', 'sin configurar no hay codigo por salida');
  run = ctx(red(tipo, [{ open: false, name: 'Salida 1' }, { open: true }, { open: true }]));
  con = agua(run);
  ok(con('a') === true, 'sin configurar: cerrar la salida de ENTRADA no corta (comportamiento viejo, por eso la regla nueva)');
}

console.log('\ndescripcion del codigo');
const run = ctx(red('llave_x', []));
const d = run('describirCodigo("XL2-03-L3")');
ok(/Llave de la salida 3 de XL2-03/.test(d) && /Cruz con llave/.test(d), d);

console.log(fallas ? '\n' + fallas + ' FALLA(S)' : '\nTodo bien.');
process.exit(fallas ? 1 : 0);
