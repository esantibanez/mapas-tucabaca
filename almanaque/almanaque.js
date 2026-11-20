/* Almanaque del Valle de Tucabaca — Movimiento en Defensa del Valle de Tucabaca
   Sol y luna: SunCalc (salidas y puestas) y algoritmos de Jean Meeus (fases lunares, equinoccios y solsticios).
   Clima: Open-Meteo. Satélites: órbitas NORAD/CelesTrak (../satelites/tles.txt) con SGP4 (satellite.js). */
"use strict";
const ZONA = "America/La_Paz", RAD = Math.PI / 180;
const LUGARES = {
  robore:   { nombre: "Roboré", lat: -18.329, lon: -59.760 },
  santiago: { nombre: "Santiago de Chiquitos", lat: -18.339, lon: -59.598 },
  chochis:  { nombre: "Chochís", lat: -18.120, lon: -60.030 },
  scz:      { nombre: "Santa Cruz de la Sierra", lat: -17.784, lon: -63.181 },
};
let lugar = LUGARES.robore;
const hoy = new Date();
let anio = +fmt(hoy, { year: "numeric" }), mes = +fmt(hoy, { month: "numeric" }) - 1;

// ---- Fechas en hora de Bolivia (UTC−4, sin horario de verano) ------------
function fmt(d, o) { return new Intl.DateTimeFormat("es-BO", Object.assign({ timeZone: ZONA }, o)).format(d); }
const hora = d => d && !isNaN(d) ? fmt(d, { hour: "2-digit", minute: "2-digit", hour12: false }) : "—";
const diaBo = (a, m, d, h = 12) => new Date(Date.UTC(a, m, d, h + 4));   // mediodía de Bolivia en UTC
const claveDia = d => fmt(d, { year: "numeric", month: "2-digit", day: "2-digit" });   // dd/mm/aaaa en Bolivia
const NOMBRE_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const jdAFecha = jd => new Date((jd - 2440587.5) * 86400000);

// ---- Fases de la luna (Meeus, cap. 49) -----------------------------------
function faseLunar(k) {   // k entero: luna nueva; +0.25 cuarto creciente; +0.5 llena; +0.75 cuarto menguante
  const T = k / 1236.85, s = Math.sin;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T * T - 0.00000011 * T ** 3) * RAD;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T ** 3 - 0.000000058 * T ** 4) * RAD;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T ** 3 + 0.000000011 * T ** 4) * RAD;
  const O = (124.7746 - 1.56375588 * k + 0.0020672 * T * T + 0.00000215 * T ** 3) * RAD;
  const fr = Math.round((k - Math.floor(k)) * 4) % 4;
  let c;
  if (fr === 0 || fr === 2) {
    const n = fr === 0;
    c = (n ? -0.4072 : -0.40614) * s(Mp) + (n ? 0.17241 : 0.17302) * E * s(M) + (n ? 0.01608 : 0.01614) * s(2 * Mp)
      + (n ? 0.01039 : 0.01043) * s(2 * F) + (n ? 0.00739 : 0.00734) * E * s(Mp - M) - (n ? 0.00514 : 0.00515) * E * s(Mp + M)
      + (n ? 0.00208 : 0.00209) * E * E * s(2 * M) - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F) + 0.00056 * E * s(2 * Mp + M)
      - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F) - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(O)
      - 0.00007 * s(Mp + 2 * M) + 0.00004 * s(2 * Mp - 2 * F) + 0.00004 * s(3 * M) + 0.00003 * s(Mp + M - 2 * F) + 0.00003 * s(2 * Mp + 2 * F)
      - 0.00003 * s(Mp + M + 2 * F) + 0.00003 * s(Mp - M + 2 * F) - 0.00002 * s(Mp - M - 2 * F) - 0.00002 * s(3 * Mp + M) + 0.00002 * s(4 * Mp);
  } else {
    const co = Math.cos;
    c = -0.62801 * s(Mp) + 0.17172 * E * s(M) - 0.01183 * E * s(Mp + M) + 0.00862 * s(2 * Mp) + 0.00804 * s(2 * F)
      + 0.00454 * E * s(Mp - M) + 0.00204 * E * E * s(2 * M) - 0.0018 * s(Mp - 2 * F) - 0.0007 * s(Mp + 2 * F) - 0.0004 * s(3 * Mp)
      - 0.00034 * E * s(2 * Mp - M) + 0.00032 * E * s(M + 2 * F) + 0.00032 * E * s(M - 2 * F) - 0.00028 * E * E * s(Mp + 2 * M)
      + 0.00027 * E * s(2 * Mp + M) - 0.00017 * s(O) - 0.00005 * s(Mp - M - 2 * F) + 0.00004 * s(2 * Mp + 2 * F) - 0.00004 * s(Mp + M + 2 * F)
      + 0.00004 * s(Mp - 2 * M) + 0.00003 * s(Mp + M - 2 * F) + 0.00003 * s(3 * M) + 0.00002 * s(2 * Mp - 2 * F) + 0.00002 * s(Mp - M + 2 * F)
      - 0.00002 * s(3 * Mp + M);
    const W = 0.00306 - 0.00038 * E * co(M) + 0.00026 * co(Mp) - 0.00002 * co(Mp - M) + 0.00002 * co(Mp + M) + 0.00002 * co(2 * F);
    c += fr === 1 ? W : -W;
  }
  return jdAFecha(jde + c - 70 / 86400);   // tiempo dinámico → UTC (ΔT ≈ 70 s)
}
const FASES = [["Luna nueva", "nueva"], ["Cuarto creciente", "creciente"], ["Luna llena", "llena"], ["Cuarto menguante", "menguante"]];
function fasesDelMes(a, m) {
  const ini = diaBo(a, m, 1, 0), fin = diaBo(a, m + 1, 1, 0), out = [];
  let k = Math.floor((a + m / 12 - 2000) * 12.3685) - 2;
  for (let i = 0; i < 24; i++, k += 0.25) {
    const t = faseLunar(k);
    if (t >= ini && t < fin) out.push({ t, tipo: Math.round((k - Math.floor(k)) * 4) % 4 });
  }
  return out;
}

