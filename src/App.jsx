import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "firebase/firestore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  saveJourneySummary,
  subscribeLatestJourneySummary,
  deleteJourneySummary,
} from "./firebaseStore";
import InfografiaPromo from "./InfografiaPromo";


/**
 * Quiniela Mundial 2026
 * ------------------------------------------------------------
 * ARQUITECTURA GENERAL
 * ------------------------------------------------------------
 * 1) Importación Excel:
 *    - Se importa la quiniela del usuario desde el archivo Excel.
 *    - La hoja de grupos es la única fuente confiable para standings.
 *    - Las hojas knockout pueden contener fórmulas; por eso NO deben
 *      tomarse como fuente absoluta para poblar equipos futuros.
 *
 * 2) Dos mundos separados:
 *    - Apuesta del usuario: marcadores importados desde Excel / edición usuario.
 *    - Resultados oficiales: marcadores capturados por admin.
 *
 * 3) Motor del torneo:
 *    - El avance real del torneo debe construirse por lógica:
 *      standings + terceros + ganadores/perdedores por fase.
 *    - La app evita depender de fórmulas calculadas del .xlsm.
 *
 * 4) Persistencia:
 *    - Firestore guarda store global, jornadas y resultados.
 *
 * 5) Vistas:
 *    - Home / usuario / admin / tabla.
 *
 * NOTA DE MANTENIMIENTO:
 * - Si cambia la estructura del Excel, revisar primero parseExcel(),
 *   readPhaseSheet() y el motor de resolución de llaves.
 */

const SHEETJS = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
const ADMIN_PASSWORD = "mundial2026";
const RANK_SNAPSHOT_KEY = "quiniela_rank_snapshot_v1";

const GROUPS = {
  A: ["México", "Sudáfrica", "Corea del Sur", "Rep. Checa/Dinamarca*"],
  B: ["Canadá", "Bosnia/Italia*", "Qatar", "Suiza"],
  C: ["Brasil", "Marruecos", "Haití", "Escocia"],
  D: ["Estados Unidos", "Paraguay", "Australia", "Kosovo/Turquía*"],
  E: ["Alemania", "Curazao", "Costa de Marfil", "Ecuador"],
  F: ["Países Bajos", "Japón", "Suecia/Polonia*", "Túnez"],
  G: ["Bélgica", "Egipto", "Irán", "Nueva Zelanda"],
  H: ["España", "Cabo Verde", "Arabia Saudita", "Uruguay"],
  I: ["Francia", "Senegal", "Bolivia/Irak*", "Noruega"],
  J: ["Argentina", "Argelia", "Austria", "Jordania"],
  K: ["Portugal", "Jamaica/RD Congo*", "Uzbekistán", "Colombia"],
  L: ["Inglaterra", "Croacia", "Ghana", "Panamá"],
};

const // Mapa central de banderas.
// Se mantiene aquí porque:
// 1) evita depender del Excel para símbolos visuales
// 2) permite corregir banderas erróneas en un solo lugar
// 3) soporta cruces de repechaje mostrando doble bandera cuando aplica
FLAGS = {
  "México": "🇲🇽",
  "Sudáfrica": "🇿🇦",
  "Corea del Sur": "🇰🇷",
  "Canadá": "🇨🇦",
  "Qatar": "🇶🇦",
  "Suiza": "🇨🇭",
  "Brasil": "🇧🇷",
  "Marruecos": "🇲🇦",
  "Haití": "🇭🇹",
  "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Estados Unidos": "🇺🇸",
  "Paraguay": "🇵🇾",
  "Australia": "🇦🇺",
  "Alemania": "🇩🇪",
  "Curazao": "🇨🇼",
  "Costa de Marfil": "🇨🇮",
  "Ecuador": "🇪🇨",
  "Países Bajos": "🇳🇱",
  "Japón": "🇯🇵",
  "Túnez": "🇹🇳",
  "Bélgica": "🇧🇪",
  "Egipto": "🇪🇬",
  "Irán": "🇮🇷",
  "Nueva Zelanda": "🇳🇿",
  "España": "🇪🇸",
  "Cabo Verde": "🇨🇻",
  "Arabia Saudita": "🇸🇦",
  "Uruguay": "🇺🇾",
  "Francia": "🇫🇷",
  "Senegal": "🇸🇳",
  "Noruega": "🇳🇴",
  "Argentina": "🇦🇷",
  "Argelia": "🇩🇿",
  "Austria": "🇦🇹",
  "Jordania": "🇯🇴",
  "Portugal": "🇵🇹",
  "Uzbekistán": "🇺🇿",
  "Colombia": "🇨🇴",
  "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Croacia": "🇭🇷",
  "Ghana": "🇬🇭",
  "Panamá": "🇵🇦",

  "Bosnia": "🇧🇦",
  "Italia": "🇮🇹",
  "Rep. Checa": "🇨🇿",
  "Dinamarca": "🇩🇰",
  "Kosovo": "🇽🇰",
  "Turquía": "🇹🇷",
  "Suecia": "🇸🇪",
  "Polonia": "🇵🇱",
  "Jamaica": "🇯🇲",
  "RD Congo": "🇨🇩",
  "Bolivia": "🇧🇴",
  "Irak": "🇮🇶",
  "República Checa": "🇨🇿",
  "República Dominicana": "🇩🇴",
  "Congo": "🇨🇩",
  "Costa Rica": "🇨🇷",

  "Definir ganador": "🏳️",
  "Perdedor SF-01": "🏳️",
  "Perdedor SF-02": "🏳️",
  "Ganador QF-01": "🏳️",
  "Ganador QF-02": "🏳️",
  "Ganador QF-03": "🏳️",
  "Ganador QF-04": "🏳️",
};

const PALETTE = [
  "#22c55e", "#38bdf8", "#f59e0b", "#a78bfa", "#fb7185",
  "#14b8a6", "#f97316", "#60a5fa", "#e879f9", "#facc15",
];

const STAGE_LABELS = {
  Grupos: "Fase de grupos",
  "16avos": "16avos",
  Cuartos: "Cuartos",
  Semis: "Semifinales",
  Final: "Final",
};

  const ENTRY_FEE = 500; // MXN
  const HOUSE_FEE_PERCENT = 0.1; // 10%

/* =============================
   FIREBASE / PERSISTENCIA
============================= */

async function loadStoreFromFirebase() {
  console.log("Cargando desde Firebase...");

  const ref = doc(db, "quiniela", "main");
  const snap = await getDoc(ref);

  if (snap.exists()) {
    console.log("Datos encontrados en Firebase:", snap.data());
    return snap.data();
  }

  console.log("No había datos en Firebase todavía.");
  return {};
}

async function saveStoreToFirebase(store) {
  console.log("Guardando en Firebase:", store);

  const ref = doc(db, "quiniela", "main");
  await setDoc(ref, store, { merge: true });

  console.log("Guardado OK en Firebase");
}
/* =============================
   CATÁLOGO / UTILIDADES VISUALES
============================= */

function getFlag(team) {
  const clean = cleanTeamName(team);
  if (!clean) return "🏳️";

  // Si el nombre es un cruce de repechaje (ej. "Bosnia/Italia*"),
  // intentamos pintar ambas banderas para no perder contexto visual.
  if (clean.includes("/")) {
    const parts = clean.replace(/\*/g, "").split("/").map((x) => cleanTeamName(x)).filter(Boolean);
    const flags = parts.map((part) => FLAGS[part]).filter(Boolean);
    if (flags.length) return flags.join(" ");
  }

  return FLAGS[clean] || "🏳️";
}

