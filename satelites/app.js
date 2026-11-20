/* Pasos de satélites de monitoreo ambiental sobre un punto.
   Movimiento en Defensa del Valle de Tucabaca.
   Órbitas: TLE de CelesTrak (NORAD), actualizadas a diario en tles.txt. Cálculo SGP4 con satellite.js. */
"use strict";

// ---- Satélites -----------------------------------------------------------
// franja: ancho de la franja de imagen en km. dia: solo toma imágenes de día.
// lado: radar de vista lateral (Sentinel-1): franja a la derecha de la trayectoria, entre min y max km.
const SATS = [
  { id: "L8",  nombre: "Landsat 8",  re: /^LANDSAT 8\b/,  grupo: "Landsat",     color: "#2E7D32", franja: 185, dia: true,  res: "30 m",
    uso: "Deforestación, cicatrices de quema (dNBR), agua", datos: "1–2 días después (USGS)" },
  { id: "L9",  nombre: "Landsat 9",  re: /^LANDSAT 9\b/,  grupo: "Landsat",     color: "#43A047", franja: 185, dia: true,  res: "30 m",
    uso: "Deforestación, cicatrices de quema (dNBR), agua", datos: "1–2 días después (USGS)" },
  { id: "S2A", nombre: "Sentinel-2A", re: /^SENTINEL-2A\b/, grupo: "Sentinel-2", color: "#1565C0", franja: 290, dia: true,  res: "10 m",
    uso: "Desmontes recientes, quemas, agua (máximo detalle gratuito)", datos: "Horas después (Copernicus)" },
  { id: "S2B", nombre: "Sentinel-2B", re: /^SENTINEL-2B\b/, grupo: "Sentinel-2", color: "#1E88E5", franja: 290, dia: true,  res: "10 m",
    uso: "Desmontes recientes, quemas, agua (máximo detalle gratuito)", datos: "Horas después (Copernicus)" },
  { id: "S2C", nombre: "Sentinel-2C", re: /^SENTINEL-2C\b/, grupo: "Sentinel-2", color: "#42A5F5", franja: 290, dia: true,  res: "10 m",
    uso: "Desmontes recientes, quemas, agua (máximo detalle gratuito)", datos: "Horas después (Copernicus)" },
  { id: "S1A", nombre: "Sentinel-1A", re: /^SENTINEL-1A\b/, grupo: "Sentinel-1", color: "#6A1B9A", franja: 250, dia: false, lado: [345, 615], res: "10–20 m (radar)",
    uso: "Radar: ve a través de nubes y humo. Desmontes, inundaciones. No siempre toma imagen en cada pasada", datos: "Horas después (Copernicus)" },
  { id: "S1C", nombre: "Sentinel-1C", re: /^SENTINEL-1C\b/, grupo: "Sentinel-1", color: "#8E24AA", franja: 250, dia: false, lado: [345, 615], res: "10–20 m (radar)",
    uso: "Radar: ve a través de nubes y humo. Desmontes, inundaciones. No siempre toma imagen en cada pasada", datos: "Horas después (Copernicus)" },
  { id: "S1D", nombre: "Sentinel-1D", re: /^SENTINEL-1D\b/, grupo: "Sentinel-1", color: "#AB47BC", franja: 250, dia: false, lado: [345, 615], res: "10–20 m (radar)",
    uso: "Radar: ve a través de nubes y humo. Desmontes, inundaciones. No siempre toma imagen en cada pasada", datos: "Horas después (Copernicus)" },
  { id: "S3A", nombre: "Sentinel-3A", re: /^SENTINEL-3A\b/, grupo: "Sentinel-3", color: "#00838F", franja: 1270, dia: false, res: "300 m – 1 km",
    uso: "Agua (color y temperatura), focos de calor nocturnos", datos: "Horas después (Copernicus)" },
  { id: "S3B", nombre: "Sentinel-3B", re: /^SENTINEL-3B\b/, grupo: "Sentinel-3", color: "#26A69A", franja: 1270, dia: false, res: "300 m – 1 km",
    uso: "Agua (color y temperatura), focos de calor nocturnos", datos: "Horas después (Copernicus)" },
  { id: "TER", nombre: "Terra (MODIS)", re: /^TERRA\b/, grupo: "MODIS", color: "#E65100", franja: 2330, dia: false, res: "250 m – 1 km",
    uso: "Focos de calor (FIRMS), área quemada. Misión en fase final", datos: "≈3 horas (NASA FIRMS)" },
  { id: "AQU", nombre: "Aqua (MODIS)", re: /^AQUA\b/, grupo: "MODIS", color: "#F57C00", franja: 2330, dia: false, res: "250 m – 1 km",
    uso: "Focos de calor (FIRMS), área quemada. Misión en fase final", datos: "≈3 horas (NASA FIRMS)" },
  { id: "NPP", nombre: "Suomi NPP (VIIRS)", re: /^SUOMI NPP\b/, grupo: "VIIRS", color: "#C62828", franja: 3060, dia: false, res: "375 m",
    uso: "Focos de calor (FIRMS) con más detalle que MODIS", datos: "≈3 horas (NASA FIRMS)" },
  { id: "N20", nombre: "NOAA-20 (VIIRS)", re: /^NOAA 20\b/, grupo: "VIIRS", color: "#D84315", franja: 3060, dia: false, res: "375 m",
    uso: "Focos de calor (FIRMS) con más detalle que MODIS", datos: "≈3 horas (NASA FIRMS)" },
  { id: "N21", nombre: "NOAA-21 (VIIRS)", re: /^NOAA 21\b/, grupo: "VIIRS", color: "#EF5350", franja: 3060, dia: false, res: "375 m",
    uso: "Focos de calor (FIRMS) con más detalle que MODIS", datos: "≈3 horas (NASA FIRMS)" },
];