// ---- Equinoccios y solsticios (Meeus, cap. 27, valores medios ± 15 min) --
function estaciones(a) {
  const Y = (a - 2000) / 1000, p = (c) => c[0] + c[1] * Y + c[2] * Y * Y + c[3] * Y ** 3 + c[4] * Y ** 4;
  return [
    { t: jdAFecha(p([2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057])), nombre: "Equinoccio: comienza el otoño" },
    { t: jdAFecha(p([2451716.56767, 365241.62603, 0.00325, 0.00888, -0.0003])), nombre: "Solsticio: comienza el invierno" },
    { t: jdAFecha(p([2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078])), nombre: "Equinoccio: comienza la primavera" },
    { t: jdAFecha(p([2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032])), nombre: "Solsticio: comienza el verano" },
  ];
}

// ---- Pascua y fiestas móviles ------------------------------------------------
function pascua(a) {   // algoritmo anónimo gregoriano
  const b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25),
    h = Math.floor((c - g + 1) / 3), i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4,
    L = (32 + 2 * f + 2 * k - i - l) % 7, m = Math.floor((b + 11 * i + 22 * L) / 451), mes = Math.floor((b + i + 7 * L - 114 * m + 31) / 31);
  return Date.UTC(a, mes - 1, ((b + i + 7 * L - 114 * m + 31) % 31) + 1);
}
function fechasMoviles(a) {
  const P = pascua(a), d = n => new Date(P + n * 86400000), r = {};
  const pon = (n, txt, tipo) => { const k = d(n).toISOString().slice(0, 10); (r[k] = r[k] || []).push({ txt, tipo }); };
  pon(-48, "Carnaval", "feriado"); pon(-47, "Carnaval", "feriado"); pon(-46, "Miércoles de Ceniza", "religiosa");
  pon(-7, "Domingo de Ramos", "religiosa"); pon(-3, "Jueves Santo", "religiosa"); pon(-2, "Viernes Santo", "feriado");
  pon(0, "Domingo de Pascua", "religiosa"); pon(39, "Ascensión del Señor", "religiosa"); pon(49, "Pentecostés", "religiosa");
  pon(60, "Corpus Christi", "feriado");
  return r;
}

// ---- Feriados y fechas cívicas y ambientales ---------------------------------
// Feriados nacionales según el DS 2750; cada año el Gobierno puede trasladarlos o añadir otros.
const FERIADOS_FIJOS = { "01-01": "Año Nuevo", "01-22": "Creación del Estado Plurinacional", "05-01": "Día del Trabajo",
  "06-21": "Año Nuevo Andino Amazónico Chaqueño", "08-06": "Día de la Independencia", "11-02": "Todos los Difuntos", "12-25": "Navidad" };
// Ajustes oficiales conocidos (DS 5521 para 2026)
const AJUSTES = {
  2026: { quitar: ["01-22", "06-21"], poner: { "01-02": "Feriado adicional de Año Nuevo", "01-23": "Creación del Estado Plurinacional (trasladado)",
          "06-05": "Feriado adicional de Corpus Christi", "06-22": "Año Nuevo Andino Amazónico (trasladado)", "08-07": "Feriado adicional de la Independencia" } },
};
const DEPARTAMENTAL = { "09-24": "Aniversario de Santa Cruz (feriado departamental)" };
const CIVICAS = { "03-19": "Día del Padre", "03-23": "Día del Mar", "04-12": "Día del Niño", "05-27": "Día de la Madre",
  "06-06": "Día del Maestro", "09-21": "Día del Estudiante y de la Primavera", "09-27": "Día de la Integración Boliviana" };