function randomColor() {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

function genGroupMatches() {
  const out = [];
  Object.entries(GROUPS).forEach(([group, teams]) => {
    let order = 1;
    for (let i = 0; i < teams.length; i += 1) {
      for (let j = i + 1; j < teams.length; j += 1) {
        out.push({
          id: `${group}${i}${j}`,
          group,
          home: teams[i],
          away: teams[j],
          stage: "Grupos",
          orderInGroup: order,
        });
        order += 1;
      }
    }
  });
  return out;
}

const GROUP_MATCHES = genGroupMatches();

const R16_PAIRS = [
  ["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"],
  ["I", "J"], ["K", "L"], ["B", "A"], ["D", "C"],
  ["F", "E"], ["H", "G"], ["J", "I"], ["L", "K"],
  ["A", "C"], ["E", "G"], ["I", "K"], ["B", "D"],
];

const R16 = R16_PAIRS.map(([a, b], i) => ({
  id: `R16-${String(i + 1).padStart(2, "0")}`,
  stage: "16avos",
  grpA: a,
  grpB: b,
}));

// 8vos: cada partido toma 2 ganadores de 16vos consecutivos.
const OF = Array.from({ length: 8 }, (_, i) => ({
  id: `OF-${String(i + 1).padStart(2, "0")}`,
  stage: "8vos",
  r16A: `R16-${String(i * 2 + 1).padStart(2, "0")}`,
  r16B: `R16-${String(i * 2 + 2).padStart(2, "0")}`,
}));

// 4tos: cada partido toma 2 ganadores de 8vos consecutivos.
const QF = Array.from({ length: 4 }, (_, i) => ({
  id: `QF-${String(i + 1).padStart(2, "0")}`,
  stage: "4tos",
  ofA: `OF-${String(i * 2 + 1).padStart(2, "0")}`,
  ofB: `OF-${String(i * 2 + 2).padStart(2, "0")}`,
}));

// Semifinales: 2 partidos.
const SF = Array.from({ length: 2 }, (_, i) => ({
  id: `SF-${String(i + 1).padStart(2, "0")}`,
  stage: "Semis",
  qfA: `QF-${String(i * 2 + 1).padStart(2, "0")}`,
  qfB: `QF-${String(i * 2 + 2).padStart(2, "0")}`,
}));

const FINALS = [
  { id: "3RO-01", stage: "3er lugar", sfA: "SF-01", sfB: "SF-02" },
  { id: "FINAL", stage: "Final", sfA: "SF-01", sfB: "SF-02" },
];

const FINAL_MATCHES = 2;
const TOTAL_MATCHES = 104;

// Reglamento oficial de puntuación.
// El marcador exacto ya incluye el acierto de resultado: vale 3 puntos totales, no 4.
const SCORING_RULES = {
  result: 1,
  exact: 3,
  groupLeader: 5,
  groupQualifiers: 10,
  semifinalists: 30,
  finalists: 35,
  champion: 50,
};

const MATCH_META = buildDefaultMatchMeta();

function buildDefaultMatchMeta() {
  const meta = {};
  const days = [
    { date: "2026-06-11", label: "Jueves 11 de junio", time: "13:00" },
    { date: "2026-06-12", label: "Viernes 12 de junio", time: "16:00" },
    { date: "2026-06-13", label: "Sábado 13 de junio", time: "19:00" },
    { date: "2026-06-14", label: "Domingo 14 de junio", time: "21:00" },
    { date: "2026-06-15", label: "Lunes 15 de junio", time: "13:00" },
    { date: "2026-06-16", label: "Martes 16 de junio", time: "16:00" },
  ];
  const venues = [
    ["Estadio Azteca", "Ciudad de México"],
    ["Estadio BBVA", "Monterrey"],
    ["Akron Stadium", "Guadalajara"],
    ["MetLife Stadium", "Nueva York / Nueva Jersey"],
    ["SoFi Stadium", "Los Ángeles"],
    ["AT&T Stadium", "Dallas"],
    ["BC Place", "Vancouver"],
    ["BMO Field", "Toronto"],
  ];

  GROUP_MATCHES.forEach((match, index) => {
    const day = days[index % days.length];
    const venue = venues[index % venues.length];
    meta[match.id] = {
      date: day.date,
      dayLabel: day.label,
      time: day.time,
      stadium: venue[0],
      city: venue[1],
      sectionLabel: day.label,
      sortOrder: index + 1,
    };
  });

  R16.forEach((match, index) => {
    const venue = venues[index % venues.length];
    meta[match.id] = {
      date: `2026-07-${String(2 + Math.floor(index / 4)).padStart(2, "0")}`,
      dayLabel: `Eliminatoria · Día ${Math.floor(index / 4) + 1}`,
      time: ["13:00", "16:00", "19:00", "21:00"][index % 4],
      stadium: venue[0],
      city: venue[1],
      sectionLabel: `16avos · Día ${Math.floor(index / 4) + 1}`,
      sortOrder: 200 + index,
    };
  });

  OF.forEach((match, index) => {
    const venue = venues[index % venues.length];
    meta[match.id] = {
      date: `2026-07-${String(6 + Math.floor(index / 4)).padStart(2, "0")}`,
      dayLabel: `8vos · Día ${Math.floor(index / 4) + 1}`,
      time: ["13:00", "16:00", "19:00", "21:00"][index % 4],
      stadium: venue[0],
      city: venue[1],
      sectionLabel: `8vos · Día ${Math.floor(index / 4) + 1}`,
      sortOrder: 250 + index,
    };
  });

  QF.forEach((match, index) => {
    const venue = venues[index % venues.length];
    meta[match.id] = {
      date: `2026-07-${String(8 + Math.floor(index / 4)).padStart(2, "0")}`,
      dayLabel: `4tos · Día ${Math.floor(index / 2) + 1}`,
      time: ["16:00", "20:00"][index % 2],
      stadium: venue[0],
      city: venue[1],
      sectionLabel: `4tos · Día ${Math.floor(index / 2) + 1}`,
      sortOrder: 300 + index,
    };
  });

  SF.forEach((match, index) => {
    const venue = venues[index % venues.length];
    meta[match.id] = {
      date: `2026-07-${String(12 + index).padStart(2, "0")}`,
      dayLabel: `Semifinal ${index + 1}`,
      time: "20:00",
      stadium: venue[0],
      city: venue[1],
      sectionLabel: "Semifinales",
      sortOrder: 400 + index,
    };
  });

  FINALS.forEach((match, index) => {
    const venue = venues[index % venues.length];
    meta[match.id] = {
      date: `2026-07-${String(18 + index).padStart(2, "0")}`,
      dayLabel: match.id === "3RO-01" ? "3er lugar" : "Gran final",
      time: "20:00",
      stadium: venue[0],
      city: venue[1],
      sectionLabel: match.id === "3RO-01" ? "3er lugar" : "Final",
      sortOrder: 500 + index,
    };
  });

  return meta;
}

function enrichMatch(match, importedMatches = {}) {
  const merged = {
    ...match,
    ...(MATCH_META[match.id] || {}),
    ...(importedMatches[match.id] || {}),
  };

  return {
    ...merged,
    home: cleanTeamName(merged.home),
    away: cleanTeamName(merged.away),
  };
}

function groupMatchesBySection(matches) {
  const map = new Map();
  matches
    .slice()
    .sort((a, b) => `${a.date || "9999-12-31"} ${a.time || "99:99"}`.localeCompare(`${b.date || "9999-12-31"} ${b.time || "99:99"}`))
    .forEach((match) => {
      const key = match.sectionLabel || match.dayLabel || "Por definir";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(match);
    });
  return Array.from(map.entries());
}

/* =============================
   LÓGICA DE PUNTOS Y STANDINGS
============================= */

function calcScore(bet, result) {
  if (!result || result.home === "" || result.home === undefined) return null;
  if (!bet || bet.home === "" || bet.home === undefined) return null;
  const bH = +bet.home;
  const bA = +bet.away;
  const rH = +result.home;
  const rA = +result.away;
  if ([bH, bA, rH, rA].some(Number.isNaN)) return null;
  if (bH === rH && bA === rA) return 3;
  const sign = (value) => (value > 0 ? 1 : value < 0 ? -1 : 0);
  return sign(bH - bA) === sign(rH - rA) ? 1 : 0;
}

function computeStandings(bets) {
  const standings = {};
  Object.entries(GROUPS).forEach(([group, teams]) => {
    const stats = {};
    teams.forEach((team) => {
      stats[team] = { pts: 0, gf: 0, ga: 0 };
    });

    GROUP_MATCHES.filter((match) => match.group === group).forEach((match) => {
      const bet = bets[match.id];
      if (!bet || bet.home === "" || bet.away === "") return;
      const home = +bet.home;
      const away = +bet.away;
      if (Number.isNaN(home) || Number.isNaN(away)) return;
      stats[match.home].gf += home;
      stats[match.home].ga += away;
      stats[match.away].gf += away;
      stats[match.away].ga += home;
      if (home > away) stats[match.home].pts += 3;
      else if (home < away) stats[match.away].pts += 3;
      else {
        stats[match.home].pts += 1;
        stats[match.away].pts += 1;
      }
    });

    standings[group] = teams.slice().sort((a, b) => {
      const sa = stats[a];
      const sb = stats[b];
      if (sb.pts !== sa.pts) return sb.pts - sa.pts;
      return (sb.gf - sb.ga) - (sa.gf - sa.ga);
    });
  });
  return standings;
}


function computeGroupTablesDetailed(scoreMap) {
  const tables = {};
  Object.entries(GROUPS).forEach(([group, teams]) => {
    const stats = {};
    teams.forEach((team) => {
      stats[team] = { team, pj: 0, pts: 0, gf: 0, ga: 0, gd: 0 };
    });

    GROUP_MATCHES.filter((match) => match.group === group).forEach((match) => {
      const score = scoreMap?.[match.id];
      if (!score || score.home === "" || score.away === "" || score.home === undefined || score.away === undefined) return;
      const home = Number(score.home);
      const away = Number(score.away);
      if (Number.isNaN(home) || Number.isNaN(away)) return;

      stats[match.home].pj += 1;
      stats[match.away].pj += 1;
      stats[match.home].gf += home;
      stats[match.home].ga += away;
      stats[match.away].gf += away;
      stats[match.away].ga += home;
      stats[match.home].gd = stats[match.home].gf - stats[match.home].ga;
      stats[match.away].gd = stats[match.away].gf - stats[match.away].ga;

      if (home > away) stats[match.home].pts += 3;
      else if (away > home) stats[match.away].pts += 3;
      else {
        stats[match.home].pts += 1;
        stats[match.away].pts += 1;
      }
    });

    tables[group] = teams
      .map((team) => stats[team])
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  });
  return tables;
}

function getFirst(standings, group) {
  return standings[group]?.[0] || `1° ${group}`;
}

function getSecond(standings, group) {
  return standings[group]?.[1] || `2° ${group}`;
}

function getThird(standings, group) {
  return standings[group]?.[2] || `3° ${group}`;
}

function winnerFromScoreMap(team1, team2, score) {
  if (!score || score.home === "" || score.away === "" || score.home === undefined || score.away === undefined) return null;
  const h = Number(score.home);
  const a = Number(score.away);
  if (Number.isNaN(h) || Number.isNaN(a) || h === a) return null;
  return h > a ? team1 : team2;
}

function loserFromScoreMap(team1, team2, score) {
  if (!score || score.home === "" || score.away === "" || score.home === undefined || score.away === undefined) return null;
  const h = Number(score.home);
  const a = Number(score.away);
  if (Number.isNaN(h) || Number.isNaN(a) || h === a) return null;
  return h > a ? team2 : team1;
}

/**
 * Resuelve el árbol eliminatorio a partir de un mapa de marcadores.
 * Esta función se usa para comparar:
 * - proyección del usuario
 * - realidad oficial
 *
 * Mantiene la misma estructura del bracket visible en la app.
 */
function resolveTournamentFromScoreMap(scoreMap) {
  const standings = computeStandings(scoreMap);

  const r16 = R16.map((match) => {
    const home = getFirst(standings, match.grpA);
    const away = getSecond(standings, match.grpB);
    return { id: match.id, home, away, winner: winnerFromScoreMap(home, away, scoreMap[match.id]) };
  });

  const r16ById = Object.fromEntries(r16.map((m) => [m.id, m]));

  const of = OF.map((match) => {
    const home = r16ById[match.r16A]?.winner || "?";
    const away = r16ById[match.r16B]?.winner || "?";
    return { id: match.id, home, away, winner: winnerFromScoreMap(home, away, scoreMap[match.id]) };
  });

  const ofById = Object.fromEntries(of.map((m) => [m.id, m]));

  const qf = QF.map((match) => {
    const home = ofById[match.ofA]?.winner || "?";
    const away = ofById[match.ofB]?.winner || "?";
    return { id: match.id, home, away, winner: winnerFromScoreMap(home, away, scoreMap[match.id]) };
  });

  const qfById = Object.fromEntries(qf.map((m) => [m.id, m]));

  const sf = SF.map((match) => {
    const home = qfById[match.qfA]?.winner || "?";
    const away = qfById[match.qfB]?.winner || "?";
    return {
      id: match.id,
      home,
      away,
      winner: winnerFromScoreMap(home, away, scoreMap[match.id]),
      loser: loserFromScoreMap(home, away, scoreMap[match.id]),
    };
  });

  const sfById = Object.fromEntries(sf.map((m) => [m.id, m]));

  const final = {
    id: "FINAL",
    home: sfById["SF-01"]?.winner || "?",
    away: sfById["SF-02"]?.winner || "?",
    winner: winnerFromScoreMap(sfById["SF-01"]?.winner || "?", sfById["SF-02"]?.winner || "?", scoreMap["FINAL"]),
  };

  const third = {
    id: "3RO-01",
    home: sfById["SF-01"]?.loser || "?",
    away: sfById["SF-02"]?.loser || "?",
    winner: winnerFromScoreMap(sfById["SF-01"]?.loser || "?", sfById["SF-02"]?.loser || "?", scoreMap["3RO-01"]),
  };

  return { standings, r16, of, qf, sf, final, third };
}

function getPhaseMatchIds() {
  return {
    groups: GROUP_MATCHES.map((m) => m.id),
    r16: R16.map((m) => m.id),
    of: OF.map((m) => m.id),
    qf: QF.map((m) => m.id),
    sf: SF.map((m) => m.id),
    finals: ["3RO-01", "FINAL"],
  };
}

function countScoredMatches(scoreMap) {
  return Object.values(scoreMap || {}).filter((bet) => bet && bet.home !== "" && bet.away !== "" && bet.home !== undefined && bet.away !== undefined).length;
}

function arraysEqualAsSet(a = [], b = []) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort().join("|");
  const sb = [...b].sort().join("|");
  return sa === sb;
}

/**
 * Calcula el score completo del usuario:
 * - puntos por partido
 * - bonos por grupos
 * - bonos por semifinalistas/finalistas/campeón
 */
