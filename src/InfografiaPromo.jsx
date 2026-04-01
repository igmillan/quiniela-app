import React from "react";

const COLORS = {
  bg: "#0B1220",
  card: "#0F172A",
  card2: "#1E293B",
  gold: "#FACC15",
  white: "#F8FAFC",
  green: "#22C55E",
  cyan: "#7DD3FC",
  slate: "#94A3B8",
};

const points = [
  { label: "Resultado correcto", value: 1, color: COLORS.slate },
  { label: "Marcador exacto", value: 3, color: COLORS.cyan },
  { label: "Líder de grupo", value: 5, color: COLORS.green },
  { label: "2 clasificados", value: 10, color: COLORS.green },
  { label: "Semifinalistas", value: 30, color: COLORS.gold },
  { label: "Finalistas", value: 35, color: COLORS.gold },
  { label: "Campeón", value: 50, color: COLORS.gold },
];

const steps = [
  { n: "01", title: "Descarga", body: "Recibe el Excel maestro de la quiniela." },
  { n: "02", title: "Predice", body: "Llena todos tus marcadores y llaves." },
  { n: "03", title: "Sube", body: "Carga tu archivo en segundos dentro de la app." },
  { n: "04", title: "Compite", body: "Sigue tu ranking, dashboard e insights." },
];

const pillars = [
  { icon: "📈", title: "Dashboard Pro", copy: "Analiza tu rendimiento por fase, tus bonos y tu posición." },
  { icon: "⚡", title: "Ranking en vivo", copy: "Las posiciones cambian al ritmo de los goles y resultados." },
  { icon: "🧠", title: "Insights automáticos", copy: "Detecta tu mejor fase, tus oportunidades y tus aciertos clave." },
];