const AMBIENTALES = { "02-02": "Día Mundial de los Humedales", "03-03": "Día Mundial de la Vida Silvestre", "03-21": "Día Internacional de los Bosques",
  "03-22": "Día Mundial del Agua", "03-23": "Día Meteorológico Mundial", "04-22": "Día de la Madre Tierra", "05-04": "Día del Combatiente de Incendios Forestales",
  "05-22": "Día de la Diversidad Biológica", "06-05": "Día Mundial del Medio Ambiente", "06-08": "Día Mundial de los Océanos",
  "06-17": "Día de Lucha contra la Desertificación y la Sequía", "09-16": "Día de la Preservación de la Capa de Ozono",
  "10-01": "Día del Árbol en Bolivia", "10-04": "Día Mundial de los Animales · San Francisco de Asís, patrono de la ecología",
  "10-13": "Día para la Reducción del Riesgo de Desastres", "10-24": "Día de Acción contra el Cambio Climático",
  "12-05": "Día Mundial del Suelo", "12-11": "Día Internacional de las Montañas" };
function marcasDelDia(a, m, d, moviles) {
  const md = `${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, iso = `${a}-${md}`, out = [];
  const aj = AJUSTES[a] || { quitar: [], poner: {} };
  if (FERIADOS_FIJOS[md] && !aj.quitar.includes(md)) out.push({ txt: FERIADOS_FIJOS[md], tipo: "feriado" });
  if (aj.poner[md]) out.push({ txt: aj.poner[md], tipo: "feriado" });
  (moviles[iso] || []).forEach(x => out.push(x));
  if (DEPARTAMENTAL[md]) out.push({ txt: DEPARTAMENTAL[md], tipo: "departamental" });
  if (CIVICAS[md]) out.push({ txt: CIVICAS[md], tipo: "civica" });
  if (AMBIENTALES[md]) out.push({ txt: AMBIENTALES[md], tipo: "ambiental" });
  return out;
}

// ---- Dibujo de la luna como se ve desde el hemisferio sur ---------------------
function lunaSVG(frac, creciente, tam = 22) {
  const r = tam / 2 - 1, c = tam / 2, lado = creciente ? -1 : 1;   // en el sur, la luna creciente se ilumina por la izquierda
  const rx = Math.abs(1 - 2 * frac) * r, s1 = lado > 0 ? 1 : 0, s2 = frac < 0.5 ? (lado > 0 ? 0 : 1) : (lado > 0 ? 1 : 0);
  const luz = frac < 0.01 ? "" : frac > 0.99 ? `<circle cx="${c}" cy="${c}" r="${r}" fill="#F3E3A6"/>`
    : `<path d="M${c},${c - r} A${r},${r} 0 0 ${s1} ${c},${c + r} A${rx},${r} 0 0 ${s2} ${c},${c - r}Z" fill="#F3E3A6"/>`;
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}" class="luna"><circle cx="${c}" cy="${c}" r="${r}" fill="#2E3B35" stroke="#8a8a7a" stroke-width=".6"/>${luz}</svg>`;
}
function nombreFase(f, cre) {
  if (f < 0.015) return "Luna nueva";
  if (f > 0.985) return "Luna llena";
  if (Math.abs(f - 0.5) < 0.04) return cre ? "Cuarto creciente" : "Cuarto menguante";
  return f < 0.5 ? (cre ? "Creciente" : "Menguante") : (cre ? "Gibosa creciente" : "Gibosa menguante");
}

// ---- Clima (Open-Meteo, pronóstico de 16 días) -------------------------------
const CLIMA = { 0: ["☀️", "Despejado"], 1: ["🌤️", "Mayormente despejado"], 2: ["⛅", "Parcialmente nublado"], 3: ["☁️", "Nublado"],
  45: ["🌫️", "Niebla"], 48: ["🌫️", "Niebla"], 51: ["🌦️", "Llovizna"], 53: ["🌦️", "Llovizna"], 55: ["🌦️", "Llovizna intensa"],
  56: ["🌦️", "Llovizna helada"], 57: ["🌦️", "Llovizna helada"], 61: ["🌧️", "Lluvia débil"], 63: ["🌧️", "Lluvia"], 65: ["🌧️", "Lluvia fuerte"],
  66: ["🌧️", "Lluvia helada"], 67: ["🌧️", "Lluvia helada"], 71: ["🌨️", "Nieve"], 73: ["🌨️", "Nieve"], 75: ["🌨️", "Nieve"], 77: ["🌨️", "Nieve"],
  80: ["🌦️", "Chubascos"], 81: ["🌦️", "Chubascos"], 82: ["⛈️", "Chubascos fuertes"], 85: ["🌨️", "Nieve"], 86: ["🌨️", "Nieve"],
  95: ["⛈️", "Tormenta"], 96: ["⛈️", "Tormenta con granizo"], 99: ["⛈️", "Tormenta con granizo"] };