function computeUserScoreSummary(userScoreMap, officialScoreMap) {
  const phaseIds = getPhaseMatchIds();
  let matchPoints = 0;
  let exact = 0;
  let resultHits = 0;

  const phaseBreakdown = {
    groups: { points: 0, exact: 0, result: 0, evaluated: 0 },
    r16: { points: 0, exact: 0, result: 0, evaluated: 0 },
    of: { points: 0, exact: 0, result: 0, evaluated: 0 },
    qf: { points: 0, exact: 0, result: 0, evaluated: 0 },
    sf: { points: 0, exact: 0, result: 0, evaluated: 0 },
    finals: { points: 0, exact: 0, result: 0, evaluated: 0 },
  };

  Object.entries(phaseIds).forEach(([phase, ids]) => {
    ids.forEach((id) => {
      const score = calcScore(userScoreMap?.[id], officialScoreMap?.[id]);
      if (score === null) return;
      phaseBreakdown[phase].evaluated += 1;
      if (score === SCORING_RULES.exact) {
        matchPoints += SCORING_RULES.exact;
        exact += 1;
        phaseBreakdown[phase].points += SCORING_RULES.exact;
        phaseBreakdown[phase].exact += 1;
      } else if (score === SCORING_RULES.result) {
        matchPoints += SCORING_RULES.result;
        resultHits += 1;
        phaseBreakdown[phase].points += SCORING_RULES.result;
        phaseBreakdown[phase].result += 1;
      }
    });
  });

  const predictedTables = computeGroupTablesDetailed(userScoreMap);
  const officialTables = computeGroupTablesDetailed(officialScoreMap);

  let groupLeaderBonus = 0;
  let groupQualifiersBonus = 0;

  Object.keys(GROUPS).forEach((group) => {
    const p = predictedTables[group] || [];
    const o = officialTables[group] || [];
    if (p[0]?.team && o[0]?.team && p[0].team === o[0].team) {
      groupLeaderBonus += SCORING_RULES.groupLeader;
    }
    const pQual = p.slice(0, 2).map((x) => x.team);
    const oQual = o.slice(0, 2).map((x) => x.team);
    if (arraysEqualAsSet(pQual, oQual)) {
      groupQualifiersBonus += SCORING_RULES.groupQualifiers;
    }
  });

  const predictedTournament = resolveTournamentFromScoreMap(userScoreMap);
  const officialTournament = resolveTournamentFromScoreMap(officialScoreMap);

  const predictedSemis = predictedTournament.sf.flatMap((m) => [m.home, m.away]).filter((x) => x && x !== "?");
  const officialSemis = officialTournament.sf.flatMap((m) => [m.home, m.away]).filter((x) => x && x !== "?");
  const semifinalBonus = arraysEqualAsSet(predictedSemis, officialSemis) ? SCORING_RULES.semifinalists : 0;

  const predictedFinalists = [predictedTournament.final.home, predictedTournament.final.away].filter((x) => x && x !== "?");
  const officialFinalists = [officialTournament.final.home, officialTournament.final.away].filter((x) => x && x !== "?");
  const finalistsBonus = arraysEqualAsSet(predictedFinalists, officialFinalists) ? SCORING_RULES.finalists : 0;

  const championBonus =
    predictedTournament.final.winner &&
    officialTournament.final.winner &&
    predictedTournament.final.winner === officialTournament.final.winner
      ? SCORING_RULES.champion
      : 0;

  const bonusPoints = groupLeaderBonus + groupQualifiersBonus + semifinalBonus + finalistsBonus + championBonus;
  const total = matchPoints + bonusPoints;
  const evaluated = Object.values(phaseBreakdown).reduce((acc, item) => acc + item.evaluated, 0);

  return {
    pts: total,
    matchPoints,
    bonusPoints,
    exact,
    result: resultHits,
    evaluated,
    loaded: countScoredMatches(userScoreMap),
    accuracy: evaluated ? Math.round(((exact + resultHits) / evaluated) * 100) : 0,
    groupLeaderBonus,
    groupQualifiersBonus,
    semifinalBonus,
    finalistsBonus,
    championBonus,
    phaseBreakdown,
    predictedTables,
    officialTables,
    predictedTournament,
    officialTournament,
  };
}




/* =============================
   IMPORTACIÓN EXCEL
============================= */

function cleanTeamName(name) {
  if (!name) return "";

  return String(name)
    .normalize("NFKC")
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/🏳️/gu, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^\p{L}\p{N}\s\-\/.*()]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDateValue(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

function getCellValue(sheet, XLSX, row, col) {
  const cell = sheet?.[XLSX.utils.encode_cell({ r: row, c: col })];
  return cell ? cell.v : "";
}

function isValidMatchId(id) {
  const cleanId = String(id || "").trim().toUpperCase();

  // IDs válidos del torneo completo:
  // - Grupos: A01 ... L23
  // - 16vos: R16-01 ... R16-16
  // - 8vos: OF-01 ... OF-08
  // - 4tos: QF-01 ... QF-04
  // - Semis: SF-01 ... SF-02
  // - 3er lugar: 3RO-01
  // - Final: FINAL
  return (
    /^[A-L]\d{2}$/.test(cleanId) ||
    cleanId.startsWith("R16-") ||
    cleanId.startsWith("OF-") ||
    cleanId.startsWith("QF-") ||
    cleanId.startsWith("SF-") ||
    cleanId === "FINAL" ||
    cleanId === "3RO-01"
  );
}

function readPhaseSheet(sheet, XLSX, options = {}) {
  if (!sheet) return { bets: {}, matches: {} };

  const {
    startRow = 3,
    idCol = 0,
    groupCol = 1,
    homeCol = 2,
    homeGoalsCol = 3,
    awayGoalsCol = 4,
    awayCol = 5,
    phaseCol = 6,
    dateCol = 7,
    timeCol = 8,
    stadiumCol = 9,
    cityCol = 10,
    defaultStage = "",
  } = options;

  const bets = {};
  const matches = {};
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:L1");

  for (let row = startRow; row <= range.e.r; row += 1) {
    const rawId = getCellValue(sheet, XLSX, row, idCol);
    const id = String(rawId || "").trim();

    if (!isValidMatchId(id)) continue;

    const group = String(getCellValue(sheet, XLSX, row, groupCol) || "").trim();
    const home = cleanTeamName(getCellValue(sheet, XLSX, row, homeCol));
    const away = cleanTeamName(getCellValue(sheet, XLSX, row, awayCol));
    const stage = String(getCellValue(sheet, XLSX, row, phaseCol) || defaultStage).trim();
    const date = normalizeDateValue(getCellValue(sheet, XLSX, row, dateCol));
    const time = String(getCellValue(sheet, XLSX, row, timeCol) || "").trim();
    const stadium = String(getCellValue(sheet, XLSX, row, stadiumCol) || "").trim();
    const city = String(getCellValue(sheet, XLSX, row, cityCol) || "").trim();

    const homeGoals = getCellValue(sheet, XLSX, row, homeGoalsCol);
    const awayGoals = getCellValue(sheet, XLSX, row, awayGoalsCol);

    matches[id] = {
      id,
      group,
      home,
      away,
      stage,
      date,
      time,
      stadium,
      city,
      sectionLabel: date || stage || "Por definir",
      dayLabel: date || stage || "Por definir",
    };

    const homeValue =
      homeGoals !== "" && homeGoals !== null && homeGoals !== undefined
        ? String(homeGoals).trim()
        : "";

    const awayValue =
      awayGoals !== "" && awayGoals !== null && awayGoals !== undefined
        ? String(awayGoals).trim()
        : "";

    if (homeValue !== "" || awayValue !== "") {
      bets[id] = {
        home: homeValue,
        away: awayValue,
      };
    }
  }

  return { bets, matches };
}

/**
 * parseExcel
 * ------------------------------------------------------------
 * Lee el archivo del participante y devuelve:
 * - name: nombre del jugador
 * - bets: marcadores apostados por id de partido
 * - importedMatches: metadatos visibles de partidos importados
 *
 * IMPORTANTE:
 * Las hojas knockout pueden traer equipos por fórmula. La app toma
 * los datos visibles como apoyo, pero el motor del torneo debe ser
 * capaz de reconstruir llaves por lógica si estos valores no vienen
 * resueltos por XLSX en navegador.
 */
function parseExcel(buffer, XLSX) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const groupsSheet = workbook.Sheets["1_GRUPOS"];
  if (!groupsSheet) {
    throw new Error("No se encontró la hoja '1_GRUPOS'.");
  }

  const name =
    groupsSheet["C2"]?.v?.toString().trim() ||
    groupsSheet["B2"]?.v?.toString().trim() ||
    "";
  if (!name) {
    throw new Error("El participante no ingresó su nombre en C2.");
  }

  const groups = readPhaseSheet(workbook.Sheets["1_GRUPOS"], XLSX, {
    startRow: 5,
    groupCol: 1,
    homeCol: 2,
    homeGoalsCol: 3,
    awayGoalsCol: 4,
    awayCol: 5,
    phaseCol: 6,
    dateCol: 7,
    timeCol: 8,
    stadiumCol: 9,
    cityCol: 10,
    defaultStage: "Grupos",
  });

  // IMPORTANTE:
  // El archivo final del proyecto usa estas hojas reales:
  // 1_GRUPOS, 2_16AVOS, 3_OCTAVOS, 4_CUARTOS, 5_SEMIS, 6_FINAL
  // Si aquí usamos nombres antiguos, la app solo detecta grupos + 16vos
  // y por eso se queda en 88 apuestas en lugar de cargar todo el flujo.
  const r16 = readPhaseSheet(workbook.Sheets["2_16AVOS"], XLSX, {
    startRow: 3,
    groupCol: 1,
    homeCol: 2,
    homeGoalsCol: 3,
    awayGoalsCol: 4,
    awayCol: 5,
    phaseCol: 11,
    dateCol: 6,
    timeCol: 7,
    stadiumCol: 8,
    cityCol: 9,
    defaultStage: "16avos",
  });

  const of = readPhaseSheet(workbook.Sheets["3_OCTAVOS"], XLSX, {
    startRow: 3,
    groupCol: 1,
    homeCol: 2,
    homeGoalsCol: 3,
    awayGoalsCol: 4,
    awayCol: 5,
    phaseCol: 11,
    dateCol: 6,
    timeCol: 7,
    stadiumCol: 8,
    cityCol: 9,
    defaultStage: "8vos",
  });

  const qf = readPhaseSheet(workbook.Sheets["4_CUARTOS"], XLSX, {
    startRow: 3,
    groupCol: 1,
    homeCol: 2,
    homeGoalsCol: 3,
    awayGoalsCol: 4,
    awayCol: 5,
    phaseCol: 11,
    dateCol: 6,
    timeCol: 7,
    stadiumCol: 8,
    cityCol: 9,
    defaultStage: "4tos",
  });

  const sf = readPhaseSheet(workbook.Sheets["5_SEMIS"], XLSX, {
    startRow: 3,
    groupCol: 1,
    homeCol: 2,
    homeGoalsCol: 3,
    awayGoalsCol: 4,
    awayCol: 5,
    phaseCol: 11,
    dateCol: 6,
    timeCol: 7,
    stadiumCol: 8,
    cityCol: 9,
    defaultStage: "Semis",
  });

  const finals = readPhaseSheet(workbook.Sheets["6_FINAL"], XLSX, {
    startRow: 3,
    groupCol: 1,
    homeCol: 2,
    homeGoalsCol: 3,
    awayGoalsCol: 4,
    awayCol: 5,
    phaseCol: 11,
    dateCol: 6,
    timeCol: 7,
    stadiumCol: 8,
    cityCol: 9,
    defaultStage: "Final",
  });

  return {
    name,
    bets: {
      ...groups.bets,
      ...r16.bets,
      ...of.bets,
      ...qf.bets,
      ...sf.bets,
      ...finals.bets,
    },
    importedMatches: {
      ...groups.matches,
      ...r16.matches,
      ...of.matches,
      ...qf.matches,
      ...sf.matches,
      ...finals.matches,
    },
  };
}

function StatChip({ label, value, accent = "#94a3b8" }) {
  return (
    <div style={{
      minWidth: 96,
      padding: "12px 14px",
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
      boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
    }}>
      <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "Inter, sans-serif", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, lineHeight: 1.1, color: accent, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function Dot({ color }) {
  return <span style={{ width: 10, height: 10, borderRadius: 999, background: color, display: "inline-block" }} />;
}

function Shell({ children }) {
  return (
    <div style={{
      minHeight: "100vh",
      color: "#e5eef8",
      background: "radial-gradient(circle at top, #12213f 0%, #09111f 35%, #060b14 100%)",
      fontFamily: "Inter, system-ui, sans-serif",
      paddingBottom: 48,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #060b14; }
        button, input, select { font: inherit; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
      {children}
    </div>
  );
}

function Container({ children }) {
  return <div style={{ width: "min(1220px, calc(100% - 20px))", margin: "0 auto" }}>{children}</div>;
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "linear-gradient(180deg, rgba(17,24,39,0.88), rgba(9,14,24,0.9))",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 24,
      boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function TopBar({ left, center, right }) {
  const { isMobile } = useViewport();
  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 30,
      background: "rgba(6,11,20,0.78)",
      backdropFilter: "blur(18px)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    }}>
      <Container>
        <div style={{ minHeight: isMobile ? 88 : 72, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: isMobile ? "wrap" : "nowrap", padding: isMobile ? "10px 0" : 0 }}>
          <div>{left}</div>
          <div>{center}</div>
          <div>{right}</div>
        </div>
      </Container>
    </div>
  );
}

function GhostButton({ children, onClick, active = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 14,
        border: active ? "1px solid rgba(56,189,248,0.6)" : "1px solid rgba(255,255,255,0.1)",
        background: active ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.04)",
        color: active ? "#7dd3fc" : "#dbeafe",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 16px",
        borderRadius: 16,
        border: "none",
        background: "linear-gradient(135deg, #22c55e, #14b8a6)",
        color: "#03120b",
        fontWeight: 800,
        cursor: "pointer",
        boxShadow: "0 12px 24px rgba(34,197,94,0.22)",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.05)",
        color: "#f8fafc",
        outline: "none",
        ...props.style,
      }}
    />
  );
}

function Toast({ message, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2600);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{
      position: "fixed",
      bottom: 22,
      left: "50%",
      transform: "translateX(-50%)",
      background: "linear-gradient(135deg, #22c55e, #14b8a6)",
      color: "#03120b",
      borderRadius: 999,
      padding: "12px 18px",
      fontWeight: 800,
      zIndex: 60,
      boxShadow: "0 14px 30px rgba(20,184,166,0.25)",
    }}>
      {message}
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 14px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.04)",
      color: "#e2e8f0",
      cursor: "pointer",
      fontWeight: 700,
    }}>
      ← Volver
    </button>
  );
}

