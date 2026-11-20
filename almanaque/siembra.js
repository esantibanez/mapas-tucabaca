/* Recomendaciones de siembra, poda y riego para la ecorregión chiquitana.
   Combina: (1) calendario regional por cultivo, (2) lluvia, evapotranspiración y humedad del suelo
   (Open-Meteo: días pasados y pronóstico) y (3) la tradición lunar, que se muestra aparte.
   >>> El calendario de cultivos se puede ajustar con la experiencia de productores locales: editar CULTIVOS. <<< */
"use strict";
const TODO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const CULTIVOS = {
  yuca: { nombre: "Yuca", raiz: true, kc: 0.8,
    siembra: { principal: [10, 11, 12], secundaria: [1, 2], nota: "Se planta por estacas (trozos de tallo de 20–25 cm) con el inicio de las lluvias, para que enraíce antes de la época seca." },
    poda: null, podaNota: "La yuca no se poda. Los tallos se cortan en la cosecha y se guardan como estacas para la próxima siembra.",
    riegoNota: "Resiste bien la sequía; el riego ayuda sobre todo en los primeros 2 a 3 meses." },
  maiz: { nombre: "Maíz", kc: 1.1,
    siembra: { principal: [11, 12], secundaria: [10, 1], nota: "Siembra de verano con el suelo ya húmedo. Conviene que la floración (unos 55–70 días después) no caiga en un veranillo." },
    poda: null, podaNota: "El maíz no se poda.",
    riegoNota: "El momento más crítico de agua es la floración y el llenado del grano." },
  frejol: { nombre: "Frejol", kc: 1.05,
    siembra: { principal: [3, 4, 5], secundaria: [2], nota: "En las tierras bajas de Santa Cruz se siembra al final de las lluvias, con la humedad que queda en el suelo. Mucha lluvia en la floración trae enfermedades." },
    poda: null, podaNota: "El frejol no se poda.",
    riegoNota: "Necesita agua pareja en floración y llenado de vainas; el encharcamiento lo daña." },
  sandia: { nombre: "Sandía", kc: 1.0,
    siembra: { principal: [3, 4, 5], secundaria: [8, 9], conRiego: [8, 9], nota: "Mejor al final de las lluvias, para cosechar en época seca: la lluvia en la maduración baja el dulzor y trae hongos. En agosto y septiembre, solo con riego." },
    poda: { meses: TODO, nota: "Poda de guías (despunte) opcional durante el cultivo, siempre en días secos." },
    riegoNota: "Regar al pie, sin mojar las hojas; reducir el riego cuando los frutos maduran." },
  melon: { nombre: "Melón", kc: 1.0,
    siembra: { principal: [3, 4, 5], secundaria: [8, 9], conRiego: [8, 9], nota: "Igual que la sandía: mejor al final de las lluvias; en agosto y septiembre, solo con riego. El exceso de lluvia pudre los frutos." },
    poda: { meses: TODO, nota: "Poda de guías (despunte) para ordenar la planta, en días secos." },
    riegoNota: "Regar al pie; cortar el riego unos días antes de cosechar mejora el sabor." },
  papaya: { nombre: "Papaya", kc: 1.0,
    siembra: { principal: [10, 11, 12], secundaria: [1, 2], nota: "Trasplante de plantines al inicio de las lluvias; con riego se puede todo el año. No tolera el encharcamiento: plantar en terreno con buen drenaje." },
    poda: { meses: TODO, nota: "Deshoje de hojas secas o enfermas y raleo de frutos, en días secos." },
    riegoNota: "Riego frecuente en época seca, sin encharcar." },
  platano: { nombre: "Plátano", kc: 1.1,
    siembra: { principal: [10, 11, 12], secundaria: [1, 2], nota: "Plantar hijuelos al inicio de las lluvias; con riego se puede todo el año." },
    poda: { meses: TODO, nota: "Deshoje (hojas secas) y deshije: dejar la planta madre, un hijo y un nieto. En días secos." },
    riegoNota: "Consume mucha agua; en la época seca necesita riego regular." },
  citricos: { nombre: "Cítricos", kc: 0.7,
    siembra: { principal: [11, 12, 1], secundaria: [10, 2], nota: "Plantar al inicio de las lluvias para que el plantín arraigue antes de la época seca." },
    poda: { meses: [6, 7, 8], nota: "Poda después de la cosecha y antes de la floración, que llega con las primeras lluvias. Evitar días lluviosos: los cortes se infectan con hongos." },
    riegoNota: "Riego de apoyo en la época seca, sobre todo en la floración y el cuajado de frutos." },
};
const ACTIVIDADES = { siembra: "Siembra", poda: "Poda", riego: "Riego" };
const NIVEL = ["Baja", "Media", "Alta"];