let clima = {}, climaLugar = null;
async function cargarClima() {
  if (climaLugar === lugar.nombre) return;
  clima = {}; climaLugar = lugar.nombre;
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${lugar.lat}&longitude=${lugar.lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration` +
      `&hourly=soil_moisture_9_to_27cm&timezone=${encodeURIComponent(ZONA)}&past_days=31&forecast_days=16`;
    const r = await fetch(u); if (!r.ok) return;
    const j = await r.json(), D = j.daily, H = j.hourly || {}, sm = {};
    (H.time || []).forEach((t, i) => { const v = H.soil_moisture_9_to_27cm[i]; if (v == null) return; const k = t.slice(0, 10); (sm[k] = sm[k] || []).push(v); });
    D.time.forEach((t, i) => { clima[t] = { cod: D.weather_code[i], max: D.temperature_2m_max[i], min: D.temperature_2m_min[i],
      lluvia: D.precipitation_sum[i], prob: D.precipitation_probability_max[i], viento: D.wind_speed_10m_max[i], et0: D.et0_fao_evapotranspiration[i],
      suelo: sm[t] ? sm[t].reduce((x, y) => x + y, 0) / sm[t].length : null }; });
  } catch (e) { climaLugar = null; }
}

// ---- Pasadas de Landsat y Sentinel-2 ------------------------------------------
const SATS = [
  { nombre: "Landsat 8", re: /^LANDSAT 8\b/, franja: 185, corto: "L8" }, { nombre: "Landsat 9", re: /^LANDSAT 9\b/, franja: 185, corto: "L9" },
  { nombre: "Sentinel-2A", re: /^SENTINEL-2A\b/, franja: 290, corto: "S2A" }, { nombre: "Sentinel-2B", re: /^SENTINEL-2B\b/, franja: 290, corto: "S2B" },
  { nombre: "Sentinel-2C", re: /^SENTINEL-2C\b/, franja: 290, corto: "S2C" },
];
let orbitasListas = false;
async function cargarOrbitas() {
  try {
    const r = await fetch("../satelites/tles.txt?" + Math.floor(Date.now() / 3600000)); if (!r.ok) return;
    const l = (await r.text()).split(/\r?\n/).map(x => x.trim());
    for (const s of SATS) { const i = l.findIndex(x => s.re.test(x)); if (i >= 0) s.satrec = satellite.twoline2satrec(l[i + 1], l[i + 2]); }
    orbitasListas = SATS.some(s => s.satrec);
  } catch (e) {}
}
function distKm(a1, o1, a2, o2) {
  const a = Math.sin((a2 - a1) * RAD / 2) ** 2 + Math.cos(a1 * RAD) * Math.cos(a2 * RAD) * Math.sin((o2 - o1) * RAD / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(a)));
}
function subp(s, t) {
  const pv = satellite.propagate(s.satrec, new Date(t)); if (!pv || !pv.position) return null;
  const g = satellite.eciToGeodetic(pv.position, satellite.gstime(new Date(t)));
  return [satellite.degreesLat(g.latitude), satellite.degreesLong(g.longitude)];
}
const MAX_DIAS_ORBITA = 45;   // más allá, la órbita publicada pierde precisión
function pasadasMes(a, m) {
  const out = {};
  if (!orbitasListas) return out;
  const t0 = Math.max(diaBo(a, m, 1, 0).getTime(), Date.now() - MAX_DIAS_ORBITA * 86400000);
  const t1 = Math.min(diaBo(a, m + 1, 1, 0).getTime(), Date.now() + MAX_DIAS_ORBITA * 86400000);
  if (t1 <= t0) return out;
  for (const s of SATS) {
    if (!s.satrec) continue;
    let d2 = Infinity, d1 = Infinity;
    for (let t = t0; t <= t1; t += 60000) {
      const p = subp(s, t), d = p ? distKm(lugar.lat, lugar.lon, p[0], p[1]) : Infinity;
      if (d1 < d2 && d1 <= d && d1 < s.franja / 2 + 400) {
        let a1 = t - 120000, b1 = t;   // refinar el mínimo al segundo
        while (b1 - a1 > 1000) { const m1 = a1 + (b1 - a1) / 3, m2 = b1 - (b1 - a1) / 3;
          const f1 = distKm(lugar.lat, lugar.lon, ...subp(s, m1)), f2 = distKm(lugar.lat, lugar.lon, ...subp(s, m2));
          if (f1 < f2) b1 = m2; else a1 = m1; }
        const tt = (a1 + b1) / 2, dd = distKm(lugar.lat, lugar.lon, ...subp(s, tt));
        const sol = SunCalc.getPosition(new Date(tt), lugar.lat, lugar.lon).altitude / RAD;
        if (dd <= s.franja / 2 && sol > 5) { const k = claveDia(new Date(tt)); (out[k] = out[k] || []).push({ s, t: new Date(tt) }); }
      }
      d2 = d1; d1 = d;
    }
  }
  return out;
}

// ---- Construcción del mes ------------------------------------------------------
function datosDia(a, m, d, moviles) {
  const f = diaBo(a, m, d, 12), sol = SunCalc.getTimes(f, lugar.lat, lugar.lon);
  const lunaT = SunCalc.getMoonTimes(diaBo(a, m, d, 0), lugar.lat, lugar.lon, false);
  const il = SunCalc.getMoonIllumination(diaBo(a, m, d, 21));   // aspecto de la luna a las 21:00
  const durMin = (sol.sunset - sol.sunrise) / 60000;
  return { f, d, sol, lunaT, il, cre: il.phase < 0.5, durMin, santo: SANTORAL[m][d - 1], marcas: marcasDelDia(a, m, d, moviles) };
}
// ---- Huerta y chaco: cultivo y actividad elegidos ---------------------------------
let cultivo = "maiz", actividad = "siembra", vista = "cal", diasMes = [];
const isoDe = (a, m, d) => `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const hoyISO = () => fmt(new Date(), { year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-");
const NIV = ["Baja", "Media", "Alta"];
const marcaHTML = z => `<div class="m ${z.tipo}">${z.tipo === "feriado" ? "Feriado · " : z.tipo === "ambiental" ? "🌱 " : ""}${z.txt}</div>`;

function render() {
  const nd = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const moviles = fechasMoviles(anio), fases = fasesDelMes(anio, mes), pas = pasadasMes(anio, mes);
  const est = estaciones(anio).filter(e => claveDia(e.t).endsWith(`/${String(mes + 1).padStart(2, "0")}/${anio}`));
  document.getElementById("titMes").textContent = `${NOMBRE_MES[mes]} ${anio}`;
  document.getElementById("fases").innerHTML = fases.map(x => `<div class="fase">${lunaSVG([0, 0.5, 1, 0.5][x.tipo], x.tipo < 2, 30)}
      <div><b>${FASES[x.tipo][0]}</b><br>${fmt(x.t, { weekday: "short", day: "numeric" })} · ${hora(x.t)} h</div></div>`).join("") +
    est.map(e => `<div class="fase est"><span class="ico">${e.nombre.includes("Solsticio") ? "☀️" : "🌗"}</span>
      <div><b>${e.nombre.split(":")[0]}</b><br>${fmt(e.t, { weekday: "short", day: "numeric" })} · ${hora(e.t)} h<br><small>${e.nombre.split(": ")[1]}</small></div></div>`).join("");
  const faseDia = {}; fases.forEach(x => { faseDia[claveDia(x.t)] = x; });
  const hk = claveDia(new Date()), hI = hoyISO();
  diasMes = [];
  for (let d = 1; d <= nd; d++) {
    const x = datosDia(anio, mes, d, moviles), k = claveDia(x.f), iso = isoDe(anio, mes, d);
    x.iso = iso; x.k = k; x.hoy = k === hk; x.cl = clima[iso]; x.fz = faseDia[k]; x.pas = pas[k] || [];
    x.dom = fmt(x.f, { weekday: "long" }) === "domingo"; x.fer = x.marcas.some(z => z.tipo === "feriado");
    x.rec = recomendar(cultivo, actividad, iso, clima, hI, { cre: x.cre, frac: x.il.fraction });
    diasMes.push(x);
  }
  vista === "cal" ? renderCal() : renderLista();
  document.getElementById("vCal").classList.toggle("act", vista === "cal");
  document.getElementById("vLista").classList.toggle("act", vista === "lista");
  const fueraOrb = diaBo(anio, mes, 1, 0) > Date.now() + MAX_DIAS_ORBITA * 86400000 || diaBo(anio, mes + 1, 1, 0) < Date.now() - MAX_DIAS_ORBITA * 86400000;
  document.getElementById("notaSat").textContent = !orbitasListas ? "Satélites: no se pudieron cargar las órbitas." :
    fueraOrb ? `Satélites: se muestran solo hasta ${MAX_DIAS_ORBITA} días antes o después de hoy (más allá, el cálculo pierde precisión).` : "";
  renderHoy(); renderHumedad();
}
function renderCal() {
  const cab = ["do.", "lu.", "ma.", "mi.", "ju.", "vi.", "sá."];
  const primero = new Date(Date.UTC(anio, mes, 1)).getUTCDay();
  let h = `<div class="grid">${cab.map(c => `<div class="gcab">${c}</div>`).join("")}`;
  for (let i = 0; i < primero; i++) h += `<div class="gvacio"></div>`;
  for (const x of diasMes) {
    const ci = x.cl ? (CLIMA[x.cl.cod] || ["", ""])[0] : "";
    const ico = (x.marcas.some(z => z.tipo === "ambiental") ? "🌱" : "") + (x.pas.length ? "🛰️" : "");
    h += `<div class="gdia ${x.dom ? "dom" : ""} ${x.fer ? "fer" : ""} ${x.hoy ? "hoy" : ""}" data-d="${x.d}" tabindex="0" role="button" aria-label="${x.d} de ${NOMBRE_MES[mes]}">
      <div class="gnum">${x.d}</div><div class="glun">${lunaSVG(x.il.fraction, x.cre, 16)}</div>
      <div class="gcli">${ci}${x.cl ? `<span>${Math.round(x.cl.max)}°</span>` : ""}</div>
      <div class="gico">${ico}</div>
      ${x.fer ? `<div class="gfer">${x.marcas.find(z => z.tipo === "feriado").txt}</div>` : ""}
      <div class="grec e-${x.rec.estado}">${x.rec.corto}</div></div>`;
  }
  document.getElementById("vista").innerHTML = h + "</div>";
  document.querySelectorAll(".gdia").forEach(el => { el.onclick = () => ficha(+el.dataset.d); el.onkeydown = e => { if (e.key === "Enter") ficha(+el.dataset.d); }; });
}
function renderLista() {
  let html = `<table><thead><tr><th>Día</th><th>Santoral y fechas</th><th>☀️ Sol<br><small>sale / se pone</small></th><th>🌙 Luna</th><th class="cli">Clima</th>
    <th>${CULTIVOS[cultivo].nombre} · ${ACTIVIDADES[actividad].toLowerCase()}</th><th class="sat">🛰️ Satélites</th></tr></thead><tbody>`;
  for (const x of diasMes) {
    const cl = x.cl, fz = x.fz;
    html += `<tr class="${x.dom ? "dom" : ""} ${x.fer ? "fer" : ""} ${x.hoy ? "hoy" : ""}" data-d="${x.d}">
      <td class="num">${x.d}<div class="dsem">${fmt(x.f, { weekday: "short" }).replace(".", "")}</div></td>
      <td class="santo">${x.santo}${x.marcas.map(marcaHTML).join("")}</td>
      <td class="sol">${hora(x.sol.sunrise)}<br>${hora(x.sol.sunset)}<div class="dur">${Math.floor(x.durMin / 60)} h ${Math.round(x.durMin % 60)} min</div></td>
      <td class="lun">${lunaSVG(x.il.fraction, x.cre)}<div>${fz ? `<b>${FASES[fz.tipo][0]}</b> ${hora(fz.t)}` : `${nombreFase(x.il.fraction, x.cre)} ${Math.round(x.il.fraction * 100)} %`}</div>
        <div class="lt">↑${x.lunaT.rise ? hora(x.lunaT.rise) : " —"} ↓${x.lunaT.set ? hora(x.lunaT.set) : " —"}</div></td>
      <td class="cli">${cl ? `<span class="ci" title="${(CLIMA[cl.cod] || ["", ""])[1]}">${(CLIMA[cl.cod] || ["·"])[0]}</span>
        <div>${Math.round(cl.max)}° / ${Math.round(cl.min)}°</div><div class="ll">${cl.lluvia >= 0.1 ? `💧 ${cl.lluvia.toFixed(cl.lluvia < 10 ? 1 : 0)} mm` : ""}</div>` : ""}</td>
      <td><span class="chip e-${x.rec.estado}">${x.rec.corto}</span>${x.rec.certeza ? `<div class="cert">Certeza ${NIV[x.rec.certeza.n].toLowerCase()}</div>` : ""}</td>
      <td class="sat">${x.pas.map(p => `<div><b>${p.s.nombre}</b> ${hora(p.t)}</div>`).join("")}</td></tr>`;
  }
  document.getElementById("vista").innerHTML = html + "</tbody></table>";
  document.querySelectorAll("#vista tr[data-d]").forEach(el => el.onclick = () => ficha(+el.dataset.d));
}
// ---- Ficha completa de un día -----------------------------------------------------
function ficha(d) {
  const x = diasMes[d - 1], cl = x.cl, R = x.rec, C = CULTIVOS[cultivo];
  const certeza = R.certeza ? `<span class="nivel n${R.certeza.n}">Certeza ${NIV[R.certeza.n].toLowerCase()}</span> <small>${R.certeza.txt}</small>` : "";
  const otras = Object.keys(ACTIVIDADES).filter(a => a !== actividad).map(a => {
    const o = recomendar(cultivo, a, x.iso, clima, hoyISO(), { cre: x.cre, frac: x.il.fraction });
    return `<div class="otra"><b>${ACTIVIDADES[a]}:</b> <span class="chip e-${o.estado}">${o.corto}</span> ${o.titulo}</div>`; }).join("");
  document.getElementById("fichaCont").innerHTML = `
    <div class="fcab"><div><div class="hd">${fmt(x.f, { weekday: "long" })}</div><div class="fn">${d} de ${NOMBRE_MES[mes].toLowerCase()} de ${anio}</div></div>
      <button class="cerrar" onclick="cerrarFicha()" aria-label="Cerrar">✕</button></div>
    <div class="hsanto">${x.santo}</div>${x.marcas.map(marcaHTML).join("")}
    <div class="rec e-${R.estado}">
      <div class="rtit">${C.nombre} · ${ACTIVIDADES[actividad].toLowerCase()}</div>
      <div class="rest">${R.titulo}</div>
      <div class="rcert">${certeza}</div>
      <ul>${R.razones.map(z => `<li class="${z.nota ? "nota" : ""}">${z.t} <small>(${z.f})</small></li>`).join("")}</ul>
      ${R.tradicion ? `<div class="trad">🌙 <b>Tradición popular</b> <span class="nivel ntrad">sin respaldo científico</span><br>${R.tradicion.txt}</div>` : ""}
      ${otras ? `<div class="otras">${otras}</div>` : ""}
    </div>
    <div class="fbloque"><b>☀️ Sol</b> sale ${hora(x.sol.sunrise)} · se pone ${hora(x.sol.sunset)} · ${Math.floor(x.durMin / 60)} h ${Math.round(x.durMin % 60)} min de luz</div>
    <div class="fbloque"><b>🌙 Luna</b> ${lunaSVG(x.il.fraction, x.cre, 18)} ${x.fz ? `<b>${FASES[x.fz.tipo][0]}</b> a las ${hora(x.fz.t)}` : nombreFase(x.il.fraction, x.cre)},
      iluminada ${Math.round(x.il.fraction * 100)} % · sale ${x.lunaT.rise ? hora(x.lunaT.rise) : "—"} · se pone ${x.lunaT.set ? hora(x.lunaT.set) : "—"}</div>
    <div class="fbloque"><b>🌦️ Clima</b> ${cl ? `${(CLIMA[cl.cod] || ["", ""])[0]} ${(CLIMA[cl.cod] || ["", "—"])[1]} · máx. ${Math.round(cl.max)}° · mín. ${Math.round(cl.min)}°
      · lluvia ${cl.lluvia.toFixed(1)} mm${cl.prob != null ? ` (prob. ${cl.prob} %)` : ""} · viento ${Math.round(cl.viento)} km/h
      ${cl.et0 != null ? `· evaporación ${cl.et0.toFixed(1)} mm` : ""}${cl.suelo != null ? ` · humedad del suelo ${(cl.suelo * 100).toFixed(0)} %` : ""}` :
      "Sin datos: hay datos del último mes y pronóstico de los próximos 16 días."}</div>
    <div class="fbloque"><b>🛰️ Satélites</b> ${x.pas.length ? x.pas.map(p => `${p.s.nombre} a las ${hora(p.t)}`).join(" · ") : "Ninguna pasada de Landsat o Sentinel-2 sobre el lugar."}</div>`;
  document.getElementById("ficha").classList.add("on");
}
function cerrarFicha() { document.getElementById("ficha").classList.remove("on"); }
// ---- ¿Hay humedad para sembrar? ------------------------------------------------------
function renderHumedad() {
  const el = document.getElementById("humedad"), h = hoyISO(), c = clima[h];
  if (!c) { el.innerHTML = "<b>¿Hay humedad para sembrar?</b> Cargando datos de lluvia…"; return; }
  const l7 = suma(clima, h, -6, 0, "lluvia").s, l30 = suma(clima, h, -29, 0, "lluvia").s, p7 = suma(clima, h, 1, 7, "lluvia").s;
  let prox = null; for (let i = 1; i <= 15; i++) { const z = clima[isoMas(h, i)]; if (z && z.lluvia >= 5) { prox = { i, mm: z.lluvia }; break; } }
  const s = c.suelo, est = s == null ? null : s < 0.15 ? ["seco", "e-no"] : s < 0.22 ? ["con poca humedad", "e-posible"] : s < 0.38 ? ["húmedo", "e-bien"] : ["muy húmedo o encharcado", "e-ligero"];
  el.innerHTML = `<b>¿Hay humedad para sembrar? · ${lugar.nombre}</b>
    <div class="hum">${est ? `<span class="chip ${est[1]}">Suelo ${est[0]}</span> <small>(${(s * 100).toFixed(0)} % de agua entre 9 y 27 cm)</small>` : ""}
    <span>Lluvia: últimos 7 días <b>${l7.toFixed(0)} mm</b> · últimos 30 días <b>${l30.toFixed(0)} mm</b> · próximos 7 días <b>${p7.toFixed(0)} mm</b></span>
    <span>${prox ? `Próxima lluvia de importancia: <b>${prox.i === 1 ? "mañana" : `en ${prox.i} días`}</b> (${prox.mm.toFixed(0)} mm)` : "Sin lluvias importantes en los próximos 15 días"}</span></div>`;
}
function renderHoy() {
  const n = new Date(), a = +fmt(n, { year: "numeric" }), m = +fmt(n, { month: "numeric" }) - 1, d = +fmt(n, { day: "numeric" });
  const x = datosDia(a, m, d, fechasMoviles(a)), il = SunCalc.getMoonIllumination(n), cre = il.phase < 0.5;
  const iso = `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, cl = clima[iso];
  // próxima pasada de Landsat / Sentinel-2
  let prox = null;
  if (orbitasListas) {
    const p = pasadasMes(a, m), p2 = pasadasMes(m === 11 ? a + 1 : a, (m + 1) % 12);
    prox = Object.values(Object.assign({}, p, p2)).flat().filter(z => z.t > n).sort((u, v) => u.t - v.t)[0];
  }
  const proxFase = (() => { let k = Math.floor((a + m / 12 - 2000) * 12.3685) - 1;
    for (let i = 0; i < 12; i++, k += 0.25) { const t = faseLunar(k); if (t > n) return { t, tipo: Math.round((k - Math.floor(k)) * 4) % 4 }; } })();
  document.getElementById("hoy").innerHTML = `
    <div class="hfecha"><div class="hd">${fmt(n, { weekday: "long" })}</div><div class="hn">${d}</div><div class="hm">${NOMBRE_MES[m]} ${a}</div></div>
    <div class="hcol"><div class="hsanto">${x.santo}</div>${x.marcas.map(z => `<div class="m ${z.tipo}">${z.tipo === "feriado" ? "Feriado · " : z.tipo === "ambiental" ? "🌱 " : ""}${z.txt}</div>`).join("")}
      <div class="hfila">☀️ Sale <b>${hora(x.sol.sunrise)}</b> · se pone <b>${hora(x.sol.sunset)}</b> · ${Math.floor(x.durMin / 60)} h ${Math.round(x.durMin % 60)} min de luz</div>
      <div class="hfila">${lunaSVG(il.fraction, cre, 20)} ${nombreFase(il.fraction, cre)}, iluminada ${Math.round(il.fraction * 100)} % · sale ${x.lunaT.rise ? hora(x.lunaT.rise) : "—"}, se pone ${x.lunaT.set ? hora(x.lunaT.set) : "—"}
        ${proxFase ? `<br><small>Próxima fase: ${FASES[proxFase.tipo][0].toLowerCase()} el ${fmt(proxFase.t, { weekday: "long", day: "numeric" })} a las ${hora(proxFase.t)}</small>` : ""}</div>
      ${cl ? `<div class="hfila">${(CLIMA[cl.cod] || ["", ""])[0]} ${(CLIMA[cl.cod] || ["", "—"])[1]} · máx. ${Math.round(cl.max)}° · mín. ${Math.round(cl.min)}° · lluvia ${cl.lluvia.toFixed(1)} mm (${cl.prob ?? "—"} %) · viento ${Math.round(cl.viento)} km/h</div>` : ""}
      ${prox ? `<div class="hfila">🛰️ Próxima imagen satelital: <b>${prox.s.nombre}</b> el ${fmt(prox.t, { weekday: "long", day: "numeric" })} a las ${hora(prox.t)}</div>` : ""}
    </div>`;
}

// ---- Inicio ---------------------------------------------------------------------
async function actualizar() { await cargarClima(); render(); }
document.getElementById("ant").onclick = () => { mes--; if (mes < 0) { mes = 11; anio--; } render(); };
document.getElementById("sig").onclick = () => { mes++; if (mes > 11) { mes = 0; anio++; } render(); };
document.getElementById("hoyBtn").onclick = () => { anio = +fmt(new Date(), { year: "numeric" }); mes = +fmt(new Date(), { month: "numeric" }) - 1; render();
  document.querySelector(".hoy[data-d]")?.scrollIntoView({ behavior: "smooth", block: "center" }); };
document.getElementById("lugar").onchange = e => { lugar = LUGARES[e.target.value]; document.getElementById("lugarTxt").textContent = lugar.nombre; actualizar(); };
document.getElementById("imprimir").onclick = () => window.print();
document.getElementById("cultivo").onchange = e => { cultivo = e.target.value; render(); };
document.getElementById("actividad").onchange = e => { actividad = e.target.value; render(); };
document.getElementById("vCal").onclick = () => { vista = "cal"; render(); };
document.getElementById("vLista").onclick = () => { vista = "lista"; render(); };
document.getElementById("ficha").onclick = e => { if (e.target.id === "ficha") cerrarFicha(); };
document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarFicha(); });
(async () => { render(); await Promise.all([cargarClima(), cargarOrbitas()]); render(); })();