function HeaderHero({
  usersCount,
  totalPot,
  currency,
  onImport,
  onOpenAdmin,
  onOpenTable,
  onOpenPromo,
  onOpenPot,
  isAdminView = false,
}) {
  const { isMobile, isTablet } = useViewport();

  return (
    <div style={{ padding: isMobile ? "18px 0 12px" : "30px 0 18px" }}>
      <Container>
        <Card
          style={{
            padding: isMobile ? 20 : 30,
            overflow: "hidden",
            position: "relative",
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(135deg, rgba(2,6,23,0.96), rgba(5,20,46,0.96))",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `
                radial-gradient(circle at 12% 18%, rgba(34,197,94,0.18), transparent 28%),
                radial-gradient(circle at 88% 16%, rgba(56,189,248,0.14), transparent 24%),
                radial-gradient(circle at 72% 82%, rgba(250,204,21,0.12), transparent 22%),
                linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))
              `,
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: 0.18,
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
              `,
              backgroundSize: "32px 32px",
              maskImage:
                "linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.25))",
            }}
          />

          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : isTablet
                  ? "1fr"
                  : "1.25fr 0.95fr",
              gap: isMobile ? 20 : 28,
              alignItems: "stretch",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(147,197,253,0.18)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#93c5fd",
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: 0.4,
                  marginBottom: 14,
                  textTransform: "uppercase",
                }}
              >
                Mundial 2026 · Quiniela del torneo
              </div>

              <div
                style={{
                  fontFamily: "Barlow Condensed, sans-serif",
                  fontSize: isMobile ? 52 : 78,
                  lineHeight: 0.95,
                  fontWeight: 800,
                  letterSpacing: -1,
                  color: "#f8fafc",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Pronostica.
                <br />
                <span style={{ color: "#34d399" }}>Compite. Gana.</span>
              </div>

              <p
                style={{
                  margin: 0,
                  maxWidth: 720,
                  color: "#cbd5e1",
                  lineHeight: 1.7,
                  fontSize: isMobile ? 18 : 20,
                }}
              >
                Sigue el Mundial jornada a jornada, registra tus marcadores y compite por liderar la
                quiniela con clasificación, bote y resumen en tiempo real.
              </p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <PrimaryButton onClick={onImport}>Importar quiniela</PrimaryButton>

                <a
                  href="/plantilla_quiniela.xlsm"
                  download="plantilla_quiniela.xlsm"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(34,197,94,0.35)",
                    background: "rgba(34,197,94,0.12)",
                    color: "#d9fbe8",
                    cursor: "pointer",
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Descargar Excel
                </a>

                <GhostButton onClick={onOpenTable}>Ver clasificación</GhostButton>
                <GhostButton onClick={onOpenPromo}>Ver promo</GhostButton>
                <GhostButton onClick={onOpenAdmin}>Admin</GhostButton>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 24,
                }}
              >
                {[
                  "Fase de grupos y bracket",
                  "Ranking en vivo",
                  "Resumen de jornada",
                ].map((item) => (
                  <div
                    key={item}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "#94a3b8",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateRows: "auto 1fr",
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <StatChip
                  label="Participantes"
                  value={usersCount}
                  accent="#7dd3fc"
                />
                <StatChip
                  label="Bote actual"
                  value={`${Number(totalPot).toLocaleString()} ${currency}`}
                  accent="#facc15"
                />
                <StatChip
                  label="Formato"
                  value="Excel → App"
                  accent="#34d399"
                />
                <StatChip
                  label="Vista"
                  value="Calendario"
                  accent="#c084fc"
                />
              </div>
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#94a3b8",
                  fontSize: 12,
                  lineHeight: 1.5,
                  fontWeight: 900,
                }}
              >
                El <strong>bote total</strong> se calcula automáticamente con base en el número de participantes.
                Se aplicará una <strong>comisión del 10%</strong> por concepto de administración y operación de la plataforma.
              </div>
              <div
                style={{
                  borderRadius: 22,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
                  padding: 18,
                  display: "grid",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#f8fafc",
                        fontWeight: 800,
                        fontSize: 18,
                      }}
                    >
                      Centro del torneo
                    </div>
                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: 14,
                        marginTop: 4,
                      }}
                    >
                      Controla la quiniela, sigue la tabla y vive cada jornada.
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: 999,
                      background: "rgba(34,197,94,0.12)",
                      color: "#86efac",
                      fontWeight: 800,
                      fontSize: 12,
                      border: "1px solid rgba(34,197,94,0.25)",
                    }}
                  >
                    EN JUEGO
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {[
                    ["Modalidad", "Pronósticos por partido"],
                    ["Actualización", "Resultados + resumen"],
                    ["Competencia", "Clasificación en vivo"],
                    ["Objetivo", "Ser líder del torneo"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        padding: 12,
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: 12,
                          fontWeight: 700,
                          marginBottom: 4,
                          textTransform: "uppercase",
                          letterSpacing: 0.3,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          color: "#f8fafc",
                          fontWeight: 800,
                          fontSize: 14,
                          lineHeight: 1.4,
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </Container>
    </div>
  );
}

function ImportModal({ XLSX, onClose, onImport }) {
  const fileRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("loading");
    setMessage("Leyendo archivo...");

    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcel(buffer, XLSX);
      setPreview(result);
      setStatus("success");
      setMessage(`${Object.keys(result.bets).length} apuestas detectadas.`);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "No se pudo leer el archivo.");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(3,7,18,0.78)", backdropFilter: "blur(10px)", zIndex: 50, display: "grid", placeItems: "center", padding: 18 }}>
      <Card style={{ width: "min(100%, 520px)", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 22 }}>Importar participante</div>
            <div style={{ color: "#9fb0c8", marginTop: 4 }}>Sube el archivo Excel llenado por el usuario.</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#9fb0c8", fontSize: 28, cursor: "pointer" }}>×</button>
        </div>

        <div onClick={() => fileRef.current?.click()} style={{ borderRadius: 20, border: "1px dashed rgba(125,211,252,0.45)", background: "rgba(125,211,252,0.06)", padding: 28, textAlign: "center", cursor: "pointer" }}>
          <div style={{ fontSize: 40 }}>📄</div>
          <div style={{ fontWeight: 800, marginTop: 8 }}>Seleccionar archivo .xlsx</div>
          <div style={{ color: "#9fb0c8", marginTop: 6, fontSize: 14 }}>Hoja esperada: 1_GRUPOS</div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />
        </div>

        {status !== "idle" && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 16, border: status === "error" ? "1px solid rgba(248,113,113,0.35)" : "1px solid rgba(255,255,255,0.08)", background: status === "error" ? "rgba(248,113,113,0.08)" : "rgba(255,255,255,0.04)" }}>
            <div style={{ fontWeight: 700 }}>{status === "loading" ? "Procesando" : status === "success" ? "Archivo listo" : "Error"}</div>
            <div style={{ color: status === "error" ? "#fda4af" : "#cbd5e1", marginTop: 4 }}>{message}</div>
            {preview && (
              <div style={{ marginTop: 10, color: "#dbeafe" }}>
                Participante: <strong>{preview.name}</strong>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          {preview ? <PrimaryButton onClick={() => { onImport(preview.name, preview.bets, preview.importedMatches); onClose(); }} style={{ flex: 1 }}>Importar</PrimaryButton> : null}
          <GhostButton onClick={onClose}>Cerrar</GhostButton>
        </div>
      </Card>
    </div>
  );
}