const DIAS_ATRAS = 20, DIAS_ADELANTE = 20, PASO_S = 60, R_TIERRA = 6371.0;
const RAD = Math.PI / 180;
let punto = { lat: -18.329, lon: -59.760, nombre: "Roboré" };
let resultados = {}, seleccionado = null, fuenteTLE = "";

// ---- Geometría -------------------------------------------------------------
function distKm(la1, lo1, la2, lo2) {
  const a = Math.sin((la2 - la1) * RAD / 2) ** 2 + Math.cos(la1 * RAD) * Math.cos(la2 * RAD) * Math.sin((lo2 - lo1) * RAD / 2) ** 2;
  return 2 * R_TIERRA * Math.asin(Math.min(1, Math.sqrt(a)));
}
function rumbo(la1, lo1, la2, lo2) {
  const y = Math.sin((lo2 - lo1) * RAD) * Math.cos(la2 * RAD);
  const x = Math.cos(la1 * RAD) * Math.sin(la2 * RAD) - Math.sin(la1 * RAD) * Math.cos(la2 * RAD) * Math.cos((lo2 - lo1) * RAD);
  return Math.atan2(y, x);
}
function destino(la, lo, rumboRad, dKm) {
  const d = dKm / R_TIERRA, la1 = la * RAD, lo1 = lo * RAD;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(rumboRad));
  const lo2 = lo1 + Math.atan2(Math.sin(rumboRad) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  return [la2 / RAD, ((lo2 / RAD + 540) % 360) - 180];
}
// Elevación del sol (grados) en un lugar y momento — fórmula aproximada de NOAA
function elevSol(fecha, lat, lon) {
  const d = fecha.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const g = (357.529 + 0.98560028 * d) * RAD, q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD, e = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  const ha = ((gmst * 15 + lon) * RAD - ra);
  return Math.asin(Math.sin(lat * RAD) * Math.sin(dec) + Math.cos(lat * RAD) * Math.cos(dec) * Math.cos(ha)) / RAD;
}

// ---- Órbitas ---------------------------------------------------------------
function subpunto(satrec, fecha) {
  const pv = satellite.propagate(satrec, fecha);
  if (!pv || !pv.position) return null;
  const g = satellite.eciToGeodetic(pv.position, satellite.gstime(fecha));
  return { lat: satellite.degreesLat(g.latitude), lon: satellite.degreesLong(g.longitude), alt: g.height };
}
function leerTLE(texto) {
  const l = texto.split(/\r?\n/).map(s => s.trim()).filter(Boolean), out = [];
  for (let i = 0; i + 2 < l.length + 1; i++)
    if (l[i + 1] && l[i + 2] && l[i + 1].startsWith("1 ") && l[i + 2].startsWith("2 ")) { out.push([l[i], l[i + 1], l[i + 2]]); i += 2; }
  return out;
}
async function cargarTLE() {
  const fuentes = [
    ["tles.txt?" + Math.floor(Date.now() / 3600000), "copia diaria de CelesTrak"],
    ["https://celestrak.org/NORAD/elements/gp.php?GROUP=resource&FORMAT=tle", "CelesTrak (en vivo)"],
  ];
  let todos = [];
  for (const [url, nom] of fuentes) {
    try {
      const r = await fetch(url, { cache: "no-cache" });
      if (!r.ok) continue;
      todos = leerTLE(await r.text());
      if (url.includes("celestrak")) {   // los satélites meteorológicos (VIIRS) están en otro grupo
        try { const w = await fetch("https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle"); if (w.ok) todos = todos.concat(leerTLE(await w.text())); } catch (e) {}
      }
      if (todos.length) { fuenteTLE = nom; break; }
    } catch (e) {}
  }
  let edad = null;
  for (const s of SATS) {
    const t = todos.find(x => s.re.test(x[0].replace(/^0 /, "")));
    s.satrec = t ? satellite.twoline2satrec(t[1], t[2]) : null;
    if (s.satrec) { const ep = epocaTLE(t[1]); edad = edad === null ? ep : Math.max(edad, ep); }
  }
  return edad;
}
function epocaTLE(l1) {   // fecha de la órbita, en ms
  const yy = +l1.slice(18, 20), dd = +l1.slice(20, 32);
  return Date.UTC(yy < 57 ? 2000 + yy : 1900 + yy, 0, 1) + (dd - 1) * 86400000;
}