function Bar({ label, value, color }) {
  const width = `${Math.max(12, value * 1.7)}%`;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
        <span style={{ color: COLORS.white }}>{label}</span>
        <strong style={{ color }}>{value} pts</strong>
      </div>
      <div style={{ height: 12, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width, height: "100%", background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

export default function InfografiaPromo() {
  const currentUrl = window.location.href;
  const appUrl = "https://quiniela-app-roan.vercel.app/";
  const waMessage = encodeURIComponent(
    `⚽ Estoy jugando en Quiniela Mundial Pro. Tiene dashboard inteligente, ranking en vivo e insights automáticos. Entra aquí: ${appUrl}`
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% 0%, rgba(250,204,21,0.12), transparent 28%), linear-gradient(180deg, #0B1220 0%, #07101c 100%)",
        color: COLORS.white,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px 80px" }}>
        <section
          style={{
            textAlign: "center",
            padding: "40px 20px 20px",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "8px 14px",
              borderRadius: 999,
              background: "rgba(250,204,21,0.08)",
              border: "1px solid rgba(250,204,21,0.22)",
              color: COLORS.gold,
              fontWeight: 800,
              letterSpacing: 0.8,
              fontSize: 12,
              marginBottom: 18,
              textTransform: "uppercase",
            }}
          >
            Plataforma Sports-Tech
          </div>

          <h1 style={{ fontSize: "clamp(40px, 8vw, 82px)", lineHeight: 1, margin: 0, fontWeight: 900 }}>
            Quiniela Mundial <span style={{ color: COLORS.gold }}>Pro</span>
          </h1>

          <p style={{ maxWidth: 760, margin: "18px auto 0", color: "#D6DEEA", fontSize: "clamp(18px, 2.2vw, 24px)" }}>
            No es una quiniela más. Es tu centro de mando para el Mundial: predice, compite y domina el ranking en tiempo real.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
            <a
              href={appUrl}
              style={{
                background: COLORS.gold,
                color: COLORS.bg,
                fontWeight: 900,
                padding: "14px 22px",
                borderRadius: 14,
                textDecoration: "none",
                boxShadow: "0 12px 28px rgba(250,204,21,0.25)",
              }}
            >
              Abrir la app
            </a>
            <a
              href={`https://wa.me/?text=${waMessage}`}
              style={{
                background: "rgba(34,197,94,0.14)",
                color: COLORS.green,
                fontWeight: 900,
                padding: "14px 22px",
                borderRadius: 14,
                textDecoration: "none",
                border: "1px solid rgba(34,197,94,0.3)",
              }}
            >
              Compartir por WhatsApp
            </a>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
            marginTop: 30,
          }}
        >
          {pillars.map((item) => (
            <div
              key={item.title}
              style={{
                padding: 22,
                borderRadius: 20,
                background: "rgba(15,23,42,0.78)",
                border: "1px solid rgba(255,255,255,0.06)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div style={{ fontSize: 34, marginBottom: 10 }}>{item.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>{item.title}</div>
              <div style={{ color: COLORS.slate, lineHeight: 1.6 }}>{item.copy}</div>
            </div>
          ))}
        </section>

        <section style={{ marginTop: 44 }}>
          <div style={{ fontWeight: 900, fontSize: 32, textAlign: "center", marginBottom: 20 }}>Flujo de participación</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {steps.map((step) => (
              <div
                key={step.n}
                style={{
                  padding: 22,
                  borderRadius: 20,
                  background: "linear-gradient(145deg, #1E293B, #0F172A)",
                  border: "1px solid rgba(250,204,21,0.10)",
                }}
              >
                <div style={{ color: COLORS.gold, fontSize: 28, fontWeight: 900 }}>{step.n}</div>
                <div style={{ fontWeight: 800, fontSize: 22, marginTop: 10 }}>{step.title}</div>
                <div style={{ color: COLORS.slate, marginTop: 6, lineHeight: 1.6 }}>{step.body}</div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            marginTop: 44,
            padding: 24,
            borderRadius: 24,
            background: "rgba(30,41,59,0.42)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 32, marginBottom: 12 }}>
                Gana quien tenga <span style={{ color: COLORS.gold }}>mejor estrategia</span>
              </div>
              <p style={{ color: COLORS.slate, lineHeight: 1.7, marginTop: 0 }}>
                Nuestro sistema premia la precisión, la lectura del torneo y la capacidad para proyectar correctamente las fases finales.
              </p>
              <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                <div style={{ padding: 14, borderRadius: 16, background: "rgba(250,204,21,0.08)", borderLeft: `3px solid ${COLORS.gold}` }}>
                  <strong style={{ color: COLORS.gold }}>50 pts</strong> por acertar al campeón.
                </div>
                <div style={{ padding: 14, borderRadius: 16, background: "rgba(34,197,94,0.08)", borderLeft: `3px solid ${COLORS.green}` }}>
                  <strong style={{ color: COLORS.green }}>3 pts</strong> por marcador exacto.
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {points.map((item) => (
                <Bar key={item.label} {...item} />
              ))}
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: 44,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 18,
          }}
        >
          <div
            style={{
              padding: 24,
              borderRadius: 22,
              background: "rgba(15,23,42,0.78)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 24, marginBottom: 14 }}>¿Qué hace diferente esta quiniela?</div>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                "Dashboard inteligente con KPIs, fase por fase y bonos.",
                "Ranking en vivo con movimientos y contexto competitivo.",
                "Insights automáticos para detectar fortalezas y oportunidades.",
                "Comparativo apuesta vs realidad dentro del torneo.",
              ].map((item) => (
                <div key={item} style={{ color: "#D6DEEA", lineHeight: 1.6 }}>• {item}</div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: 24,
              borderRadius: 22,
              background: "linear-gradient(145deg, rgba(250,204,21,0.10), rgba(34,197,94,0.08))",
              border: "1px solid rgba(250,204,21,0.18)",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 24, marginBottom: 14 }}>Call to action</div>
            <div style={{ color: "#F8FAFC", lineHeight: 1.7 }}>
              ¿Listo para organizar tu grupo, compartir la emoción del Mundial y demostrar quién sabe más de fútbol?
            </div>
            <a
              href={appUrl}
              style={{
                marginTop: 18,
                display: "inline-block",
                background: COLORS.green,
                color: COLORS.bg,
                fontWeight: 900,
                padding: "14px 20px",
                borderRadius: 14,
                textDecoration: "none",
              }}
            >
              Entrar a Quiniela Mundial Pro
            </a>
            <div style={{ marginTop: 12, color: COLORS.slate, fontSize: 13 }}>{currentUrl}</div>
          </div>
        </section>
      </div>
    </div>
  );
}