function SummaryTable({ totals, users, bets, onOpenUser }) {
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: 18, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 800, fontSize: 18 }}>Clasificación</div>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)" }}>
              {["#", "Participante", "Pts", "Exactos", "Resultado", "Tendencia", "Cargados"].map((heading) => (
                <th key={heading} style={{ textAlign: "left", padding: "14px 16px", color: "#93c5fd", fontSize: 12, letterSpacing: 0.4 }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {totals.map((row, index) => {
              const movement = getMovementMeta(row.movement || 0);
              const podiumBg = index === 0 ? "rgba(250,204,21,0.08)" : index === 1 ? "rgba(226,232,240,0.06)" : index === 2 ? "rgba(251,146,60,0.06)" : "transparent";
              return (
                <tr key={row.user} onClick={() => onOpenUser(row.user)} style={{ cursor: "pointer", borderTop: "1px solid rgba(255,255,255,0.05)", background: podiumBg }}>
                  <td style={{ padding: 16, fontWeight: 800 }}>{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}</td>
                  <td style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Dot color={users[row.user]?.color} />
                      <strong>{row.user}</strong>
                    </div>
                  </td>
                  <td style={{ padding: 16, color: "#34d399", fontWeight: 800 }}>{row.pts}</td>
                  <td style={{ padding: 16 }}>{row.exact}</td>
                  <td style={{ padding: 16 }}>{row.result}</td>
                  <td style={{ padding: 16, color: movement.color }}>{movement.icon} {movement.text}</td>
                  <td style={{ padding: 16, color: "#94a3b8" }}>{Object.keys(bets[row.user] || {}).length}/{TOTAL_MATCHES}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ParticipantList({ users, onOpenUser }) {
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>Participantes</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {Object.values(users).map((user) => (
          <button key={user.name} onClick={() => onOpenUser(user.name)} style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            border: `1px solid ${user.color}55`,
            background: `${user.color}12`,
            color: "#f8fafc",
            padding: "10px 14px",
            cursor: "pointer",
            fontWeight: 700,
          }}>
            <Dot color={user.color} />
            {user.name}
          </button>
        ))}
      </div>
    </Card>
  );
}

function TeamBlock({ team, align }) {
  const { isMobile } = useViewport();
  const reversed = align === "right";
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: reversed ? "flex-end" : "flex-start",
      gap: 12,
      flexDirection: reversed ? "row-reverse" : "row",
      minWidth: 0,
    }}>
      <span style={{
        width: 44,
        minWidth: 44,
        height: 44,
        borderRadius: 12,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        textAlign: "center",
        fontSize: 30,
        lineHeight: 1,
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
      }}>
        {getFlag(team)}
      </span>
      <span style={{
        fontWeight: 800,
        fontSize: isMobile ? 14 : 15,
        lineHeight: 1.15,
        whiteSpace: isMobile ? "normal" : "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {team}
      </span>
    </div>
  );
}

const scoreInputStyle = {
  width: 44,
  height: 44,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#f8fafc",
  textAlign: "center",
  fontSize: 18,
  fontWeight: 800,
  outline: "none",
};

function getMatchesByDate(matchesMap, results, targetDate) {
  return Object.values(matchesMap || {}).filter((match) => {
    if (!match?.date) return false;
    if (match.date !== targetDate) return false;

    const result = results?.[match.id];
    if (!result) return false;
    if (result.home === "" || result.away === "") return false;

    return true;
  });
}

function calcJourneyScores(users, bets, results, matchesOfDay) {
  return Object.keys(users || {})
    .map((user) => {
      let points = 0;
      let exact = 0;
      let resultHits = 0;

      matchesOfDay.forEach((match) => {
        const bet = bets?.[user]?.[match.id];
        const result = results?.[match.id];
        const score = calcScore(bet, result);

        points += score;
        if (score === 3) exact += 1;
        if (score === 1) resultHits += 1;
      });

      return {
        user,
        points,
        exact,
        resultHits,
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.exact - a.exact;
    });
}


function ScoreEditor({ homeValue, awayValue, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="number" min="0" max="30" value={homeValue} onChange={(event) => onChange("home", event.target.value)} style={scoreInputStyle} />
      <span style={{ fontSize: 20, color: "#64748b", fontWeight: 900, margin: "0 4px" }}>-</span>
      <input type="number" min="0" max="30" value={awayValue} onChange={(event) => onChange("away", event.target.value)} style={scoreInputStyle} />
    </div>
  );
}

function MatchCard({ match, bet, result, onChange, isAdmin = false }) {
  const { isMobile } = useViewport();
  const score = isAdmin ? null : calcScore(bet, result);
  const hasResult = result?.home !== undefined && result?.home !== "";
  const hasBet = bet?.home !== undefined && bet?.home !== "";
  const homeValue = isAdmin ? result?.home ?? "" : bet?.home ?? "";
  const awayValue = isAdmin ? result?.away ?? "" : bet?.away ?? "";

  let accent = "rgba(255,255,255,0.08)";
  if (score === 3) accent = "rgba(34,197,94,0.28)";
  if (score === 1) accent = "rgba(56,189,248,0.26)";
  if (score === 0 && hasResult && hasBet) accent = "rgba(248,113,113,0.24)";

  return (
    <Card style={{ padding: isMobile ? 12 : 14, border: `1px solid ${accent}`, background: "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(9,14,24,0.98))" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            <span style={{ padding: "5px 9px", borderRadius: 999, background: "rgba(56,189,248,0.12)", color: "#7dd3fc", fontSize: 11, fontWeight: 700 }}>{match.group ? `Grupo ${match.group}` : STAGE_LABELS[match.stage] || match.stage}</span>
            <span style={{ padding: "5px 9px", borderRadius: 999, background: "rgba(255,255,255,0.05)", color: "#cbd5e1", fontSize: 11, fontWeight: 700 }}>{match.time || "Horario por definir"}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{match.dayLabel || match.sectionLabel || "Fecha por definir"}</div>
          <div style={{ color: "#9fb0c8", marginTop: 3, fontSize: 12 }}>{match.stadium || "Estadio por definir"}{match.city ? ` · ${match.city}` : ""}</div>
        </div>
        {!isAdmin && score !== null ? (
          <div style={{ textAlign: "right", minWidth: 48 }}>
            <div style={{ color: score === 3 ? "#34d399" : score === 1 ? "#7dd3fc" : "#fda4af", fontWeight: 900, fontSize: 20 }}>{score}</div>
            <div style={{ color: "#94a3b8", fontSize: 10 }}>pts</div>
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto 1fr", alignItems: "center", gap: isMobile ? 10 : 12 }}>
        <TeamBlock team={match.home} align="left" />
        <ScoreEditor homeValue={homeValue} awayValue={awayValue} onChange={onChange} />
        <TeamBlock team={match.away} align="right" />
      </div>

      {!isAdmin && hasResult ? (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", color: "#9fb0c8", fontSize: 12 }}>
          Resultado real: <strong style={{ color: "#f8fafc" }}>{result.home} - {result.away}</strong>
        </div>
      ) : null}
    </Card>
  );
}

function ScheduleSection({ title, matches, bets, results, isAdmin, onChange }) {
  return (
    <section style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{title}</div>
          <div style={{ color: "#8ea0bb", fontSize: 14 }}>
            {matches.length} partido{matches.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            bet={bets[match.id] || {}}
            result={results[match.id] || {}}
            isAdmin={isAdmin}
            onChange={(side, value) => onChange(match.id, side, value)}
          />
        ))}
      </div>
    </section>
  );
}

/* =============================
   COMPONENTES DE UI
============================= */


// Tabla compacta por grupo para el comparativo Apuesta vs Real.
// Aquí sí mostramos banderas explícitamente porque el motor trabaja con nombres limpios
// y no dependemos del Excel para la capa visual.
function GroupMiniTable({ title, rows, accent = "#7dd3fc" }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontWeight: 800, color: accent, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4 }}>{title}</div>
      <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.05)" }}>
              {["Equipo", "PJ", "Pts", "DG", "GF"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#93c5fd", fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row, index) => (
              <tr key={row.team} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: index < 2 ? "rgba(34,197,94,0.08)" : index === 2 ? "rgba(250,204,21,0.05)" : "transparent" }}>
                <td style={{ padding: "10px 12px", fontWeight: 700 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span>{getFlag(row.team)}</span>
                    <span>{row.team}</span>
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>{row.pj}</td>
                <td style={{ padding: "10px 12px", fontWeight: 800 }}>{row.pts}</td>
                <td style={{ padding: "10px 12px" }}>{row.gd}</td>
                <td style={{ padding: "10px 12px" }}>{row.gf}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupComparisonBoard({ predictedTables, officialTables }) {
  return (
    <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
      {Object.keys(GROUPS).map((group) => (
        <Card key={group} style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 800, fontSize: 20 }}>Grupo {group}</div>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>Comparativo de avance · apuesta vs realidad</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            <GroupMiniTable title="Apuesta" rows={predictedTables?.[group] || []} accent="#7dd3fc" />
            <GroupMiniTable title="Real" rows={officialTables?.[group] || []} accent="#34d399" />
          </div>
        </Card>
      ))}
    </div>
  );
}


function ScoreRulesCard({ compact = false }) {
  return (
    <Card style={{ padding: compact ? 16 : 20 }}>
      <div style={{ fontWeight: 800, fontSize: compact ? 16 : 18, marginBottom: 12 }}>Reglamento de puntuación</div>
      <div style={{ display: "grid", gap: 10 }}>
        {[
          ["Resultado correcto", `${SCORING_RULES.result} pt`],
          ["Marcador exacto", `${SCORING_RULES.exact} pts totales`],
          ["Líder de grupo", `${SCORING_RULES.groupLeader} pts por grupo`],
          ["2 clasificados del grupo", `${SCORING_RULES.groupQualifiers} pts por grupo`],
          ["4 semifinalistas", `${SCORING_RULES.semifinalists} pts`],
          ["2 finalistas", `${SCORING_RULES.finalists} pts`],
          ["Campeón", `${SCORING_RULES.champion} pts`],
        ].map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ color: "#cbd5e1" }}>{label}</span>
            <strong style={{ color: "#f8fafc" }}>{value}</strong>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DashboardKpi({ label, value, accent = "#34d399", sublabel = "" }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div style={{ color: accent, fontWeight: 800, fontSize: 28, lineHeight: 1 }}>{value}</div>
      {sublabel ? <div style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>{sublabel}</div> : null}
    </Card>
  );
}

function PhaseBreakdownCard({ breakdown }) {
  const labels = {
    groups: "Grupos",
    r16: "16vos",
    of: "8vos",
    qf: "4tos",
    sf: "Semis",
    finals: "Finales",
  };

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>Desempeño por fase</div>
      <div style={{ display: "grid", gap: 10 }}>
        {Object.entries(labels).map(([key, label]) => {
          const row = breakdown?.[key] || { points: 0, exact: 0, result: 0, evaluated: 0 };
          return (
            <div key={key} style={{ display: "grid", gridTemplateColumns: "1.3fr .7fr .7fr .7fr .7fr", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontWeight: 700 }}>{label}</div>
              <div><span style={{ color: "#94a3b8", fontSize: 12 }}>Pts</span><div style={{ fontWeight: 800 }}>{row.points}</div></div>
              <div><span style={{ color: "#94a3b8", fontSize: 12 }}>Exactos</span><div style={{ fontWeight: 800 }}>{row.exact}</div></div>
              <div><span style={{ color: "#94a3b8", fontSize: 12 }}>Resultado</span><div style={{ fontWeight: 800 }}>{row.result}</div></div>
              <div><span style={{ color: "#94a3b8", fontSize: 12 }}>Eval.</span><div style={{ fontWeight: 800 }}>{row.evaluated}</div></div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function RankingContextCard({ totals, activeUser }) {
  const idx = totals.findIndex((item) => item.user === activeUser);
  const around = totals.slice(Math.max(0, idx - 2), Math.min(totals.length, idx + 3));

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>Tu contexto en la tabla</div>
      <div style={{ display: "grid", gap: 10 }}>
        {around.map((row) => {
          const position = totals.findIndex((item) => item.user === row.user) + 1;
          const medal = position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : `#${position}`;
          const movement = getMovementMeta(row.movement || 0);
          return (
            <div key={row.user} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 14, background: row.user === activeUser ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)", border: row.user === activeUser ? "1px solid rgba(34,197,94,0.35)" : "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong>{medal}</strong>
                <Dot color={row.color} />
                <span>{row.user}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: movement.color, fontSize: 12 }}>{movement.icon} {movement.text}</span>
                <strong style={{ color: "#34d399" }}>{row.pts} pts</strong>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function UserDashboard({ summary, totals, activeUser }) {
  const rank = Math.max(1, totals.findIndex((item) => item.user === activeUser) + 1);
  const movement = getMovementMeta(summary.movement || 0);

  return (
    <div style={{ display: "grid", gap: 18, marginTop: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <DashboardKpi label="Posición" value={`#${rank}`} accent="#facc15" sublabel={`${movement.icon} ${movement.text}`} />
        <DashboardKpi label="Puntos totales" value={summary.pts} accent="#34d399" sublabel={`${summary.matchPoints} por partidos + ${summary.bonusPoints} en bonos`} />
        <DashboardKpi label="Exactos" value={summary.exact} accent="#7dd3fc" />
        <DashboardKpi label="Resultado" value={summary.result} accent="#c084fc" />
        <DashboardKpi label="Efectividad" value={`${summary.accuracy}%`} accent="#fb7185" />
        <DashboardKpi label="Evaluados" value={`${summary.evaluated}/${TOTAL_MATCHES}`} accent="#f97316" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
        <PhaseBreakdownCard breakdown={summary.phaseBreakdown} />
        <RankingContextCard totals={totals} activeUser={activeUser} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>Bonos conseguidos</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              ["Líderes de grupo", summary.groupLeaderBonus],
              ["Clasificados de grupo", summary.groupQualifiersBonus],
              ["Semifinalistas", summary.semifinalBonus],
              ["Finalistas", summary.finalistsBonus],
              ["Campeón", summary.championBonus],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span>{label}</span>
                <strong style={{ color: value ? "#34d399" : "#94a3b8" }}>{value} pts</strong>
              </div>
            ))}
          </div>
        </Card>
        <InsightsCard summary={summary} />
      </div>

      <ScoreRulesCard />
    </div>
  );
}


function getMovementMeta(movement) {
  if (movement > 0) return { icon: "🔼", text: `Subiste ${movement}`, color: "#34d399" };
  if (movement < 0) return { icon: "🔽", text: `Bajaste ${Math.abs(movement)}`, color: "#f87171" };
  return { icon: "➖", text: "Sin cambio", color: "#94a3b8" };
}

function InsightsCard({ summary }) {
  const phaseLabels = {
    groups: "Grupos",
    r16: "16vos",
    of: "8vos",
    qf: "4tos",
    sf: "Semis",
    finals: "Finales",
  };

  const bestPhase = Object.entries(summary?.phaseBreakdown || {}).sort((a, b) => (b[1]?.points || 0) - (a[1]?.points || 0))[0];
  const bonusCount = [
    summary?.groupLeaderBonus,
    summary?.groupQualifiersBonus,
    summary?.semifinalBonus,
    summary?.finalistsBonus,
    summary?.championBonus,
  ].filter((x) => Number(x) > 0).length;

  const insights = [
    bestPhase ? `Tu mejor fase hasta ahora es ${phaseLabels[bestPhase[0]]} con ${bestPhase[1].points} pts.` : "Aún no hay fases evaluadas para calcular tu mejor tramo.",
    summary?.exact ? `Llevas ${summary.exact} marcadores exactos, que son los que más valor generan en la tabla.` : "Aún no tienes marcadores exactos; ahí está la mayor oportunidad de crecer.",
    summary?.championBonus
      ? "¡Ya acertaste al campeón según el estado actual del torneo!"
      : "Tu apuesta al campeón sigue siendo la llave de mayor valor del torneo.",
    bonusCount
      ? `Ya activaste ${bonusCount} bloque(s) de bonus en la quiniela.`
      : "Todavía no activas bonos grandes; grupos y fases finales pueden cambiar tu posición rápido.",
  ];

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>Insights automáticos</div>
      <div style={{ display: "grid", gap: 10 }}>
        {insights.map((item, index) => (
          <div key={index} style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}
function JourneySummaryCard({ summary }) {
  if (!summary) return null;

  const topPlayers = summary.participantScores?.slice(0, 5) || [];
  const matches = summary.matches || [];

  return (
    <Card style={{ padding: 20, marginTop: 20 }}>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
        Última jornada cerrada
      </div>

      <div style={{ color: "#8ea0bb", marginBottom: 18 }}>
        Fecha: <strong style={{ color: "#e2e8f0" }}>{summary.date}</strong>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 18,
        }}
      >
        <div>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>
            Resultados del día
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {matches.map((match) => (
              <div
                key={match.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontSize: 12, color: "#8ea0bb", marginBottom: 4 }}>
                  {match.stage || "Partido"} {match.group ? `· Grupo ${match.group}` : ""}
                </div>

                <div style={{ fontWeight: 700 }}>
                  {match.home} {match.result?.home} - {match.result?.away} {match.away}
                </div>

                <div style={{ fontSize: 12, color: "#8ea0bb", marginTop: 4 }}>
                  {match.stadium || "Estadio por definir"} · {match.city || ""}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>
            Top de la jornada
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {topPlayers.map((player, index) => {
  const isWinner = index === 0;

  return (
    <div
      key={player.user}
      style={{
        padding: 12,
        borderRadius: 14,
        background: isWinner
          ? "linear-gradient(135deg, rgba(34,197,94,0.25), rgba(56,189,248,0.25))"
          : "rgba(255,255,255,0.03)",
        border: isWinner
          ? "1px solid rgba(34,197,94,0.4)"
          : "1px solid rgba(255,255,255,0.08)",
        boxShadow: isWinner
          ? "0 8px 30px rgba(34,197,94,0.25)"
          : "none",
        transition: "all 0.25s ease",
      }}
    >
      <div style={{ fontWeight: 800 }}>
        {isWinner ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}{" "}
        {player.user}
      </div>

      <div style={{ marginTop: 4, color: "#8ea0bb", fontSize: 14 }}>
        {player.points} pts · {player.exact} exactos · {player.resultHits} aciertos
      </div>
    </div>
  );
})}
          </div>
        </div>
      </div>
    </Card>
  );
}

function BracketMatch({ title, matchId, team1, team2, bet, onSetBet, winner, compact = false, highlight = false }) {
  return (
    <div style={{
      borderRadius: 18,
      border: highlight ? "1px solid rgba(250,204,21,0.32)" : "1px solid rgba(255,255,255,0.08)",
      background: highlight
        ? "linear-gradient(180deg, rgba(56,44,10,0.32), rgba(17,24,39,0.98))"
        : "linear-gradient(180deg, rgba(30,41,59,0.70), rgba(15,23,42,0.92))",
      padding: compact ? 9 : 11,
      boxShadow: "0 12px 24px rgba(0,0,0,0.16)",
      minHeight: compact ? 88 : 96,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ color: highlight ? "#fde68a" : "#93c5fd", fontSize: 11, fontWeight: 800 }}>
          {title || matchId}
        </div>
        <div style={{ color: "#64748b", fontSize: 10 }}>{matchId}</div>
      </div>

      {[team1, team2].map((team, index) => (
        <div
          key={team + index}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 8,
            alignItems: "center",
            padding: compact ? "7px 8px" : "8px 9px",
            borderRadius: 12,
            marginBottom: index === 0 ? 8 : 0,
            background: winner === team ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
            border: winner === team ? "1px solid rgba(34,197,94,0.22)" : "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ width: 26, textAlign: "center", fontSize: compact ? 18 : 20 }}>{getFlag(team)}</span>
            <span style={{ fontWeight: 700, fontSize: compact ? 12 : 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {team}
            </span>
          </div>
          <input
            type="number"
            min="0"
            max="30"
            value={index === 0 ? bet.home ?? "" : bet.away ?? ""}
            onChange={(event) => onSetBet(matchId, index === 0 ? "home" : "away", event.target.value)}
            style={{
              width: compact ? 36 : 38,
              height: compact ? 32 : 34,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#f8fafc",
              textAlign: "center",
              fontWeight: 800,
              outline: "none"
            }}
          />
        </div>
      ))}
    </div>
  );
}

function BracketLane({ items, onSetBet, gap = 18, compact = false }) {
  return (
    <div style={{ display: "grid", gap }}>
      {items.map((item) => (
        <BracketMatch
          key={item.id}
          matchId={item.id}
          team1={item.t1}
          team2={item.t2}
          bet={item.bet || {}}
          winner={item.winner}
          onSetBet={onSetBet}
          compact={compact}
        />
      ))}
    </div>
  );
}

function ConnectorStack({ count, gap, side = "right" }) {
  const lineColor = "rgba(148,163,184,0.34)";
  const glow = "rgba(56,189,248,0.12)";
  return (
    <div style={{ display: "grid", gap, paddingTop: 38 }}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} style={{ height: 96, display: "grid", placeItems: "center" }}>
          <div style={{
            width: "100%",
            height: 96,
            position: "relative",
          }}>
            <div style={{
              position: "absolute",
              top: "50%",
              left: side === "right" ? 0 : "50%",
              right: side === "right" ? "50%" : 0,
              height: 2,
              background: lineColor,
              boxShadow: `0 0 12px ${glow}`,
              transform: "translateY(-50%)",
            }} />
            <div style={{
              position: "absolute",
              top: 12,
              bottom: 12,
              left: "50%",
              width: 2,
              background: lineColor,
              boxShadow: `0 0 12px ${glow}`,
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CenterConnector({ side = "left" }) {
  const lineColor = "rgba(148,163,184,0.34)";
  const glow = "rgba(56,189,248,0.12)";
  return (
    <div style={{ display: "grid", gap: 18, alignContent: "center", minHeight: "100%" }}>
      {[0, 1].map((idx) => (
        <div key={idx} style={{ height: 96, position: "relative" }}>
          <div style={{
            position: "absolute",
            top: "50%",
            left: side === "left" ? 0 : "50%",
            right: side === "left" ? "50%" : 0,
            height: 2,
            background: lineColor,
            boxShadow: `0 0 12px ${glow}`,
            transform: "translateY(-50%)",
          }} />
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 2,
            height: "50%",
            background: lineColor,
            boxShadow: `0 0 12px ${glow}`,
            transform: side === "left" ? "translateY(-100%)" : "translateY(0)",
          }} />
        </div>
      ))}
    </div>
  );
}

function BracketCenter({ finalItem, thirdItem, onSetBet }) {
  return (
    <div style={{ display: "grid", gap: 18, alignContent: "center", minHeight: "100%" }}>
      <BracketMatch
        title="Gran final"
        matchId={finalItem.id}
        team1={finalItem.t1}
        team2={finalItem.t2}
        bet={finalItem.bet || {}}
        winner={finalItem.winner}
        onSetBet={onSetBet}
        highlight
      />
      <BracketMatch
        title="3er lugar"
        matchId={thirdItem.id}
        team1={thirdItem.t1}
        team2={thirdItem.t2}
        bet={thirdItem.bet || {}}
        winner={thirdItem.winner}
        onSetBet={onSetBet}
      />
    </div>
  );
}

function BracketView({ userBets, importedMatches = {}, onSetBet }) {
  const { isMobile } = useViewport();
  const standings = computeStandings(userBets);

  const get1st = (group) => getFirst(standings, group);
  const get2nd = (group) => getSecond(standings, group);

  const winnerFromBet = (team1, team2, bet) => {
    if (!bet || bet.home === "" || bet.away === "") return null;
    if (+bet.home === +bet.away) return null;
    return +bet.home > +bet.away ? team1 : team2;
  };

  const loserFromBet = (team1, team2, bet) => {
    if (!bet || bet.home === "" || bet.away === "") return null;
    if (+bet.home === +bet.away) return null;
    return +bet.home > +bet.away ? team2 : team1;
  };

  const r16Teams = (id) => {
    const match = R16.find((item) => item.id === id);
    return [get1st(match.grpA), get2nd(match.grpB)];
  };

  const r16Winner = (id) => {
    const [home, away] = r16Teams(id);
    return winnerFromBet(home, away, userBets[id]) || "?";
  };

  const ofTeams = (id) => {
    const match = OF.find((item) => item.id === id);
    return [r16Winner(match.r16A), r16Winner(match.r16B)];
  };

  const ofWinner = (id) => {
    const [home, away] = ofTeams(id);
    return winnerFromBet(home, away, userBets[id]) || "?";
  };

  const qfTeams = (id) => {
    const match = QF.find((item) => item.id === id);
    return [ofWinner(match.ofA), ofWinner(match.ofB)];
  };

  const qfWinner = (id) => {
    const [home, away] = qfTeams(id);
    return winnerFromBet(home, away, userBets[id]) || "?";
  };

  const sfTeams = (id) => {
    const match = SF.find((item) => item.id === id);
    return [qfWinner(match.qfA), qfWinner(match.qfB)];
  };

  const sfWinner = (id) => {
    const [home, away] = sfTeams(id);
    return winnerFromBet(home, away, userBets[id]) || "?";
  };

  const sfLoser = (id) => {
    const [home, away] = sfTeams(id);
    return loserFromBet(home, away, userBets[id]) || "?";
  };

  const r16Items = R16.map((match) => {
    const [fallbackT1, fallbackT2] = r16Teams(match.id);
    const imported = importedMatches[match.id] || {};
    const t1 = imported.home || fallbackT1;
    const t2 = imported.away || fallbackT2;
    return { id: match.id, t1, t2, bet: userBets[match.id] || {}, winner: winnerFromBet(t1, t2, userBets[match.id]) };
  });

  const ofItems = OF.map((match) => {
    const [fallbackT1, fallbackT2] = ofTeams(match.id);
    const imported = importedMatches[match.id] || {};
    const t1 = imported.home || fallbackT1;
    const t2 = imported.away || fallbackT2;
    return { id: match.id, t1, t2, bet: userBets[match.id] || {}, winner: winnerFromBet(t1, t2, userBets[match.id]) };
  });

  const qfItems = QF.map((match) => {
    const [fallbackT1, fallbackT2] = qfTeams(match.id);
    const imported = importedMatches[match.id] || {};
    const t1 = imported.home || fallbackT1;
    const t2 = imported.away || fallbackT2;
    return { id: match.id, t1, t2, bet: userBets[match.id] || {}, winner: winnerFromBet(t1, t2, userBets[match.id]) };
  });

  const sfItems = SF.map((match) => {
    const [fallbackT1, fallbackT2] = sfTeams(match.id);
    const imported = importedMatches[match.id] || {};
    const t1 = imported.home || fallbackT1;
    const t2 = imported.away || fallbackT2;
    return { id: match.id, t1, t2, bet: userBets[match.id] || {}, winner: winnerFromBet(t1, t2, userBets[match.id]) };
  });

  const leftR16 = r16Items.slice(0, 8);
  const rightR16 = r16Items.slice(8).reverse();
  const leftOF = ofItems.slice(0, 4);
  const rightOF = ofItems.slice(4).reverse();
  const leftQF = qfItems.slice(0, 2);
  const rightQF = qfItems.slice(2).reverse();
  const leftSF = sfItems.slice(0, 1);
  const rightSF = sfItems.slice(1).reverse();

  const leftSfId = leftSF[0]?.id || "SF-01";
  const rightSfId = rightSF[0]?.id || "SF-02";

  const importedFinal = importedMatches["FINAL"] || {};
  const importedThird = importedMatches["3RO-01"] || {};

  const finalTeam1 = importedFinal.home || sfWinner(leftSfId);
  const finalTeam2 = importedFinal.away || sfWinner(rightSfId);
  const thirdTeam1 = importedThird.home || sfLoser(leftSfId);
  const thirdTeam2 = importedThird.away || sfLoser(rightSfId);

  const finalItem = {
    id: "FINAL",
    t1: finalTeam1,
    t2: finalTeam2,
    bet: userBets["FINAL"] || {},
    winner: winnerFromBet(finalTeam1, finalTeam2, userBets["FINAL"]),
  };

  const thirdItem = {
    id: "3RO-01",
    t1: thirdTeam1,
    t2: thirdTeam2,
    bet: userBets["3RO-01"] || {},
    winner: winnerFromBet(thirdTeam1, thirdTeam2, userBets["3RO-01"]),
  };

  return (
    <div style={{ marginTop: 20 }}>
      <Card style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 22 }}>Bracket eliminatorio central</div>
            <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 4 }}>
              Final y 3er lugar al centro, con conectores visuales y llaves que avanzan desde los costados.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(250,204,21,0.12)", color: "#fde68a", fontSize: 12, fontWeight: 700 }}>Centro premium</span>
            <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(56,189,248,0.12)", color: "#7dd3fc", fontSize: 12, fontWeight: 700 }}>Conectores activos</span>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <div style={{
            minWidth: isMobile ? 1440 : 1720,
            display: "grid",
            gridTemplateColumns: "1.15fr 48px .98fr 48px .84fr 48px .68fr 68px .9fr 68px .68fr 48px .84fr 48px .98fr 48px 1.15fr",
            gap: 10,
            alignItems: "center"
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>16avos · Lado A</div>
              <BracketLane items={leftR16} onSetBet={onSetBet} gap={12} compact />
            </div>

            <ConnectorStack count={8} gap={12} side="right" />

            <div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>8vos · Lado A</div>
              <BracketLane items={leftOF} onSetBet={onSetBet} gap={34} />
            </div>

            <ConnectorStack count={4} gap={34} side="right" />

            <div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>4tos · Lado A</div>
              <BracketLane items={leftQF} onSetBet={onSetBet} gap={96} />
            </div>

            <ConnectorStack count={2} gap={96} side="right" />

            <div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>Semis · Lado A</div>
              <BracketLane items={leftSF} onSetBet={onSetBet} gap={188} />
            </div>

            <CenterConnector side="left" />

            <BracketCenter finalItem={finalItem} thirdItem={thirdItem} onSetBet={onSetBet} />

            <CenterConnector side="right" />

            <div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, textAlign: "right" }}>Semis · Lado B</div>
              <BracketLane items={rightSF} onSetBet={onSetBet} gap={188} />
            </div>

            <ConnectorStack count={2} gap={96} side="left" />

            <div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, textAlign: "right" }}>4tos · Lado B</div>
              <BracketLane items={rightQF} onSetBet={onSetBet} gap={96} />
            </div>

            <ConnectorStack count={4} gap={34} side="left" />

            <div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, textAlign: "right" }}>8vos · Lado B</div>
              <BracketLane items={rightOF} onSetBet={onSetBet} gap={34} />
            </div>

            <ConnectorStack count={8} gap={12} side="left" />

            <div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, textAlign: "right" }}>16avos · Lado B</div>
              <BracketLane items={rightR16} onSetBet={onSetBet} gap={12} compact />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
/* =============================
   HOOKS / RESPONSIVE
============================= */

function useViewport() {
  const [width, setWidth] = React.useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );

  React.useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return {
    width,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1100,
  };
}
/* =============================
   APP PRINCIPAL
============================= */

export default function App() {
  const { isMobile, isTablet } = useViewport();
  const [XLSX, setXLSX] = useState(null);
  const [store, setStore] = useState({});
  const [view, setView] = useState("home");
  const [activeUser, setActiveUser] = useState(null);
  const [newName, setNewName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState("");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [bracketMode, setBracketMode] = useState(false);
  const [calendarTab, setCalendarTab] = useState("groups");
  const [userSection, setUserSection] = useState("dashboard");
  const [adminPhaseFilter, setAdminPhaseFilter] = useState("GRUPOS");
  const lastSavedRef = useRef("");
  const [journeyDate, setJourneyDate] = useState("");
  const [latestJourney, setLatestJourney] = useState(null);
  const [previousRankMap, setPreviousRankMap] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem(RANK_SNAPSHOT_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  useEffect(() => {
  console.log("Escuchando Firebase en tiempo real...");

  const ref = doc(db, "quiniela", "main");

  const unsubscribe = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        console.log("No existe documento todavía en Firebase.");
        return;
      }

      const incoming = snap.data();
      const serializedIncoming = JSON.stringify(incoming);

      console.log("Snapshot recibido:", incoming);

      if (lastSavedRef.current === serializedIncoming) return;

      setStore(incoming);
    },
    (error) => {
      console.error("Error escuchando Firebase:", error);
    }
  );

  return () => unsubscribe();
}, []);

  useEffect(() => {
    if (window.XLSX) {
      setXLSX(window.XLSX);
      return;
    }
    const script = document.createElement("script");
    script.src = SHEETJS;
    script.onload = () => setXLSX(window.XLSX);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
  if (!store || Object.keys(store).length === 0) return;

  const serialized = JSON.stringify(store);

  if (lastSavedRef.current === serialized) return;

  lastSavedRef.current = serialized;

  saveStoreToFirebase(store).catch((error) => {
    console.error("Error guardando en Firebase:", error);
  });
}, [store]);

useEffect(() => {
  const unsubscribe = subscribeLatestJourneySummary((summary) => {
    setLatestJourney(summary);
  });

  return () => unsubscribe();
}, []);

useEffect(() => {
  console.log("STORE CAMBIÓ:", store);
}, [store]);

  // Store normalizado
  const users = store.users || {};
  const bets = store.bets || {};
  // results = resultados oficiales capturados por admin
  const results = store.results || {};
  const importedMatches = store.importedMatches || {};
  const totalPlayers = Object.keys(users).length;
  const totalPot = totalPlayers * ENTRY_FEE;
  const houseFee = totalPot * HOUSE_FEE_PERCENT;
  const prizePool = totalPot - houseFee;
  
  const firstImportedUser = Object.keys(importedMatches)[0] || null;

const importedMatchesByActiveUser = activeUser
  ? importedMatches[activeUser] || {}
  : firstImportedUser
    ? importedMatches[firstImportedUser] || {}
    : {};

  const totals = useMemo(() => {
    return Object.keys(users)
      .map((user) => {
        const summary = computeUserScoreSummary(bets[user] || {}, results || {});
        return {
          user,
          ...summary,
          color: users[user]?.color,
        };
      })
      .sort((a, b) => b.pts - a.pts);
  }, [users, bets, results]);

  const totalsWithMovement = useMemo(() => {
    return totals.map((row, index) => {
      const currentRank = index + 1;
      const prevRank = previousRankMap[row.user];
      const movement = typeof prevRank === "number" ? prevRank - currentRank : 0;
      return { ...row, rank: currentRank, movement };
    });
  }, [totals, previousRankMap]);

  useEffect(() => {
    if (!totals.length) return;
    const snapshot = Object.fromEntries(totals.map((row, index) => [row.user, index + 1]));
    try {
      window.localStorage.setItem(RANK_SNAPSHOT_KEY, JSON.stringify(snapshot));
      setPreviousRankMap((prev) => (Object.keys(prev).length ? prev : snapshot));
    } catch {}
  }, [totals]);

  const setBet = (user, id, side, value) => {
    setStore((current) => ({
      ...current,
      bets: {
        ...(current.bets || {}),
        [user]: {
          ...(current.bets?.[user] || {}),
          [id]: {
            ...(current.bets?.[user]?.[id] || {}),
            [side]: value,
          },
        },
      },
    }));
  };

  const setResult = (id, side, value) => {
    setStore((current) => ({
      ...current,
      results: {
        ...(current.results || {}),
        [id]: {
          ...(current.results?.[id] || {}),
          [side]: value,
        },
      },
    }));
  };

  const addUser = () => {
    const name = newName.trim();
    if (!name) return;
    setStore((current) => ({
      ...current,
      users: {
        ...(current.users || {}),
        [name]: current.users?.[name] || { name, color: randomColor() },
      },
    }));
    setActiveUser(name);
    setView("user");
    setNewName("");
  };

  const handleImport = (name, importedBets, importedMatches = {}) => {
    const assignedColor = users[name]?.color || randomColor();

    setStore((current) => ({
      ...current,
      users: {
        ...(current.users || {}),
        [name]: current.users?.[name] || { name, color: assignedColor },
      },
      bets: {
        ...(current.bets || {}),
        [name]: {
          ...(current.bets?.[name] || {}),
          ...importedBets,
        },
      },
      importedMatches: {
        ...(current.importedMatches || {}),
        [name]: {
          ...(current.importedMatches?.[name] || {}),
          ...importedMatches,
        },
      },
    }));
    setToast(`Se importaron ${Object.keys(importedBets).length} apuestas de ${name}.`);
  };

  const goToUser = (name) => {
    setActiveUser(name);
    setUserSection("dashboard");
    setView("user");
  };

  const tryAdmin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setAdminError("");
      setAdminPassword("");
      setIsAdminUnlocked(true);
      setView("admin");
            return;
    }
    setAdminError("Contraseña incorrecta.");
  };

  const logoutAdmin = () => {
  setIsAdminUnlocked(false);
  setView("home");
  };

function removeUser(userName) {
  const confirmed = window.confirm(`¿Eliminar a ${userName} de la quiniela?`);
  if (!confirmed) return;

  setStore((current) => {
    const nextUsers = { ...(current.users || {}) };
    const nextBets = { ...(current.bets || {}) };
    const nextImportedMatches = { ...(current.importedMatches || {}) };

    delete nextUsers[userName];
    delete nextBets[userName];
    delete nextImportedMatches[userName];

    return {
      ...current,
      users: nextUsers,
      bets: nextBets,
      importedMatches: nextImportedMatches,
    };
  });

  if (activeUser === userName) {
    setActiveUser(null);
    setView("home");
  }

  setToast(`${userName} fue eliminado de la quiniela.`);
}

async function removeJourney(journeyDate) {
  const confirmed = window.confirm(
    `¿Eliminar la jornada ${journeyDate}?`
  );
  if (!confirmed) return;

  try {
    await deleteJourneySummary(journeyDate);
    setToast(`Jornada eliminada.`);
  } catch (err) {
    console.error(err);
    setToast("Error eliminando jornada.");
  }
}

  /**
   * closeJourney
   * ----------------------------------------------------------
   * Cierra una jornada con base en una fecha, calcula el resumen
   * del día y lo guarda en Firebase.
   */
  async function closeJourney(journeyDate) {
  try {
    const matchesOfDay = getMatchesByDate(
      importedMatchesByActiveUser,
      results,
      journeyDate
    );

    if (!matchesOfDay.length) {
      setToast(`No hay partidos finalizados para la fecha ${journeyDate}.`);
      return;
    }

    const participantScores = calcJourneyScores(
      users,
      bets,
      results,
      matchesOfDay
    );

    const summary = {
      date: journeyDate,
      matches: matchesOfDay.map((match) => ({
        id: match.id,
        stage: match.stage,
        group: match.group,
        home: match.home,
        away: match.away,
        date: match.date,
        time: match.time,
        stadium: match.stadium,
        city: match.city,
        result: results[match.id] || {},
      })),
      participantScores,
    };

    await saveJourneySummary(journeyDate, summary);

    setToast(`Jornada ${journeyDate} cerrada correctamente.`);
  } catch (error) {
    console.error("Error cerrando jornada:", error);
    setToast("No se pudo cerrar la jornada.");
  }
}

  const userBets = activeUser ? bets[activeUser] || {} : {};
  const filteredGroupMatches = GROUP_MATCHES
    .filter((match) => groupFilter === "ALL" || match.group === groupFilter)
    .map((match) => enrichMatch(match, importedMatchesByActiveUser));
  const groupedSchedule = groupMatchesBySection(filteredGroupMatches);

  const predictedGroupTables = useMemo(() => computeGroupTablesDetailed(userBets), [userBets]);
  const officialGroupTables = useMemo(() => computeGroupTablesDetailed(results), [results]);

  const referenceImportedMatches = firstImportedUser ? importedMatches[firstImportedUser] || {} : {};
  const stageFinalIds = ["3RO-01", "FINAL"];

  const adminPhaseMatches = useMemo(() => {
    const groups = GROUP_MATCHES.map((match) => ({ ...match, stageLabel: "Grupos" })).map((match) => enrichMatch(match, referenceImportedMatches));
    const r16Matches = R16.map((match) => ({ ...match, stageLabel: "16vos" })).map((match) => enrichMatch(match, referenceImportedMatches));
    const ofMatches = OF.map((match) => ({ ...match, stageLabel: "8vos" })).map((match) => enrichMatch(match, referenceImportedMatches));
    const qfMatches = QF.map((match) => ({ ...match, stageLabel: "4tos" })).map((match) => enrichMatch(match, referenceImportedMatches));
    const finalsMatches = stageFinalIds
      .filter((id) => MATCH_META[id] || referenceImportedMatches[id] || results[id])
      .map((id) => enrichMatch({ id, stageLabel: id === "3RO-01" ? "3er lugar" : "Final" }, referenceImportedMatches));

    switch (adminPhaseFilter) {
      case "GRUPOS":
        return groups;
      case "16VOS":
        return r16Matches;
      case "8VOS":
        return ofMatches;
      case "4TOS":
        return qfMatches;
      case "FINALES":
        return finalsMatches;
      default:
        return [...groups, ...r16Matches, ...ofMatches, ...qfMatches, ...finalsMatches];
    }
  }, [adminPhaseFilter, referenceImportedMatches, results]);

  const groupedAdminSchedule = groupMatchesBySection(adminPhaseMatches);

  return (
    <Shell>
      {toast ? <Toast message={toast} onDone={() => setToast("")} /> : null}
      {showImport && XLSX ? <ImportModal XLSX={XLSX} onClose={() => setShowImport(false)} onImport={handleImport} /> : null}

      {view === "home" ? (
        <>
          <HeaderHero
            usersCount={Object.keys(users).length}
            totalPot={totalPot}
            currency="MXN"
            onImport={() => setShowImport(true)}
            onOpenAdmin={() => setView("adminLogin")}
            onOpenTable={() => setView("table")}
            onOpenPromo={() => setView("promo")}
            isAdminView={view === "admin"}
          />
          <Container>
            <JourneySummaryCard summary={latestJourney} />
            <div style={{ display: "grid", gridTemplateColumns: isMobile || isTablet ? "1fr" : "1.15fr 0.85fr", gap: 18 }}>
              <SummaryTable totals={totalsWithMovement} users={users} bets={bets} onOpenUser={goToUser} />
              <div style={{ display: "grid", gap: 18 }}>
                <ParticipantList users={users} onOpenUser={goToUser} />
                <Card style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>Registrar participante</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <TextInput placeholder="Nombre del participante" value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addUser()} />
                    <PrimaryButton onClick={addUser}>Agregar</PrimaryButton>
                  </div>
                </Card>
                <Card style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Flujo de trabajo</div>
                  <div style={{ color: "#b8c4d9", lineHeight: 1.7 }}>
                    1. Envías el Excel a cada participante. <br />
                    2. Cada persona llena sus marcadores. <br />
                    3. Importas el archivo aquí. <br />
                    4. La app lo presenta con diseño profesional.
                  </div>
                </Card>
              </div>
            </div>
          </Container>
        </>
      ) : null}

      {view === "promo" ? (
        <>
          <TopBar left={<BackButton onClick={() => setView("home")} />} center={<strong>Landing promocional</strong>} />
          <InfografiaPromo />
        </>
      ) : null}

      {view === "adminLogin" ? (
        <>
          <TopBar
  left={<BackButton onClick={() => setView("home")} />}
  center={<strong>Panel admin · resultados reales</strong>}
  right={
    <button
      onClick={logoutAdmin}
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        border: "1px solid rgba(248,113,113,0.35)",
        background: "rgba(248,113,113,0.12)",
        color: "#fca5a5",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      Salir
    </button>
  }
/>
          <Container>
            <Card style={{ marginTop: 26, padding: 24, maxWidth: 520 }}>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Entrar al panel admin</div>
              <TextInput type="password" placeholder="Contraseña" value={adminPassword} onChange={(event) => { setAdminPassword(event.target.value); setAdminError(""); }} onKeyDown={(event) => event.key === "Enter" && tryAdmin()} />
              {adminError ? <div style={{ color: "#fda4af", marginTop: 8 }}>{adminError}</div> : null}
              <div style={{ marginTop: 16 }}>
                <PrimaryButton onClick={tryAdmin}>Entrar</PrimaryButton>
              </div>
            </Card>
          </Container>
        </>
      ) : null}

      {view === "user" && activeUser ? (
        <>
          <TopBar
            left={<BackButton onClick={() => setView("home")} />}
            center={<div style={{ display: "flex", alignItems: "center", gap: 10 }}><Dot color={users[activeUser]?.color} /><strong>{activeUser}</strong></div>}
            right={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <GhostButton active={userSection === "dashboard"} onClick={() => setUserSection("dashboard")}>Dashboard</GhostButton>
                <GhostButton active={userSection === "calendar"} onClick={() => setUserSection("calendar")}>Calendario</GhostButton>
                <GhostButton active={userSection === "bracket"} onClick={() => setUserSection("bracket")}>Bracket</GhostButton>
              </div>
            }
          />
          <Container>
            {(() => {
              const row = totalsWithMovement.find((item) => item.user === activeUser) || computeUserScoreSummary(userBets, results);
              return (
                <>
                  {userSection === "dashboard" ? (
                    <UserDashboard summary={row} totals={totalsWithMovement} activeUser={activeUser} />
                  ) : userSection === "calendar" ? (
                    <>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
                        <GhostButton active={calendarTab === "groups"} onClick={() => setCalendarTab("groups")}>Grupos</GhostButton>
                        <GhostButton active={calendarTab === "matches"} onClick={() => setCalendarTab("matches")}>Partidos</GhostButton>
                      </div>

                      {calendarTab === "groups" ? (
                        <>
                          <ScoreRulesCard compact />
                          <GroupComparisonBoard
                            predictedTables={predictedGroupTables}
                            officialTables={officialGroupTables}
                          />
                        </>
                      ) : (
                        <>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
                            {["ALL", ...Object.keys(GROUPS)].map((group) => (
                              <GhostButton key={group} active={groupFilter === group} onClick={() => setGroupFilter(group)}>
                                {group === "ALL" ? "Todos los grupos" : `Grupo ${group}`}
                              </GhostButton>
                            ))}
                          </div>
                          {groupedSchedule.map(([title, matches]) => (
                            <ScheduleSection key={title} title={title} matches={matches} bets={userBets} results={results} onChange={(id, side, value) => setBet(activeUser, id, side, value)} />
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    <div style={{ marginTop: 20 }}>
                      <ScoreRulesCard compact />
                      <BracketView userBets={userBets} importedMatches={importedMatchesByActiveUser} onSetBet={(id, side, value) => setBet(activeUser, id, side, value)} />
                    </div>
                  )}
                </>
              );
            })()}
          </Container>
        </>
      ) : null}

      {view === "admin" ? (
  <>
    <TopBar left={<BackButton onClick={() => setView("home")} />} center={<strong>Panel admin · resultados reales</strong>} />
    <Container>

      <Card style={{ padding: 20, marginBottom: 20 }}>
  <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>
    Herramientas de administrador
  </div>

  <div style={{ color: "#94a3b8", marginBottom: 14 }}>
    Desde aquí puedes importar archivos y cerrar la jornada del día.
  </div>

  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
    <PrimaryButton onClick={() => setShowImport(true)}>
      Cargar quiniela
    </PrimaryButton>
  </div>

  <Card style={{ padding: 20, marginBottom: 20 }}>
  <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>
    Gestionar participantes
  </div>

  <div style={{ color: "#94a3b8", marginBottom: 14 }}>
    Elimina participantes cargados en la quiniela.
  </div>

  <div style={{ display: "grid", gap: 10 }}>
    {Object.keys(users).length === 0 ? (
      <div style={{ color: "#8ea0bb" }}>No hay participantes registrados.</div>
    ) : (
      Object.keys(users).map((userName) => (
        <div
          key={userName}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ fontWeight: 700 }}>{userName}</div>

          <button
            onClick={() => removeUser(userName)}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(248,113,113,0.35)",
              background: "rgba(248,113,113,0.12)",
              color: "#fca5a5",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Eliminar
          </button>
        </div>
      ))
    )}
  </div>
</Card>

  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>
    Cerrar jornada
  </div>

<Card style={{ padding: 20, marginBottom: 20 }}>
  <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>
    Gestionar jornadas
  </div>

  <div style={{ color: "#94a3b8", marginBottom: 14 }}>
    Elimina reportes de jornada guardados en la quiniela.
  </div>

  {!latestJourney ? (
    <div style={{ color: "#8ea0bb" }}>
      No hay jornadas registradas.
    </div>
  ) : (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div>
        <div style={{ fontWeight: 700 }}>
          Jornada {latestJourney.date}
        </div>
        <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
          Última jornada cerrada
        </div>
      </div>

      <button
        onClick={() => removeJourney(latestJourney.date)}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid rgba(248,113,113,0.35)",
          background: "rgba(248,113,113,0.12)",
          color: "#fca5a5",
          cursor: "pointer",
          fontWeight: 700,
          transition: "all 0.2s ease",
        }}
      >
        Eliminar jornada
      </button>
    </div>
  )}
</Card>
  <div style={{ color: "#94a3b8", marginBottom: 10 }}>
    Selecciona la fecha para generar el resumen del día.
  </div>

  <div style={{ display: "flex", gap: 10 }}>
    <input
      type="date"
      value={journeyDate}
      onChange={(e) => setJourneyDate(e.target.value)}
    />

    <button onClick={() => closeJourney(journeyDate)}>
      Cerrar jornada
    </button>
  </div>
</Card>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
        {[
          ["GRUPOS", "Grupos"],
          ["16VOS", "16vos"],
          ["8VOS", "8vos"],
          ["4TOS", "4tos"],
          ["FINALES", "Final · 3er lugar"],
          ["ALL", "Todo"],
        ].map(([key, label]) => (
          <GhostButton key={key} active={adminPhaseFilter === key} onClick={() => setAdminPhaseFilter(key)}>
            {label}
          </GhostButton>
        ))}
      </div>

      {groupedAdminSchedule.map(([title, matches]) => (
        <ScheduleSection
          key={title}
          title={title}
          matches={matches}
          bets={{}}
          results={results}
          isAdmin
          onChange={(id, side, value) => setResult(id, side, value)}
        />
      ))}
    </Container>
  </>
) : null}

      {view === "table" ? (
        <>
          <TopBar left={<BackButton onClick={() => setView("home")} />} center={<strong>Tabla general</strong>} right={<div />} />
          <Container>
            <div style={{ marginTop: 24 }}>
              <SummaryTable totals={totalsWithMovement} users={users} bets={bets} onOpenUser={goToUser} />
            </div>
          </Container>
        </>
      ) : null}
    </Shell>
  );
}