// Busca las pasadas sobre el punto: mínimos de distancia a la traza, refinados al segundo
function pasadas(s, lat, lon, t0, t1) {
  const out = [], margen = (s.lado ? s.lado[1] : s.franja / 2) + 300;
  let dPrev2 = Infinity, dPrev = Infinity;
  for (let t = t0; t <= t1; t += PASO_S * 1000) {
    const p = subpunto(s.satrec, new Date(t));
    const d = p ? distKm(lat, lon, p.lat, p.lon) : Infinity;
    if (dPrev < dPrev2 && dPrev <= d && dPrev < margen + 600) {
      const fino = refinar(s, lat, lon, t - 2 * PASO_S * 1000, t);
      if (fino) {
        const ok = s.lado ? (fino.lado > 0 && fino.d >= s.lado[0] && fino.d <= s.lado[1]) : fino.d <= s.franja / 2;
        const sol = elevSol(new Date(fino.t), lat, lon);
        if (ok && (!s.dia || sol > 5)) out.push({ t: fino.t, d: fino.d, sol, asc: fino.asc });
      }
    }
    dPrev2 = dPrev; dPrev = d;
  }
  return out;
}
function refinar(s, lat, lon, a, b) {
  const f = t => { const p = subpunto(s.satrec, new Date(t)); return p ? distKm(lat, lon, p.lat, p.lon) : Infinity; };
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = b - gr * (b - a), d = a + gr * (b - a), fc = f(c), fd = f(d);
  while (b - a > 1000) {
    if (fc < fd) { b = d; d = c; fd = fc; c = b - gr * (b - a); fc = f(c); }
    else { a = c; c = d; fc = fd; d = a + gr * (b - a); fd = f(d); }
  }
  const t = Math.round((a + b) / 2), p = subpunto(s.satrec, new Date(t)), q = subpunto(s.satrec, new Date(t + 1000));
  if (!p || !q) return null;
  const rel = rumbo(p.lat, p.lon, lat, lon) - rumbo(p.lat, p.lon, q.lat, q.lon);
  return { t, d: distKm(lat, lon, p.lat, p.lon), lado: Math.sin(rel) > 0 ? 1 : -1, asc: q.lat > p.lat };
}

