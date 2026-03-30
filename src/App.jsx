import React, { useEffect, useMemo, useRef, useState } from "react";

const SHEETJS = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
const STORAGE_KEY = "quiniela2026_pro_full_v1";
const ADMIN_PASSWORD = "mundial2026";

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

const FLAGS = {
  "México": "🇲🇽",
  "Sudáfrica": "🇿🇦",
  "Corea del Sur": "🇰🇷",
  "Rep. Checa/Dinamarca*": "🏳️",
  "Canadá": "🇨🇦",
  "Bosnia/Italia*": "🏳️",
  "Qatar": "🇶🇦",
  "Suiza": "🇨🇭",
  "Brasil": "🇧🇷",
  "Marruecos": "🇲🇦",
  "Haití": "🇭🇹",
  "Escocia": "🏴",
  "Estados Unidos": "🇺🇸",
  "Paraguay": "🇵🇾",
  "Australia": "🇦🇺",
  "Kosovo/Turquía*": "🏳️",
  "Alemania": "🇩🇪",
  "Curazao": "🏳️",
  "Costa de Marfil": "🇨🇮",
  "Ecuador": "🇪🇨",
  "Países Bajos": "🇳🇱",
  "Japón": "🇯🇵",
  "Suecia/Polonia*": "🏳️",
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
  "Bolivia/Irak*": "🏳️",
  "Noruega": "🇳🇴",
  "Argentina": "🇦🇷",
  "Argelia": "🇩🇿",
  "Austria": "🇦🇹",
  "Jordania": "🇯🇴",
  "Portugal": "🇵🇹",
  "Jamaica/RD Congo*": "🏳️",
  "Uzbekistán": "🇺🇿",
  "Colombia": "🇨🇴",
  "Inglaterra": "🏴",
  "Croacia": "🇭🇷",
  "Ghana": "🇬🇭",
  "Panamá": "🇵🇦",
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

function getFlag(team) {
  return FLAGS[team] || "🏳️";
}

function randomColor() {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStore(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
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

const QF = Array.from({ length: 8 }, (_, i) => ({
  id: `QF-${String(i + 1).padStart(2, "0")}`,
  stage: "Cuartos",
  r16A: `R16-${String(i * 2 + 1).padStart(2, "0")}`,
  r16B: `R16-${String(i * 2 + 2).padStart(2, "0")}`,
}));

const SF = Array.from({ length: 4 }, (_, i) => ({
  id: `SF-${String(i + 1).padStart(2, "0")}`,
  stage: "Semis",
  qfA: `QF-${String(i * 2 + 1).padStart(2, "0")}`,
  qfB: `QF-${String(i * 2 + 2).padStart(2, "0")}`,
}));

const FINALS = [
  { id: "FINAL", stage: "Final", sfA: "SF-01", sfB: "SF-02" },
  { id: "FINAL2", stage: "Final", sfA: "SF-03", sfB: "SF-04" },
];

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

  QF.forEach((match, index) => {
    const venue = venues[index % venues.length];
    meta[match.id] = {
      date: `2026-07-${String(8 + Math.floor(index / 4)).padStart(2, "0")}`,
      dayLabel: `Cuartos · Día ${Math.floor(index / 4) + 1}`,
      time: ["16:00", "20:00"][index % 2],
      stadium: venue[0],
      city: venue[1],
      sectionLabel: `Cuartos · Día ${Math.floor(index / 4) + 1}`,
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
      dayLabel: index === 0 ? "Final A" : "Final B",
      time: "20:00",
      stadium: venue[0],
      city: venue[1],
      sectionLabel: "Finales",
      sortOrder: 500 + index,
    };
  });

  return meta;
}

function enrichMatch(match) {
  return { ...match, ...(MATCH_META[match.id] || {}) };
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

function getFirst(standings, group) {
  return standings[group]?.[0] || `1° ${group}`;
}

function getSecond(standings, group) {
  return standings[group]?.[1] || `2° ${group}`;
}


function cleanTeamName(name) {
  if (!name) return "";
  return String(name)
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .trim();
}

function normalizeSheetNameMap(workbook) {
  const byLower = {};
  (workbook.SheetNames || []).forEach((name) => {
    byLower[String(name).trim().toLowerCase()] = name;
  });
  return byLower;
}

function getSheetByAliases(workbook, aliases) {
  const nameMap = normalizeSheetNameMap(workbook);
  for (const alias of aliases) {
    const found = nameMap[String(alias).trim().toLowerCase()];
    if (found && workbook.Sheets[found]) return workbook.Sheets[found];
  }
  return null;
}

function readSheetRows(workbook, XLSX, aliases) {
  const sheet = getSheetByAliases(workbook, aliases);
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function getRowValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return "";
}

function parseMatchSheet(rows) {
  const bets = {};

  rows.forEach((row) => {
    const id = getRowValue(row, ["ID", "Id", "id", "Partido", "PARTIDO", "Match ID"]);
    if (!id) return;

    const homeGoals = getRowValue(row, [
      "Goles Local",
      "GL",
      "Marcador Local",
      "Local Goles",
      "Home Goals",
      "Home",
    ]);

    const awayGoals = getRowValue(row, [
      "Goles Visitante",
      "GV",
      "Marcador Visitante",
      "Visitante Goles",
      "Away Goals",
      "Away",
    ]);

    const homeValue = homeGoals !== "" ? String(homeGoals).trim() : "";
    const awayValue = awayGoals !== "" ? String(awayGoals).trim() : "";

    if (homeValue !== "" || awayValue !== "") {
      bets[String(id).trim()] = { home: homeValue, away: awayValue };
    }
  });

  return bets;
}

function parseExcel(buffer, XLSX) {
  const workbook = XLSX.read(buffer, { type: "array" });

  const groupsSheet = getSheetByAliases(workbook, ["1_GRUPOS", "GRUPOS", "1 grupos"]);
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

  const groupsRows = readSheetRows(workbook, XLSX, ["1_GRUPOS", "GRUPOS", "1 grupos"]);
  const r16Rows = readSheetRows(workbook, XLSX, ["2_16AVOS", "16AVOS", "2 16AVOS"]);
  const qfRows = readSheetRows(workbook, XLSX, ["3_CUARTOS", "CUARTOS", "3 CUARTOS"]);
  const sfRows = readSheetRows(workbook, XLSX, ["4_SEMIS", "SEMIS", "4 SEMIS"]);
  const finalRows = readSheetRows(workbook, XLSX, ["5_FINAL", "FINAL", "5 FINAL"]);

  const bets = {
    ...parseMatchSheet(groupsRows),
    ...parseMatchSheet(r16Rows),
    ...parseMatchSheet(qfRows),
    ...parseMatchSheet(sfRows),
    ...parseMatchSheet(finalRows),
  };

  return { name, bets };
}

function useViewport() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);

  useEffect(() => {
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

function HeaderHero({ usersCount, totalPot, currency, onImport, onOpenAdmin, onOpenTable, onOpenPot }) {
  const { isMobile, isTablet } = useViewport();
  return (
    <div style={{ padding: isMobile ? "18px 0 18px" : "34px 0 26px" }}>
      <Container>
        <Card style={{ padding: isMobile ? 18 : 28, overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 20% 20%, rgba(34,197,94,0.18), transparent 35%), radial-gradient(circle at 85% 15%, rgba(56,189,248,0.15), transparent 30%), radial-gradient(circle at 60% 100%, rgba(250,204,21,0.1), transparent 28%)" }} />
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: isMobile ? "1fr" : (isTablet ? "1fr" : "1.4fr 1fr"), gap: 20 }}>
            <div>
              <div style={{ display: "inline-flex", padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#93c5fd", fontWeight: 700, fontSize: 12 }}>Mundial 2026 · Quiniela pro</div>
              <h1 style={{ margin: "16px 0 10px", fontFamily: "Barlow Condensed, sans-serif", fontSize: isMobile ? "44px" : "clamp(52px, 8vw, 84px)", lineHeight: 0.9, letterSpacing: -1, textTransform: "uppercase" }}>
                Quiniela <span style={{ color: "#34d399" }}>2026</span>
              </h1>
              <p style={{ margin: 0, maxWidth: 640, color: "#b8c4d9", lineHeight: 1.7 }}>
                Mantienes el mismo flujo del Excel, pero ahora la app muestra los partidos con una presentación más cuidada, una vista tipo calendario y tarjetas mucho más premium.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18, flexDirection: isMobile ? "column" : "row" }}>
                <PrimaryButton onClick={onImport}>Importar Excel</PrimaryButton>
                <GhostButton onClick={onOpenTable}>Tabla general</GhostButton>
                <GhostButton onClick={onOpenPot}>Bote</GhostButton>
                <GhostButton onClick={onOpenAdmin}>Admin</GhostButton>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(2, minmax(0, 1fr))", gap: 12, alignContent: "start" }}>
              <StatChip label="Participantes" value={usersCount} accent="#7dd3fc" />
              <StatChip label="Bote" value={`${Number(totalPot).toLocaleString()} ${currency}`} accent="#facc15" />
              <StatChip label="Formato" value="Excel → App" accent="#34d399" />
              <StatChip label="Vista" value="Calendario" accent="#c084fc" />
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
          {preview ? <PrimaryButton onClick={() => { onImport(preview.name, preview.bets); onClose(); }} style={{ flex: 1 }}>Importar</PrimaryButton> : null}
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
              {["#", "Participante", "Pts", "Exactos", "Resultado", "Cargados"].map((heading) => (
                <th key={heading} style={{ textAlign: "left", padding: "14px 16px", color: "#93c5fd", fontSize: 12, letterSpacing: 0.4 }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {totals.map((row, index) => (
              <tr key={row.user} onClick={() => onOpenUser(row.user)} style={{ cursor: "pointer", borderTop: "1px solid rgba(255,255,255,0.05)", background: index === 0 ? "rgba(250,204,21,0.06)" : "transparent" }}>
                <td style={{ padding: 16, fontWeight: 800 }}>{index + 1}</td>
                <td style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Dot color={users[row.user]?.color} />
                    <strong>{row.user}</strong>
                  </div>
                </td>
                <td style={{ padding: 16, color: "#34d399", fontWeight: 800 }}>{row.pts}</td>
                <td style={{ padding: 16 }}>{row.exact}</td>
                <td style={{ padding: 16 }}>{row.result}</td>
                <td style={{ padding: 16, color: "#94a3b8" }}>{Object.keys(bets[row.user] || {}).length}/{GROUP_MATCHES.length}</td>
              </tr>
            ))}
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
          <div style={{ color: "#8ea0bb", fontSize: 14 }}>{matches.length} partido{matches.length !== 1 ? "s" : ""}</div>
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

function BracketView({ userBets, onSetBet }) {
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

  const qfTeams = (id) => {
    const match = QF.find((item) => item.id === id);
    return [r16Winner(match.r16A), r16Winner(match.r16B)];
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
    const [t1, t2] = r16Teams(match.id);
    return { id: match.id, t1, t2, bet: userBets[match.id] || {}, winner: winnerFromBet(t1, t2, userBets[match.id]) };
  });

  const qfItems = QF.map((match) => {
    const [t1, t2] = qfTeams(match.id);
    return { id: match.id, t1, t2, bet: userBets[match.id] || {}, winner: winnerFromBet(t1, t2, userBets[match.id]) };
  });

  const sfItems = SF.map((match) => {
    const [t1, t2] = sfTeams(match.id);
    return { id: match.id, t1, t2, bet: userBets[match.id] || {}, winner: winnerFromBet(t1, t2, userBets[match.id]) };
  });

  const leftR16 = r16Items.slice(0, 8);
  const rightR16 = r16Items.slice(8).reverse();
  const leftQF = qfItems.slice(0, 4);
  const rightQF = qfItems.slice(4).reverse();
  const leftSF = sfItems.slice(0, 2);
  const rightSF = sfItems.slice(2).reverse();

  const leftSfId = leftSF[0]?.id || "SF-01";
  const rightSfId = rightSF[0]?.id || "SF-03";

  const finalItem = {
    id: "FINAL",
    t1: sfWinner(leftSfId),
    t2: sfWinner(rightSfId),
    bet: userBets["FINAL"] || {},
    winner: winnerFromBet(sfWinner(leftSfId), sfWinner(rightSfId), userBets["FINAL"]),
  };

  const thirdItem = {
    id: "FINAL2",
    t1: sfLoser(leftSfId),
    t2: sfLoser(rightSfId),
    bet: userBets["FINAL2"] || {},
    winner: winnerFromBet(sfLoser(leftSfId), sfLoser(rightSfId), userBets["FINAL2"]),
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
            gridTemplateColumns: "1.15fr 58px .95fr 58px .78fr 58px .95fr 58px .78fr 58px .95fr 58px 1.15fr",
            gap: 10,
            alignItems: "center"
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>16avos · Lado A</div>
              <BracketLane items={leftR16} onSetBet={onSetBet} gap={12} compact />
            </div>

            <ConnectorStack count={8} gap={12} side="right" />

            <div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>Cuartos · Lado A</div>
              <BracketLane items={leftQF} onSetBet={onSetBet} gap={34} />
            </div>

            <ConnectorStack count={4} gap={34} side="right" />

            <div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>Semis · Lado A</div>
              <BracketLane items={leftSF} onSetBet={onSetBet} gap={96} />
            </div>

            <CenterConnector side="left" />

            <BracketCenter finalItem={finalItem} thirdItem={thirdItem} onSetBet={onSetBet} />

            <CenterConnector side="right" />

            <div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, textAlign: "right" }}>Semis · Lado B</div>
              <BracketLane items={rightSF} onSetBet={onSetBet} gap={96} />
            </div>

            <ConnectorStack count={4} gap={34} side="left" />

            <div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, textAlign: "right" }}>Cuartos · Lado B</div>
              <BracketLane items={rightQF} onSetBet={onSetBet} gap={34} />
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

export default function App() {
  const { isMobile, isTablet } = useViewport();
  const [XLSX, setXLSX] = useState(null);
  const [store, setStore] = useState(loadStore);
  const [view, setView] = useState("home");
  const [activeUser, setActiveUser] = useState(null);
  const [newName, setNewName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState("");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [bracketMode, setBracketMode] = useState(false);

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
    saveStore(store);
  }, [store]);

  const users = store.users || {};
  const bets = store.bets || {};
  const results = store.results || {};
  const pot = store.pot || { amount: 100, currency: "MXN" };

  const totals = useMemo(() => {
    return Object.keys(users)
      .map((user) => {
        let pts = 0;
        let exact = 0;
        let resultHits = 0;
        GROUP_MATCHES.forEach((match) => {
          const score = calcScore(bets[user]?.[match.id], results[match.id]);
          if (score === 3) {
            pts += 3;
            exact += 1;
          } else if (score === 1) {
            pts += 1;
            resultHits += 1;
          }
        });
        return { user, pts, exact, result: resultHits, color: users[user]?.color };
      })
      .sort((a, b) => b.pts - a.pts);
  }, [users, bets, results]);

  const totalPot = Object.keys(users).length * Number(pot.amount || 0);

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

  const handleImport = (name, importedBets) => {
    setStore((current) => ({
      ...current,
      users: {
        ...(current.users || {}),
        [name]: current.users?.[name] || { name, color: randomColor() },
      },
      bets: {
        ...(current.bets || {}),
        [name]: {
          ...(current.bets?.[name] || {}),
          ...importedBets,
        },
      },
    }));
    setToast(`Se importaron ${Object.keys(importedBets).length} apuestas de ${name}.`);
  };

  const goToUser = (name) => {
    setActiveUser(name);
    setView("user");
  };

  const tryAdmin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setAdminError("");
      setAdminPassword("");
      setView("admin");
      return;
    }
    setAdminError("Contraseña incorrecta.");
  };

  const userBets = activeUser ? bets[activeUser] || {} : {};
  const filteredGroupMatches = GROUP_MATCHES
    .filter((match) => groupFilter === "ALL" || match.group === groupFilter)
    .map(enrichMatch);
  const groupedSchedule = groupMatchesBySection(filteredGroupMatches);

  return (
    <Shell>
      {toast ? <Toast message={toast} onDone={() => setToast("")} /> : null}
      {showImport && XLSX ? <ImportModal XLSX={XLSX} onClose={() => setShowImport(false)} onImport={handleImport} /> : null}

      {view === "home" ? (
        <>
          <HeaderHero
            usersCount={Object.keys(users).length}
            totalPot={totalPot}
            currency={pot.currency}
            onImport={() => setShowImport(true)}
            onOpenAdmin={() => setView("adminLogin")}
            onOpenTable={() => setView("table")}
            onOpenPot={() => setView("pot")}
          />
          <Container>
            <div style={{ display: "grid", gridTemplateColumns: isMobile || isTablet ? "1fr" : "1.15fr 0.85fr", gap: 18 }}>
              <SummaryTable totals={totals} users={users} bets={bets} onOpenUser={goToUser} />
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

      {view === "adminLogin" ? (
        <>
          <TopBar left={<BackButton onClick={() => setView("home")} />} center={<strong>Acceso admin</strong>} right={<div />} />
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
            right={<div style={{ display: "flex", gap: 8 }}><GhostButton active={!bracketMode} onClick={() => setBracketMode(false)}>Calendario</GhostButton><GhostButton active={bracketMode} onClick={() => setBracketMode(true)}>Bracket</GhostButton></div>}
          />
          <Container>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 22 }}>
              {(() => {
                const row = totals.find((item) => item.user === activeUser) || { pts: 0, exact: 0, result: 0 };
                const rank = Math.max(1, totals.findIndex((item) => item.user === activeUser) + 1);
                return (
                  <>
                    <StatChip label="Puntos" value={row.pts} accent="#34d399" />
                    <StatChip label="Posición" value={`#${rank}`} accent="#facc15" />
                    <StatChip label="Exactos" value={row.exact} accent="#7dd3fc" />
                    <StatChip label="Resultado" value={row.result} accent="#c084fc" />
                    <StatChip label="Cargados" value={`${Object.keys(userBets).length}/${GROUP_MATCHES.length}`} accent="#fda4af" />
                  </>
                );
              })()}
            </div>

            {!bracketMode ? (
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
            ) : (
              <BracketView userBets={userBets} onSetBet={(id, side, value) => setBet(activeUser, id, side, value)} />
            )}
          </Container>
        </>
      ) : null}

      {view === "admin" ? (
        <>
          <TopBar left={<BackButton onClick={() => setView("home")} />} center={<strong>Panel admin · resultados reales</strong>} right={<div />} />
          <Container>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
              {["ALL", ...Object.keys(GROUPS)].map((group) => (
                <GhostButton key={group} active={groupFilter === group} onClick={() => setGroupFilter(group)}>
                  {group === "ALL" ? "Todos los grupos" : `Grupo ${group}`}
                </GhostButton>
              ))}
            </div>
            {groupMatchesBySection(filteredGroupMatches).map(([title, matches]) => (
              <ScheduleSection key={title} title={title} matches={matches} bets={{}} results={results} isAdmin onChange={(id, side, value) => setResult(id, side, value)} />
            ))}
          </Container>
        </>
      ) : null}

      {view === "table" ? (
        <>
          <TopBar left={<BackButton onClick={() => setView("home")} />} center={<strong>Tabla general</strong>} right={<div />} />
          <Container>
            <div style={{ marginTop: 24 }}>
              <SummaryTable totals={totals} users={users} bets={bets} onOpenUser={goToUser} />
            </div>
          </Container>
        </>
      ) : null}

      {view === "pot" ? (
        <>
          <TopBar left={<BackButton onClick={() => setView("home")} />} center={<strong>Bote</strong>} right={<div />} />
          <Container>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18, marginTop: 24 }}>
              <Card style={{ padding: 22 }}>
                <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 16 }}>Configuración</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 12 }}>
                  <div>
                    <div style={{ color: "#9fb0c8", marginBottom: 6 }}>Cuota por persona</div>
                    <TextInput type="number" min="0" value={pot.amount} onChange={(event) => setStore((current) => ({ ...current, pot: { ...current.pot, amount: Number(event.target.value) || 0 } }))} />
                  </div>
                  <div>
                    <div style={{ color: "#9fb0c8", marginBottom: 6 }}>Moneda</div>
                    <select value={pot.currency} onChange={(event) => setStore((current) => ({ ...current, pot: { ...current.pot, currency: event.target.value } }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#f8fafc" }}>
                      {["MXN", "USD", "EUR", "COP", "ARS"].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                    </select>
                  </div>
                </div>
              </Card>
              <Card style={{ padding: 22, display: "grid", placeItems: "center", textAlign: "center" }}>
                <div>
                  <div style={{ color: "#facc15", fontWeight: 700, letterSpacing: 1 }}>BOTE TOTAL</div>
                  <div style={{ fontSize: 54, fontWeight: 900, marginTop: 8 }}>{Number(totalPot).toLocaleString()}</div>
                  <div style={{ color: "#9fb0c8", marginTop: 8 }}>{pot.currency} · {Object.keys(users).length} participante(s)</div>
                </div>
              </Card>
            </div>
          </Container>
        </>
      ) : null}
    </Shell>
  );
}



