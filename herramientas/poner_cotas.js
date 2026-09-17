/* Trae la altimetria de todos los puntos de un export y se la agrega,
   sin tocar nada mas.
   Uso: node herramientas/poner_cotas.js <entrada.json> <salida.json>

   Una sola fuente para todas las cotas. Mezclar fuentes distintas es peligroso:
   los KML de Pedro difieren hasta 9 m entre si sobre un desnivel total de 30 m,
   y eso puede invertir el signo de la diferencia tanque-bebedero. */
const fs = require('fs');

/* Altura del pelo de agua sobre el suelo, por tanque (dato de Pedro, 16/9/2026).
   Una API de elevacion da la cota del terreno; lo que manda hidraulicamente es
   la altura del agua. */
const COLUMNA_AGUA = {
  'Tanque Cerro Norte': 1.2,
  'Tanque Cerro Sur':   1.2,
  'Tanque Casa Norte':  1.0,
  'Tanque Casa Sur':    1.0,
};

const entrada = process.argv[2], salida = process.argv[3];
if (!entrada || !salida) {
  console.error('Uso: node poner_cotas.js <entrada.json> <salida.json>');
  process.exit(1);
}

(async () => {
  const orig = JSON.parse(fs.readFileSync(entrada, 'utf8'));
  const puntos = Object.values(orig.elems).filter(e => e.geom && e.geom.type === 'Point');
  console.log('Puntos a consultar:', puntos.length);

  const lat = puntos.map(p => p.geom.lat.toFixed(6)).join(',');
  const lon = puntos.map(p => p.geom.lng.toFixed(6)).join(',');
  const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
  if (!r.ok) { console.error('Error del servicio de elevacion:', r.status); process.exit(1); }
  const el = (await r.json()).elevation;
  if (!el || el.length !== puntos.length) { console.error('Respuesta inesperada'); process.exit(1); }

  const nuevo = JSON.parse(JSON.stringify(orig));
  puntos.forEach((p, i) => {
    const extra = COLUMNA_AGUA[p.name] || 0;
    nuevo.elems[p.id].cota = +(el[i] + extra).toFixed(1);
  });

  /* la salida solo puede diferir en `cota` */
  const problemas = [];
  if (JSON.stringify(orig.conns) !== JSON.stringify(nuevo.conns)) problemas.push('cambiaron las conexiones');
  if (JSON.stringify(orig.hist) !== JSON.stringify(nuevo.hist)) problemas.push('cambio el historial');
  Object.keys(orig.elems).forEach(id => {
    const a = orig.elems[id], b = nuevo.elems[id];
    new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => {
      if (k !== 'cota' && JSON.stringify(a[k]) !== JSON.stringify(b[k]))
        problemas.push(`elemento ${id}: cambio ${k}`);
    });
  });

  if (problemas.length) { console.error('FALLA:\n  ' + problemas.slice(0, 10).join('\n  ')); process.exit(1); }

  fs.writeFileSync(salida, JSON.stringify(nuevo, null, 2));
  const v = puntos.map((p, i) => el[i]);
  console.log('Cotas asignadas:', puntos.length, '| rango', Math.min(...v), 'a', Math.max(...v), 'm');
  Object.values(nuevo.elems).filter(e => e.type === 'tanque')
    .forEach(t => console.log('  ' + t.name + ':', t.cota, 'm'));
  console.log('\nOK - la salida difiere del original solo en los campos cota');
  console.log('Archivo:', salida);
})();