// ---- Formatos ----------------------------------------------------------------
const fmtFecha = t => new Date(t).toLocaleString("es-BO", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
function fmtDif(ms) {
  const a = Math.abs(ms), d = Math.floor(a / 86400000), h = Math.floor(a % 86400000 / 3600000), m = Math.round(a % 3600000 / 60000);
  const txt = d >= 1 ? `${d} d ${h} h` : h >= 1 ? `${h} h ${m} min` : `${m} min`;
  return ms >= 0 ? `en ${txt}` : `hace ${txt}`;
}
function cadaCuanto(lista) {
  if (lista.length < 2) return "—";
  const dif = []; for (let i = 1; i < lista.length; i++) dif.push((lista[i].t - lista[i - 1].t) / 86400000);
  const prom = dif.reduce((a, b) => a + b, 0) / dif.length;
  if (prom < 0.9) return `${(1 / prom).toFixed(prom < 0.4 ? 0 : 1)} veces al día`;
  return `cada ~${prom < 3 ? prom.toFixed(1) : Math.round(prom)} días`;
}
const icoSol = p => p.sol > 0 ? "☀️" : "🌙";

// ---- Cálculo y tabla -------------------------------------------------------
async function calcular() {
  const ahora = Date.now(), t0 = ahora - DIAS_ATRAS * 86400000, t1 = ahora + DIAS_ADELANTE * 86400000;
  const barra = document.getElementById("progreso"); barra.style.display = "block";
  resultados = {};
  for (let i = 0; i < SATS.length; i++) {
    const s = SATS[i];
    barra.firstElementChild.style.width = `${Math.round(100 * i / SATS.length)}%`;
    barra.lastElementChild.textContent = `Calculando ${s.nombre}…`;
    await new Promise(r => setTimeout(r, 0));
    if (!s.satrec) { resultados[s.id] = null; continue; }
    const ps = pasadas(s, punto.lat, punto.lon, t0, t1);
    resultados[s.id] = { todas: ps, antes: ps.filter(p => p.t <= ahora), despues: ps.filter(p => p.t > ahora) };
  }
  barra.style.display = "none";
  tabla(); resumen();
  if (seleccionado) detalle(seleccionado);
}
function tabla() {
  const ahora = Date.now(), tb = document.getElementById("cuerpo"); tb.innerHTML = "";
  let grupoAnt = "";
  for (const s of SATS) {
    const r = resultados[s.id];
    if (s.grupo !== grupoAnt) {
      grupoAnt = s.grupo;
      const g = document.createElement("tr"); g.className = "grupo";
      const juntas = SATS.filter(x => x.grupo === s.grupo && resultados[x.id]).flatMap(x => resultados[x.id].todas).sort((a, b) => a.t - b.t);
      const n = SATS.filter(x => x.grupo === s.grupo && resultados[x.id]).length;
      g.innerHTML = `<td colspan="5">${s.grupo} · ${s.res}${s.dia ? " · solo de día" : ""}${n > 1 ? ` · los ${n} juntos: ${cadaCuanto(juntas)}` : ""}</td>`; tb.appendChild(g);
    }
    const tr = document.createElement("tr"); tr.dataset.id = s.id;
    if (!r) {
      tr.className = "sin";
      tr.innerHTML = `<td><span class="pt" style="background:${s.color}"></span>${s.nombre}</td><td class="uso">${s.uso}</td><td colspan="3">Sin órbita publicada (puede estar fuera de servicio)</td>`;
    } else {
      const u = r.antes[r.antes.length - 1], p = r.despues[0];
      tr.innerHTML = `<td><span class="pt" style="background:${s.color}"></span><b>${s.nombre}</b></td>
        <td class="uso">${s.uso}</td>
        <td>${u ? `${icoSol(u)} ${fmtFecha(u.t)}<br><small>${fmtDif(u.t - ahora)}</small>` : "—"}</td>
        <td class="prox">${p ? `${icoSol(p)} ${fmtFecha(p.t)}<br><small>${fmtDif(p.t - ahora)}</small>` : "—"}</td>
        <td>${cadaCuanto(r.todas)}</td>`;
      tr.onclick = () => detalle(s.id);
    }
    if (s.id === seleccionado) tr.classList.add("sel");
    tb.appendChild(tr);
  }
}
function resumen() {
  const ahora = Date.now(), el = document.getElementById("resumen");
  const prox = grupos => SATS.filter(s => grupos.includes(s.grupo) && resultados[s.id])
    .map(s => ({ s, p: resultados[s.id].despues[0] })).filter(x => x.p).sort((a, b) => a.p.t - b.p.t)[0];
  const ult = grupos => SATS.filter(s => grupos.includes(s.grupo) && resultados[s.id])
    .map(s => ({ s, p: resultados[s.id].antes.slice(-1)[0] })).filter(x => x.p).sort((a, b) => b.p.t - a.p.t)[0];
  const tarjeta = (tit, gr) => {
    const a = ult(gr), b = prox(gr);
    return `<div class="tarjeta"><div class="tt">${tit}</div>
      <div>Última: ${a ? `<b>${a.s.nombre}</b> · ${fmtFecha(a.p.t)} <small>(${fmtDif(a.p.t - ahora)})</small>` : "—"}</div>
      <div>Próxima: ${b ? `<b>${b.s.nombre}</b> · ${fmtFecha(b.p.t)} <small>(${fmtDif(b.p.t - ahora)})</small>` : "—"}</div></div>`;
  };
  el.innerHTML = tarjeta("Imagen detallada (Landsat · Sentinel-2)", ["Landsat", "Sentinel-2"]) +
                 tarjeta("Radar, sin nubes (Sentinel-1)", ["Sentinel-1"]) +
                 tarjeta("Focos de calor (MODIS · VIIRS)", ["MODIS", "VIIRS"]);
}

// ---- Mapa ------------------------------------------------------------------
const mapa = L.map("mapa", { worldCopyJump: true }).setView([punto.lat, punto.lon], 7);
const esri = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { maxZoom: 18, attribution: "Imágenes © Esri" }).addTo(mapa);
L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  { maxZoom: 18 }).addTo(mapa);
const marca = L.marker([punto.lat, punto.lon], { draggable: true }).addTo(mapa);
const capaTraza = L.layerGroup().addTo(mapa);
let marcaSat = null;
marca.on("dragend", e => moverPunto(e.target.getLatLng().lat, e.target.getLatLng().lng));
mapa.on("click", e => moverPunto(e.latlng.lat, e.latlng.lng));

function moverPunto(lat, lon, nombre) {
  punto = { lat, lon: ((lon + 540) % 360) - 180, nombre: nombre || "" };
  marca.setLatLng([lat, lon]);
  document.getElementById("coord").textContent = `${punto.nombre ? punto.nombre + " · " : ""}${lat.toFixed(4)}, ${punto.lon.toFixed(4)}`;
  history.replaceState(null, "", `#${lat.toFixed(4)},${punto.lon.toFixed(4)}`);
  if (typeof REP !== "undefined" && REP.activo) repCerrar();
  calcular();
}