// ---- utilidades de datos ----------------------------------------------------------------
const isoMas = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
function suma(clima, iso, desde, hasta, campo) {   // suma de un campo entre iso+desde e iso+hasta (incluidos)
  let s = 0, n = 0;
  for (let i = desde; i <= hasta; i++) { const c = clima[isoMas(iso, i)]; if (c && c[campo] != null) { s += c[campo]; n++; } }
  return { s, n, total: hasta - desde + 1 };
}
function certezaClima(iso, hoyISO) {   // según lo lejano del pronóstico
  const dias = Math.round((new Date(iso) - new Date(hoyISO)) / 86400000);
  if (dias <= 3) return { n: 2, txt: dias <= 0 ? "datos de días ya ocurridos" : "pronóstico de corto plazo (1–3 días)" };
  if (dias <= 7) return { n: 1, txt: "pronóstico a 4–7 días" };
  return { n: 0, txt: "pronóstico a más de una semana" };
}

// ---- motor de recomendación -------------------------------------------------------------
function recomendar(cultivoId, actividad, iso, clima, hoyISO, luna) {
  const C = CULTIVOS[cultivoId], mes = +iso.slice(5, 7), r = { razones: [], estado: "sd", corto: "", titulo: "", certeza: null, tradicion: null };
  const c = clima[iso], hayClima = !!c;
  const ll10 = suma(clima, iso, -9, 0, "lluvia"), prox7 = suma(clima, iso, 1, 7, "lluvia"), prox2 = suma(clima, iso, 0, 2, "lluvia");
  const suelo = c && c.suelo != null ? c.suelo : null;
  const cc = hayClima ? certezaClima(iso, hoyISO) : null;

  // tradición lunar (aparte; no cambia la recomendación técnica)
  if (actividad === "siembra") {
    const quiere = C.raiz ? "menguante" : "creciente", fav = C.raiz ? !luna.cre : luna.cre;
    r.tradicion = { fav, txt: `La tradición aconseja sembrar ${C.raiz ? "raíces y tubérculos" : "lo que da fruto sobre la tierra"} en luna ${quiere}. Hoy la luna está ${luna.cre ? "creciente" : "menguante"}: ${fav ? "día favorable" : "día no favorable"} según la costumbre.` };
  } else if (actividad === "poda" && C.poda) {
    r.tradicion = { fav: !luna.cre, txt: `La tradición aconseja podar en luna menguante, cuando "baja la savia". Hoy la luna está ${luna.cre ? "creciente" : "menguante"}: ${!luna.cre ? "día favorable" : "día no favorable"} según la costumbre.` };
  }

  if (actividad === "siembra") {
    const S = C.siembra, enPrin = S.principal.includes(mes), enSec = S.secundaria.includes(mes), conRiego = (S.conRiego || []).includes(mes);
    r.razones.push({ t: enPrin ? `Mes de siembra principal de ${C.nombre.toLowerCase()} en la Chiquitanía.` : enSec ? `Mes de siembra posible (secundario)${conRiego ? ", solo con riego" : ""}.` : "Fuera de la época habitual de siembra en la Chiquitanía.", f: "Calendario regional", n: 1 });
    r.razones.push({ t: S.nota, f: "Calendario regional", n: 1, nota: true });
    if (!enPrin && !enSec) { r.estado = "fuera"; r.corto = "Fuera de época"; r.titulo = "No es época de siembra"; r.certeza = { n: 1, txt: "calendario regional" }; return r; }
    if (!hayClima || ll10.n < 8) {
      r.estado = enPrin ? "bien" : "posible"; r.corto = enPrin ? "Época" : "Posible";
      r.titulo = enPrin ? "Época de siembra (sin datos de lluvia para este día)" : "Siembra posible (sin datos de lluvia para este día)";
      r.certeza = { n: 1, txt: "solo calendario regional: sin datos de lluvia ni humedad para esta fecha" }; return r;
    }
    const humedo = ll10.s >= 30 || (suelo != null && suelo >= 0.22), medio = ll10.s >= 15 || (suelo != null && suelo >= 0.17);
    const fuerte = prox2.s >= 50;
    r.razones.push({ t: `Lluvia de los últimos 10 días: ${ll10.s.toFixed(0)} mm${suelo != null ? ` · humedad del suelo (9–27 cm): ${(suelo * 100).toFixed(0)} %` : ""}.`, f: "Open-Meteo", n: cc.n });
    if (prox7.n >= 3) r.razones.push({ t: `Lluvia esperada en los 7 días siguientes: ${prox7.s.toFixed(0)} mm.`, f: "Open-Meteo", n: Math.min(cc.n, 1) });
    if (fuerte) { r.estado = "no"; r.corto = "Esperar"; r.titulo = "Esperar: lluvia fuerte pronosticada"; r.razones.push({ t: `Se esperan ${prox2.s.toFixed(0)} mm en tres días: puede lavar la semilla o encharcar.`, f: "Open-Meteo", n: cc.n }); }
    else if (conRiego && !enPrin) { r.estado = "posible"; r.corto = "Con riego"; r.titulo = "Siembra posible solo con riego"; }
    else if (humedo) { r.estado = enPrin ? "bien" : "posible"; r.corto = enPrin ? "Sembrar" : "Posible"; r.titulo = enPrin ? "Buen momento para sembrar: hay humedad" : "Siembra posible: hay humedad"; }
    else if (medio) { r.estado = "posible"; r.corto = "Posible"; r.titulo = "Humedad justa: sembrar con apoyo de riego o esperar otra lluvia"; }
    else { r.estado = "no"; r.corto = "Seco"; r.titulo = "Suelo seco: esperar lluvias o regar antes de sembrar"; }
    // la lluvia fuerte o la sequía son datos firmes; "buen momento" depende además del calendario regional (máximo: Media)
    r.certeza = { n: (fuerte || !medio) ? cc.n : Math.min(1, cc.n), txt: `${cc.txt}${(fuerte || !medio) ? "" : " + calendario regional"}` };
    return r;
  }

  if (actividad === "poda") {
    if (!C.poda) { r.estado = "na"; r.corto = "No aplica"; r.titulo = C.podaNota.split(".")[0]; r.razones.push({ t: C.podaNota, f: "Manejo del cultivo", n: 2 }); r.certeza = { n: 2, txt: "práctica del cultivo" }; return r; }
    const enMes = C.poda.meses.includes(mes);
    r.razones.push({ t: C.poda.nota, f: "Calendario regional", n: 1, nota: true });
    if (!enMes) { r.estado = "fuera"; r.corto = "Fuera de época"; r.titulo = "No es época de poda"; r.razones.unshift({ t: "Fuera de la época recomendada de poda.", f: "Calendario regional", n: 1 }); r.certeza = { n: 1, txt: "calendario regional" }; return r; }
    if (!hayClima) { r.estado = "posible"; r.corto = "Época"; r.titulo = "Época de poda (sin pronóstico para este día)"; r.certeza = { n: 1, txt: "solo calendario regional" }; return r; }
    const hoyLl = c.lluvia || 0, prob = c.prob ?? 0, siguientes = suma(clima, iso, 1, 2, "lluvia").s;
    r.razones.push({ t: `Lluvia del día: ${hoyLl.toFixed(1)} mm (probabilidad ${prob} %) · en los dos días siguientes: ${siguientes.toFixed(1)} mm.`, f: "Open-Meteo", n: cc.n });
    if (hoyLl >= 5 || siguientes >= 10 || prob >= 60) { r.estado = "no"; r.corto = "Lluvia"; r.titulo = "No conviene: con lluvia los cortes se infectan con hongos"; }
    else if (hoyLl >= 1 || siguientes >= 3 || prob >= 35) { r.estado = "posible"; r.corto = "Posible"; r.titulo = "Posible, pero hay algo de lluvia: mejor un día seco"; }
    else { r.estado = "bien"; r.corto = "Podar"; r.titulo = "Buen día para podar: seco"; }
    r.certeza = { n: cc.n, txt: cc.txt };
    return r;
  }

  // riego
  r.razones.push({ t: C.riegoNota, f: "Manejo del cultivo", n: 1, nota: true });
  if (!hayClima) { r.estado = "sd"; r.corto = "Sin datos"; r.titulo = "Sin datos de lluvia para este día"; r.certeza = { n: 0, txt: "sin datos: el pronóstico cubre 16 días" }; return r; }
  const et3 = suma(clima, iso, -2, 0, "et0"), ll3 = suma(clima, iso, -2, 0, "lluvia"), lluviaProx = suma(clima, iso, 1, 2, "lluvia").s;
  const deficit = et3.s * C.kc - ll3.s;
  r.razones.push({ t: `Consumo de agua del cultivo en 3 días: ${(et3.s * C.kc).toFixed(0)} mm · lluvia en esos días: ${ll3.s.toFixed(0)} mm${suelo != null ? ` · humedad del suelo: ${(suelo * 100).toFixed(0)} %` : ""}.`, f: "Open-Meteo (evapotranspiración FAO)", n: cc.n });
  if (lluviaProx >= 10) { r.estado = "fuera"; r.corto = "No regar"; r.titulo = `No hace falta: se esperan ${lluviaProx.toFixed(0)} mm de lluvia en dos días`; }
  else if (deficit > 10 || (suelo != null && suelo < 0.15)) { r.estado = "regar"; r.corto = "Regar"; r.titulo = `Conviene regar (unos ${Math.round(Math.max(deficit, 10))} mm, es decir ${Math.round(Math.max(deficit, 10))} litros por metro cuadrado)`; }
  else if (deficit > 4) { r.estado = "ligero"; r.corto = "Riego ligero"; r.titulo = `Riego ligero (unos ${Math.round(deficit)} mm)`; }
  else { r.estado = "fuera"; r.corto = "No regar"; r.titulo = "No hace falta regar: el suelo tiene agua"; }
  r.certeza = { n: cc.n, txt: cc.txt };
  return r;
}