// Traza y franja de una pasada (±7 min)
function dibujarPasada(s, p) {
  capaTraza.clearLayers();
  const linea = [], izq = [], der = [];
  const off = s.lado ? [s.lado[0], s.lado[1]] : [-s.franja / 2, s.franja / 2];
  for (let t = p.t - 420000; t <= p.t + 420000; t += 15000) {
    const a = subpunto(s.satrec, new Date(t)), b = subpunto(s.satrec, new Date(t + 1000));
    if (!a || !b) continue;
    const h = rumbo(a.lat, a.lon, b.lat, b.lon);
    linea.push([a.lat, a.lon]);
    izq.push(destino(a.lat, a.lon, h + Math.PI / 2 * Math.sign(off[0] || -1), Math.abs(off[0])));
    der.push(destino(a.lat, a.lon, h + Math.PI / 2, Math.abs(off[1])));
  }
  L.polygon(izq.concat(der.slice().reverse()), { color: s.color, weight: 1, fillOpacity: 0.18 }).addTo(capaTraza);
  L.polyline(linea, { color: s.color, weight: 2, dashArray: "6 6" }).addTo(capaTraza);
  const mitad = linea[Math.floor(linea.length / 2)];
  L.circleMarker(mitad, { radius: 5, color: "#fff", weight: 2, fillColor: s.color, fillOpacity: 1 })
    .bindTooltip(`${s.nombre} · ${fmtFecha(p.t)}`, { permanent: false }).addTo(capaTraza);
  mapa.fitBounds(L.latLngBounds(izq.concat(der)).pad(0.05), { maxZoom: 7 });
}
function detalle(id) {
  if (REP.activo) repCerrar();
  seleccionado = id;
  document.querySelectorAll("#cuerpo tr").forEach(tr => tr.classList.toggle("sel", tr.dataset.id === id));
  const s = SATS.find(x => x.id === id), r = resultados[id], ahora = Date.now();
  if (!r) return;
  const fila = p => `<tr class="${p.t > ahora ? "fut" : ""}" data-t="${p.t}"><td>${icoSol(p)}</td><td>${fmtFecha(p.t)}</td><td>${fmtDif(p.t - ahora)}</td>
    <td>${Math.round(p.d)} km ${s.lado ? "del satélite" : "del centro"}</td><td>${p.asc ? "↑ sur→norte" : "↓ norte→sur"}</td></tr>`;
  const lista = r.antes.slice(-6).concat(r.despues.slice(0, 8));
  document.getElementById("detalle").innerHTML = `
    <h3><span class="pt" style="background:${s.color}"></span>${s.nombre}</h3>
    <p class="det">${s.uso}. Resolución ${s.res}. Ancho de franja ${s.franja.toLocaleString("es-BO")} km.
    Datos disponibles: ${s.datos}.${s.dia ? " Solo se muestran pasadas de día (toma imágenes ópticas)." : " Pasa de día ☀️ y de noche 🌙."}</p>
    <table class="pasadas"><thead><tr><th></th><th>Fecha y hora</th><th></th><th>Distancia</th><th>Sentido</th></tr></thead>
    <tbody>${lista.map(fila).join("") || "<tr><td colspan=5>Sin pasadas en ±20 días</td></tr>"}</tbody></table>
    <p class="nota">Toque una fecha para ver la franja que cubre el satélite en esa pasada.</p>`;
  document.querySelectorAll("#detalle tbody tr[data-t]").forEach(tr =>
    tr.onclick = () => { dibujarPasada(s, r.todas.find(p => p.t === +tr.dataset.t)); document.getElementById("mapa").scrollIntoView({ behavior: "smooth" }); });
  const p = r.despues[0] || r.antes[r.antes.length - 1];
  if (p) dibujarPasada(s, p);
  posicionAhora();
}
function posicionAhora() {
  if (!seleccionado) return;
  const s = SATS.find(x => x.id === seleccionado), p = s.satrec && subpunto(s.satrec, new Date());
  if (!p) return;
  if (!marcaSat) marcaSat = L.circleMarker([p.lat, p.lon], { radius: 7, color: "#fff", weight: 2, fillOpacity: 1 }).addTo(mapa);
  marcaSat.setLatLng([p.lat, p.lon]).setStyle({ fillColor: s.color })
    .bindTooltip(`${s.nombre} ahora · ${Math.round(p.alt)} km de altura`);
}
setInterval(posicionAhora, 5000);

// ---- Repetición animada de un rango de fechas -------------------------------
// Un lienzo sobre el mapa. En cada cuadro se dibuja la estela reciente de cada satélite:
// las franjas nuevas se ven fuertes y las viejas se desvanecen.
const REP = { activo: false, play: false, datos: [], t0: 0, paso: 60000, idx: 0, n: 0, dur: 30000, vel: 1,
              ultimoFrame: 0, eventos: [], evIdx: 0, lienzo: null, estela: 1440, zoomProy: null };

function repLienzo() {
  if (REP.lienzo) return;
  const c = document.createElement("canvas");
  c.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;z-index:450";
  mapa.getContainer().appendChild(c); REP.lienzo = c;
  const ajustar = () => {
    const s = mapa.getSize(), r = window.devicePixelRatio || 1;
    c.width = s.x * r; c.height = s.y * r; c.style.width = s.x + "px"; c.style.height = s.y + "px";
    c.getContext("2d").setTransform(r, 0, 0, r, 0, 0); repDibujar();
  };
  mapa.on("resize zoomend moveend move", ajustar);
  ajustar();
}
function repProyectar() {   // coordenadas en píxeles del mundo para el zoom actual (se calcula una vez por zoom)
  const z = mapa.getZoom();
  if (REP.zoomProy === z) return;
  for (const d of REP.datos) {
    d.x = new Float64Array(REP.n); d.y = new Float64Array(REP.n); d.nx = new Float64Array(REP.n); d.ny = new Float64Array(REP.n);
    for (let i = 0; i < REP.n; i++) {
      if (isFinite(d.lat[i])) { const p = mapa.project([d.lat[i], d.lon[i]], z); d.x[i] = p.x; d.y[i] = p.y; } else d.x[i] = NaN;
      if (isFinite(d.nlat[i])) { const p = mapa.project([d.nlat[i], d.nlon[i]], z); d.nx[i] = p.x; d.ny[i] = p.y; } else d.nx[i] = NaN;
    }
  }
  REP.zoomProy = z;
}
const anchoPx = km => {   // ancho de una franja en píxeles a la latitud del centro del mapa
  const mpp = 40075016.686 * Math.cos(mapa.getCenter().lat * RAD) / (256 * 2 ** mapa.getZoom());
  return Math.max(1.5, km * 1000 / mpp);
};
function repDibujar() {
  if (!REP.lienzo) return;
  const ctx = REP.lienzo.getContext("2d"), s = mapa.getSize();
  ctx.clearRect(0, 0, s.x, s.y);
  if (!REP.activo || !REP.datos.length) return;
  repProyectar();
  const o = mapa.getPixelOrigin(), off = mapa.layerPointToContainerPoint(L.point(0, 0));
  const dx = off.x - o.x, dy = off.y - o.y, fin = Math.min(REP.idx, REP.n - 1), ini = Math.max(0, fin - REP.estela);
  const ancho = s.x * 4, B = 15;
  for (const d of REP.datos) {
    const uno = REP.datos.length <= 3, ancha = d.s.franja > 1000;
    const base = uno ? (ancha ? 0.22 : 0.55) : (ancha ? 0.7 : 0.35);
    ctx.strokeStyle = d.s.color; ctx.lineWidth = ancha && !uno ? 1.6 : anchoPx(d.s.franja); ctx.lineJoin = "round";
    for (let i0 = ini; i0 < fin; i0 += B) {
      const edad = (fin - i0) / REP.estela;
      ctx.globalAlpha = base * Math.max(0, 1 - edad) ** 1.5;
      if (ctx.globalAlpha < 0.01) continue;
      ctx.beginPath(); let pen = false;
      for (let i = i0; i <= Math.min(fin, i0 + B); i++) {
        const x = d.x[i] + dx, y = d.y[i] + dy;
        if (!isFinite(x) || (pen && Math.abs(x - px) > ancho)) { pen = false; if (!isFinite(x)) continue; }
        if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
        var px = x;
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  for (const d of REP.datos) {   // posición actual
    const x = d.nx[fin] + dx, y = d.ny[fin] + dy;
    if (!isFinite(x)) continue;
    ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 2 * Math.PI); ctx.fillStyle = d.s.color; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
    if (REP.datos.length <= 3 && x > 0 && y > 0 && x < s.x && y < s.y) {
      ctx.font = "bold 12px Arial"; ctx.fillStyle = "#fff"; ctx.shadowColor = "#000"; ctx.shadowBlur = 3;
      ctx.fillText(d.s.nombre, x + 9, y + 4); ctx.shadowBlur = 0;
    }
  }
}

async function repPreparar() {
  const desde = new Date(document.getElementById("repDesde").value + "T00:00:00").getTime();
  const hasta = new Date(document.getElementById("repHasta").value + "T23:59:59").getTime();
  const dias = (hasta - desde) / 86400000, info = document.getElementById("repInfo");
  if (!(dias > 0)) { info.textContent = "Revise las fechas."; return false; }
  if (dias > 90) { info.textContent = "El rango máximo es de 90 días."; return false; }
  const sel = document.getElementById("repSat").value;
  const lista = SATS.filter(s => s.satrec && (sel === "todos" || (sel.startsWith("g:") ? s.grupo === sel.slice(2) : s.id === sel)));
  REP.t0 = desde; REP.n = Math.ceil((hasta - desde) / REP.paso) + 1;
  REP.dur = dias <= 15 ? 30000 : dias <= 31 ? 45000 : 60000;
  REP.datos = []; REP.eventos = []; REP.idx = 0; REP.evIdx = -1;
  const barra = document.getElementById("progreso"); barra.style.display = "block";
  for (let k = 0; k < lista.length; k++) {
    const s = lista[k];
    barra.firstElementChild.style.width = `${Math.round(100 * k / lista.length)}%`;
    barra.lastElementChild.textContent = `Preparando ${s.nombre}…`;
    await new Promise(r => setTimeout(r, 0));
    const nlat = new Float32Array(REP.n), nlon = new Float32Array(REP.n);
    for (let i = 0; i < REP.n; i++) {
      const p = subpunto(s.satrec, new Date(desde + i * REP.paso));
      nlat[i] = p ? p.lat : NaN; nlon[i] = p ? p.lon : NaN;
    }
    let lat = nlat, lon = nlon;
    if (s.lado) {   // radar: la franja va a la derecha de la trayectoria
      lat = new Float32Array(REP.n); lon = new Float32Array(REP.n); const mid = (s.lado[0] + s.lado[1]) / 2;
      for (let i = 0; i < REP.n; i++) {
        const j = Math.min(i, REP.n - 2), h = rumbo(nlat[j], nlon[j], nlat[j + 1], nlon[j + 1]);
        const q = destino(nlat[i], nlon[i], h + Math.PI / 2, mid); lat[i] = q[0]; lon[i] = q[1];
      }
    }
    REP.datos.push({ s, lat, lon, nlat, nlon });
    pasadas(s, punto.lat, punto.lon, desde, hasta).forEach(p => REP.eventos.push({ s, p }));
  }
  barra.style.display = "none";
  REP.eventos.sort((a, b) => a.p.t - b.p.t);
  // largo de la estela: 1 día con todos los satélites; con pocos, una décima parte del rango (entre 1 y 6 días)
  REP.estela = Math.round((lista.length > 3 ? 1 : Math.min(6, Math.max(1, dias / 10))) * 86400000 / REP.paso);
  REP.zoomProy = null;
  document.getElementById("repEventos").innerHTML = REP.eventos.length ? REP.eventos.map((e, i) =>
    `<div class="ev" id="ev${i}" data-i="${i}"><span class="pt" style="background:${e.s.color}"></span>${icoSol(e.p)} <b>${e.s.nombre}</b> · ${fmtFecha(e.p.t)}</div>`).join("")
    : "<div class='ev'>Ningún satélite elegido pasó sobre el punto en este rango.</div>";
  document.querySelectorAll("#repEventos .ev[data-i]").forEach(el => el.onclick = () => {
    const e = REP.eventos[+el.dataset.i]; repIr(Math.round((e.p.t - REP.t0) / REP.paso)); });
  info.textContent = `${lista.length} satélite(s) · ${Math.round(dias)} días · se reproduce en ${REP.dur / 1000} s`;
  REP.preparado = sel + "|" + desde + "|" + hasta + "|" + punto.lat + "," + punto.lon;
  return true;
}
const pulso = L.circleMarker([0, 0], { radius: 20, weight: 3, opacity: 0, fillOpacity: 0, interactive: false });
function repReloj() {
  const t = REP.t0 + Math.min(REP.idx, REP.n - 1) * REP.paso;
  document.getElementById("repReloj").textContent = new Date(t).toLocaleString("es-BO",
    { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  document.getElementById("repBarra").value = Math.round(1000 * REP.idx / (REP.n - 1));
  let k = 0; while (k < REP.eventos.length && REP.eventos[k].p.t <= t) k++;
  if (k !== REP.evIdx) {
    REP.eventos.forEach((_, i) => document.getElementById("ev" + i)?.classList.toggle("ya", i < k));
    if (REP.play && k > REP.evIdx && k > 0) {   // pasada nueva sobre el punto: destello
      const e = REP.eventos[k - 1];
      pulso.setLatLng([punto.lat, punto.lon]).setStyle({ color: e.s.color, fillColor: e.s.color, opacity: 1, fillOpacity: 0.25 }).addTo(mapa);
      clearTimeout(REP._t); REP._t = setTimeout(() => pulso.setStyle({ opacity: 0, fillOpacity: 0 }), 700);
      const el = document.getElementById("ev" + (k - 1)), caja = document.getElementById("repEventos");
      if (el) caja.scrollTop = el.offsetTop - caja.offsetTop - 40;
    }
    REP.evIdx = k;
  }
  document.getElementById("repConteo").textContent = `Pasadas sobre el punto: ${k} de ${REP.eventos.length}`;
}
function repCuadro(ts) {
  if (!REP.play) return;
  const dt = REP.ultimoFrame ? Math.min(100, ts - REP.ultimoFrame) : 16; REP.ultimoFrame = ts;
  REP.idx = Math.min(REP.n - 1, REP.idx + Math.max(1, Math.round(dt * REP.vel / REP.dur * REP.n)));
  repDibujar(); repReloj();
  if (REP.idx >= REP.n - 1) { repPausa(); document.getElementById("repPlay").textContent = "↺ Repetir"; return; }
  requestAnimationFrame(repCuadro);
}
function repPausa() { REP.play = false; document.getElementById("repPlay").textContent = "▶ Reproducir"; }
function repIr(i) { REP.idx = Math.max(0, Math.min(REP.n - 1, i)); repDibujar(); repReloj(); }
async function repPlay() {
  if (REP.play) { repPausa(); return; }
  repLienzo();
  const clave = document.getElementById("repSat").value + "|" + new Date(document.getElementById("repDesde").value + "T00:00:00").getTime() + "|" +
    new Date(document.getElementById("repHasta").value + "T23:59:59").getTime() + "|" + punto.lat + "," + punto.lon;
  if (REP.preparado !== clave) { REP.activo = false; repDibujar(); if (!(await repPreparar())) return; }
  REP.activo = true; capaTraza.clearLayers(); if (marcaSat) { mapa.removeLayer(marcaSat); marcaSat = null; }
  document.getElementById("repPanel").classList.add("on");
  if (REP.idx >= REP.n - 1) { REP.idx = 0; repDibujar(); }
  REP.play = true; REP.ultimoFrame = 0; document.getElementById("repPlay").textContent = "⏸ Pausa";
  requestAnimationFrame(repCuadro);
}
function repCerrar() {
  repPausa(); REP.activo = false; REP.preparado = null; repDibujar();
  document.getElementById("repPanel").classList.remove("on"); document.getElementById("repInfo").textContent = "";
}
(function repIniciar() {
  const hoy = new Date(), hace = new Date(Date.now() - 30 * 86400000), iso = d => d.toLocaleDateString("en-CA");
  document.getElementById("repDesde").value = iso(hace); document.getElementById("repHasta").value = iso(hoy);
  const sel = document.getElementById("repSat");
  sel.innerHTML = `<option value="todos">Todos los satélites</option>` +
    [...new Set(SATS.map(s => s.grupo))].map(g => `<option value="g:${g}">${g} (todos)</option>`).join("") +
    SATS.map(s => `<option value="${s.id}">${s.nombre}</option>`).join("");
  sel.value = "g:Landsat";
  document.getElementById("repPlay").onclick = repPlay;
  document.getElementById("repCerrar").onclick = repCerrar;
  document.querySelectorAll("[data-vel]").forEach(b => b.onclick = () => {
    REP.vel = +b.dataset.vel; document.querySelectorAll("[data-vel]").forEach(x => x.classList.toggle("act", x === b)); });
  document.getElementById("repBarra").oninput = e => { if (REP.activo) repIr(Math.round(+e.target.value / 1000 * (REP.n - 1))); };
  document.querySelectorAll("[data-rango]").forEach(b => b.onclick = () => {
    document.getElementById("repDesde").value = iso(new Date(Date.now() - +b.dataset.rango * 86400000));
    document.getElementById("repHasta").value = iso(new Date()); });
})();

// ---- Inicio ----------------------------------------------------------------
document.getElementById("btnUbic").onclick = () => navigator.geolocation && navigator.geolocation.getCurrentPosition(
  g => { mapa.setView([g.coords.latitude, g.coords.longitude], 8); moverPunto(g.coords.latitude, g.coords.longitude, "Mi ubicación"); },
  () => alert("No se pudo obtener su ubicación."));
document.getElementById("btnCoord").onclick = () => {
  const v = prompt("Coordenadas (latitud, longitud). Ej.: -18.25, -59.60");
  const m = v && v.match(/(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)/);
  if (m) { const la = +m[1].replace(",", "."), lo = +m[2].replace(",", "."); mapa.setView([la, lo], 8); moverPunto(la, lo); }
};
document.querySelectorAll("[data-lugar]").forEach(b => b.onclick = () => {
  const [la, lo] = b.dataset.lugar.split(",").map(Number); mapa.setView([la, lo], 8); moverPunto(la, lo, b.textContent);
});

(async () => {
  const h = location.hash.slice(1).split(",").map(Number);
  if (h.length === 2 && h.every(isFinite)) { punto = { lat: h[0], lon: h[1], nombre: "" }; mapa.setView([h[0], h[1]], 7); marca.setLatLng(h); }
  document.getElementById("coord").textContent = `${punto.nombre ? punto.nombre + " · " : ""}${punto.lat.toFixed(4)}, ${punto.lon.toFixed(4)}`;
  const ep = await cargarTLE();
  const info = document.getElementById("orbitas");
  if (!SATS.some(s => s.satrec)) { info.innerHTML = "<b>No se pudieron cargar las órbitas.</b> Intente de nuevo más tarde."; return; }
  info.textContent = `Órbitas: ${fuenteTLE}, actualizadas al ${new Date(ep).toLocaleDateString("es-BO", { day: "2-digit", month: "long", year: "numeric" })}.`;
  await calcular();
})();
