import { useState } from "react";

const NAV_ITEMS = [
  { id: "inicio", icon: "🏠", label: "Inicio" },
  { id: "nutricion", icon: "🍎", label: "Nutrición" },
  { id: "add", icon: "+", label: "", isCenter: true },
  { id: "ejercicios", icon: "🏋️", label: "Ejercicios" },
  { id: "progreso", icon: "📈", label: "Progreso" },
];

const MEALS = [
  {
    id: 1,
    name: "Avena con frutas",
    time: "7:30 AM",
    kcal: 380,
    p: 12,
    c: 65,
    g: 8,
    emoji: "🥣",
  },
  {
    id: 2,
    name: "Arroz con Carne y Verduras (Est.)",
    time: "12:45 PM",
    kcal: 720,
    p: 35,
    c: 95,
    g: 18,
    emoji: "🍽️",
    fromPhoto: true,
  },
  {
    id: 3,
    name: "Batido de proteína",
    time: "4:00 PM",
    kcal: 210,
    p: 28,
    c: 18,
    g: 3,
    emoji: "🥤",
  },
];

const WORKOUTS = [
  { day: "Lun", name: "Pecho / Tríceps", done: true },
  { day: "Mar", name: "Espalda / Bíceps", done: true },
  { day: "Mié", name: "Piernas", done: true },
  { day: "Jue", name: "Hombros / Brazos", done: true },
  { day: "Vie", name: "Cardio + Core", done: false },
  { day: "Sáb", name: "Full Body", done: false },
  { day: "Dom", name: "Descanso", done: false },
];

const PROGRESS_DATA = [
  { week: "S1", weight: 85 },
  { week: "S2", weight: 84.2 },
  { week: "S3", weight: 83.5 },
  { week: "S4", weight: 82.8 },
  { week: "S5", weight: 82.1 },
  { week: "S6", weight: 81.4 },
];

function CircularProgress({ value, max, size = 160, stroke = 12, color = "#3b82f6", label, sublabel }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const dash = pct * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center"
      }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>{label}</span>
        <span style={{ fontSize: 11, color: "#64748b", marginTop: 4, lineHeight: 1.3 }}>{sublabel}</span>
      </div>
    </div>
  );
}

function MacroBar({ label, pct, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color: "#1e293b", fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function StatWidget({ icon, title, value, max, unit, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{
      background: "white", borderRadius: 16, padding: "14px 16px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 10
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{title}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
          {typeof value === "number" ? value.toLocaleString() : value}
          <span style={{ color: "#94a3b8", fontWeight: 500 }}> / {typeof max === "number" ? max.toLocaleString() : max} {unit}</span>
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          borderRadius: 99, transition: "width 1s ease"
        }} />
      </div>
    </div>
  );
}

function MealCard({ meal, onDelete }) {
  return (
    <div style={{
      background: "white", borderRadius: 16, padding: "14px 16px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 10,
      display: "flex", alignItems: "center", gap: 12
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: meal.fromPhoto ? "linear-gradient(135deg,#3b82f6,#06b6d4)" : "#f1f5f9",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0, position: "relative"
      }}>
        {meal.emoji}
        {meal.fromPhoto && (
          <div style={{
            position: "absolute", top: -4, right: -4, width: 16, height: 16,
            background: "#10b981", borderRadius: 99, fontSize: 8,
            display: "flex", alignItems: "center", justifyContent: "center", color: "white"
          }}>📷</div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {meal.name}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#64748b" }}>{meal.time}</span>
          <span style={{ fontSize: 11, background: "#eff6ff", color: "#3b82f6", borderRadius: 6, padding: "1px 6px", fontWeight: 700 }}>
            {meal.kcal} kcal
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>{meal.p}g P</span>
          <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600 }}>{meal.c}g C</span>
          <span style={{ fontSize: 10, color: "#8b5cf6", fontWeight: 600 }}>{meal.g}g G</span>
        </div>
      </div>
      <button onClick={() => onDelete(meal.id)} style={{
        background: "none", border: "none", fontSize: 16, cursor: "pointer",
        color: "#cbd5e1", padding: 4
      }}>✕</button>
    </div>
  );
}

function PhotoAnalysisModal({ onClose, onAdd }) {
  const [stage, setStage] = useState("capture"); // capture | analyzing | result
  const [progress, setProgress] = useState(0);

  const handleAnalyze = () => {
    setStage("analyzing");
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => setStage("result"), 400); }
      setProgress(Math.min(p, 100));
    }, 200);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", zIndex: 100,
      display: "flex", alignItems: "flex-end", justifyContent: "center"
    }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: "24px 24px 0 0", padding: 24,
        width: "100%", maxWidth: 430, paddingBottom: 40
      }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 99, margin: "0 auto 20px" }} />

        {stage === "capture" && (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>📷 Analizar Foto</h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Toma una foto de tu plato y la IA estimará calorías y macros automáticamente.</p>
            <div style={{
              height: 180, background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
              borderRadius: 16, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20,
              border: "2px dashed #93c5fd"
            }}>
              <span style={{ fontSize: 48 }}>🍽️</span>
              <span style={{ fontSize: 13, color: "#3b82f6", fontWeight: 600 }}>Vista previa de cámara</span>
            </div>
            <button onClick={handleAnalyze} style={{
              width: "100%", padding: "15px", borderRadius: 14, border: "none",
              background: "linear-gradient(135deg,#3b82f6,#06b6d4)", color: "white",
              fontSize: 15, fontWeight: 700, cursor: "pointer"
            }}>Analizar con IA ✨</button>
          </>
        )}

        {stage === "analyzing" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>Analizando tu plato...</h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Identificando alimentos y calculando nutrientes</p>
            <div style={{ height: 8, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                width: `${progress}%`, height: "100%",
                background: "linear-gradient(90deg,#3b82f6,#10b981)",
                borderRadius: 99, transition: "width 0.3s"
              }} />
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>{Math.round(progress)}%</p>
          </div>
        )}

        {stage === "result" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                background: "linear-gradient(135deg,#3b82f6,#06b6d4)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28
              }}>🍽️</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>Arroz con Carne y Verduras</div>
                <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>✓ Análisis completado (Est.)</div>
              </div>
            </div>
            <div style={{
              background: "linear-gradient(135deg,#eff6ff,#f0fdf4)", borderRadius: 14,
              padding: 16, marginBottom: 16
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#3b82f6", textAlign: "center" }}>720 kcal</div>
              <div style={{ display: "flex", justifyContent: "space-around", marginTop: 12 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444" }}>35g</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Proteínas</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>95g</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Carbos</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#8b5cf6" }}>18g</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Grasas</div>
                </div>
              </div>
            </div>
            <button onClick={() => { onAdd(); onClose(); }} style={{
              width: "100%", padding: "15px", borderRadius: 14, border: "none",
              background: "linear-gradient(135deg,#10b981,#059669)", color: "white",
              fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 8
            }}>✓ Agregar al registro</button>
            <button onClick={onClose} style={{
              width: "100%", padding: "13px", borderRadius: 14,
              border: "2px solid #e2e8f0", background: "white",
              fontSize: 14, fontWeight: 600, color: "#64748b", cursor: "pointer"
            }}>Cancelar</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SCREENS ────────────────────────────────────────────────────────────────

function InicioScreen({ meals, setMeals }) {
  const [showModal, setShowModal] = useState(false);
  const totalKcal = meals.reduce((a, m) => a + m.kcal, 0);
  const totalP = meals.reduce((a, m) => a + m.p, 0);
  const totalC = meals.reduce((a, m) => a + m.c, 0);
  const totalG = meals.reduce((a, m) => a + m.g, 0);
  const totalMacro = totalP + totalC + totalG || 1;

  const handleDelete = (id) => setMeals(prev => prev.filter(m => m.id !== id));
  const handleAddPhoto = () => setMeals(prev => [...prev, {
    id: Date.now(), name: "Arroz con Carne y Verduras (Est.)", time: "Ahora",
    kcal: 720, p: 35, c: 95, g: 18, emoji: "🍽️", fromPhoto: true
  }]);

  return (
    <div style={{ paddingBottom: 20 }}>
      {showModal && <PhotoAnalysisModal onClose={() => setShowModal(false)} onAdd={handleAddPhoto} />}

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)",
        borderRadius: "0 0 28px 28px", padding: "50px 20px 28px", marginBottom: 20
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 900, color: "white"
              }}>C🏋️</div>
              <span style={{ fontSize: 16, fontWeight: 800, color: "white" }}>Meta 10kg</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, color: "white" }}>¡Hola, Nelson! 👋</span>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>Hoy es un gran día para avanzar</div>
          </div>
          <div style={{
            width: 48, height: 48, borderRadius: 99,
            background: "linear-gradient(135deg,#f59e0b,#ef4444)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, border: "3px solid rgba(255,255,255,0.4)"
          }}>🧑‍💻</div>
        </div>

        {/* Circular + macros */}
        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: 16 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600, marginBottom: 12, textAlign: "center" }}>
            📊 Diario Calórico
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <CircularProgress
              value={totalKcal} max={2100} size={120} stroke={10}
              color="#10b981"
              label={`${totalKcal}`}
              sublabel={`/ 2,100\nkcal`}
            />
            <div style={{ flex: 1 }}>
              <MacroBar label="🟠 Carbohidratos" pct={Math.round((totalC / totalMacro) * 100)} color="#f59e0b" />
              <MacroBar label="🔴 Proteínas" pct={Math.round((totalP / totalMacro) * 100)} color="#ef4444" />
              <MacroBar label="🟣 Grasas" pct={Math.round((totalG / totalMacro) * 100)} color="#8b5cf6" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Widgets */}
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 10 }}>Indicadores del día</div>
        <StatWidget icon="👟" title="Pasos" value={8750} max={10000} color="#3b82f6" />
        <div style={{
          background: "white", borderRadius: 16, padding: "14px 16px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>💪</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Entrenamiento</div>
              <div style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>✓ Hombros / Brazos</div>
            </div>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✅</div>
        </div>
        <StatWidget icon="💧" title="Agua" value="2.1L" max="3L" unit="" color="#06b6d4" />

        {/* Meals */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>Registro de Comidas</div>
          <button onClick={() => setShowModal(true)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
            background: "linear-gradient(135deg,#3b82f6,#06b6d4)", border: "none",
            borderRadius: 10, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer"
          }}>📷 Analizar Foto</button>
        </div>
        {meals.map(m => <MealCard key={m.id} meal={m} onDelete={handleDelete} />)}
      </div>
    </div>
  );
}

function NutricionScreen({ meals }) {
  const totalKcal = meals.reduce((a, m) => a + m.kcal, 0);
  const totalP = meals.reduce((a, m) => a + m.p, 0);
  const totalC = meals.reduce((a, m) => a + m.c, 0);
  const totalG = meals.reduce((a, m) => a + m.g, 0);

  const days = ["L", "M", "X", "J", "V", "S", "D"];
  const dayKcals = [1920, 2050, 1780, totalKcal, 0, 0, 0];

  return (
    <div style={{ padding: "60px 16px 16px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", marginBottom: 4 }}>🍎 Nutrición</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Semana actual • Meta: 2,100 kcal/día</p>

      <div style={{
        background: "linear-gradient(135deg,#eff6ff,#f0fdf4)",
        borderRadius: 20, padding: 16, marginBottom: 16
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 12 }}>Resumen semanal</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
          {days.map((d, i) => (
            <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: "100%", borderRadius: 6,
                height: dayKcals[i] > 0 ? `${(dayKcals[i] / 2100) * 64}px` : "4px",
                background: i === 3
                  ? "linear-gradient(180deg,#3b82f6,#06b6d4)"
                  : dayKcals[i] > 0 ? "#bfdbfe" : "#e2e8f0",
                transition: "height 1s ease"
              }} />
              <span style={{ fontSize: 10, color: i === 3 ? "#3b82f6" : "#94a3b8", fontWeight: i === 3 ? 800 : 500 }}>{d}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Calorías hoy", value: `${totalKcal}`, unit: "kcal", color: "#3b82f6", icon: "🔥" },
          { label: "Proteínas", value: `${totalP}g`, unit: "/ 160g", color: "#ef4444", icon: "💪" },
          { label: "Carbohidratos", value: `${totalC}g`, unit: "/ 240g", color: "#f59e0b", icon: "🌾" },
          { label: "Grasas", value: `${totalG}g`, unit: "/ 58g", color: "#8b5cf6", icon: "🥑" },
        ].map(s => (
          <div key={s.label} style={{
            background: "white", borderRadius: 16, padding: 14,
            boxShadow: "0 2px 12px rgba(0,0,0,0.07)"
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.unit}</div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Comidas de hoy</div>
        {meals.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: 13, color: "#475569" }}>{m.emoji} {m.name.split(" (")[0]}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6" }}>{m.kcal} kcal</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EjerciciosScreen() {
  const exercises = [
    { name: "Press Militar", sets: "4x12", kg: "40kg", muscles: "Hombros", done: true },
    { name: "Elevaciones laterales", sets: "3x15", kg: "10kg", muscles: "Deltoides", done: true },
    { name: "Curl de bíceps", sets: "4x10", kg: "30kg", muscles: "Bíceps", done: true },
    { name: "Tríceps polea", sets: "3x12", kg: "25kg", muscles: "Tríceps", done: false },
    { name: "Encogimientos", sets: "3x12", kg: "50kg", muscles: "Trapecio", done: false },
  ];
  return (
    <div style={{ padding: "60px 16px 16px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", marginBottom: 4 }}>🏋️ Ejercicios</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>Hoy: Hombros / Brazos</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {WORKOUTS.map(w => (
          <div key={w.day} style={{
            flexShrink: 0, padding: "8px 12px", borderRadius: 12,
            background: w.done ? "linear-gradient(135deg,#3b82f6,#06b6d4)" : "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)", textAlign: "center"
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: w.done ? "rgba(255,255,255,0.8)" : "#94a3b8" }}>{w.day}</div>
            <div style={{ fontSize: 10, color: w.done ? "white" : "#64748b", marginTop: 2, whiteSpace: "nowrap" }}>
              {w.done ? "✓" : w.day === "Dom" ? "🛌" : "○"}
            </div>
          </div>
        ))}
      </div>

      {exercises.map((ex, i) => (
        <div key={i} style={{
          background: "white", borderRadius: 16, padding: "14px 16px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 10,
          display: "flex", alignItems: "center", gap: 12,
          opacity: ex.done ? 1 : 0.7
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: ex.done ? "linear-gradient(135deg,#10b981,#059669)" : "#f1f5f9",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0
          }}>
            {ex.done ? "✅" : "⬜"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{ex.name}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{ex.muscles}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6" }}>{ex.sets}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{ex.kg}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgresoScreen() {
  const minW = Math.min(...PROGRESS_DATA.map(d => d.weight));
  const maxW = Math.max(...PROGRESS_DATA.map(d => d.weight));
  const range = maxW - minW || 1;
  const chartH = 100;

  return (
    <div style={{ padding: "60px 16px 16px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", marginBottom: 4 }}>📈 Progreso</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Vas muy bien, Nelson 💪</p>

      <div style={{
        background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)",
        borderRadius: 20, padding: 20, marginBottom: 16, color: "white"
      }}>
        <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Peso inicial</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>85 kg</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Actual</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>81.4 kg</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Meta</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>75 kg</div>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, height: 8, overflow: "hidden" }}>
          <div style={{
            width: "36%", height: "100%",
            background: "linear-gradient(90deg,#10b981,#34d399)",
            borderRadius: 10
          }} />
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 6, textAlign: "center" }}>
          3.6 kg perdidos · 6.4 kg restantes · 36% completado
        </div>
      </div>

      {/* Mini line chart */}
      <div style={{ background: "white", borderRadius: 20, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Evolución del peso</div>
        <svg width="100%" height={chartH + 20} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          {PROGRESS_DATA.map((d, i) => {
            const x = (i / (PROGRESS_DATA.length - 1)) * 90 + 5;
            const y = chartH - ((d.weight - minW) / range) * (chartH - 20) - 10;
            const next = PROGRESS_DATA[i + 1];
            const nx = next ? ((i + 1) / (PROGRESS_DATA.length - 1)) * 90 + 5 : null;
            const ny = next ? chartH - ((next.weight - minW) / range) * (chartH - 20) - 10 : null;
            return (
              <g key={i}>
                {next && (
                  <line x1={`${x}%`} y1={y} x2={`${nx}%`} y2={ny}
                    stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                )}
                <circle cx={`${x}%`} cy={y} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />
                <text x={`${x}%`} y={y - 10} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">
                  {d.weight}
                </text>
                <text x={`${x}%`} y={chartH + 15} textAnchor="middle" fontSize="9" fill="#94a3b8">
                  {d.week}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "Semanas activo", value: "6", icon: "📅", color: "#3b82f6" },
          { label: "Promedio semanal", value: "-0.6 kg", icon: "📉", color: "#10b981" },
          { label: "Entrenamientos", value: "22", icon: "🏋️", color: "#f59e0b" },
          { label: "Fotos analizadas", value: "47", icon: "📷", color: "#8b5cf6" },
        ].map(s => (
          <div key={s.label} style={{
            background: "white", borderRadius: 16, padding: 14,
            boxShadow: "0 2px 12px rgba(0,0,0,0.07)", textAlign: "center"
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState("inicio");
  const [meals, setMeals] = useState(MEALS);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div style={{
      fontFamily: "'Outfit', 'Nunito', sans-serif",
      maxWidth: 430, margin: "0 auto", background: "#f8fafc",
      minHeight: "100vh", position: "relative", overflow: "hidden"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Scrollable content */}
      <div style={{ overflowY: "auto", height: "100vh", paddingBottom: 90 }}>
        {activeTab === "inicio" && <InicioScreen meals={meals} setMeals={setMeals} />}
        {activeTab === "nutricion" && <NutricionScreen meals={meals} />}
        {activeTab === "ejercicios" && <EjerciciosScreen />}
        {activeTab === "progreso" && <ProgresoScreen />}
        {activeTab === "add" && (
          <div style={{ padding: "80px 16px 16px", textAlign: "center" }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", marginBottom: 20 }}>➕ Agregar</h2>
            {[
              { icon: "🍽️", label: "Registrar comida", color: "#3b82f6" },
              { icon: "📷", label: "Analizar foto", color: "#06b6d4" },
              { icon: "💧", label: "Registrar agua", color: "#0ea5e9" },
              { icon: "💪", label: "Registrar ejercicio", color: "#10b981" },
              { icon: "⚖️", label: "Actualizar peso", color: "#f59e0b" },
            ].map(opt => (
              <button key={opt.label} style={{
                display: "flex", alignItems: "center", gap: 14,
                width: "100%", padding: "16px 20px", marginBottom: 12,
                background: "white", border: "none", borderRadius: 16,
                boxShadow: "0 2px 12px rgba(0,0,0,0.07)", cursor: "pointer",
                fontSize: 15, fontWeight: 700, color: "#1e293b"
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, fontSize: 22,
                  background: opt.color + "20", display: "flex",
                  alignItems: "center", justifyContent: "center"
                }}>{opt.icon}</div>
                {opt.label}
                <span style={{ marginLeft: "auto", color: "#cbd5e1" }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430,
        background: "white", borderTop: "1px solid #f1f5f9",
        display: "flex", alignItems: "center", padding: "8px 0 20px",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.08)", zIndex: 50
      }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", gap: 4, border: "none", background: "none",
            cursor: "pointer", padding: "4px 0"
          }}>
            {item.isCenter ? (
              <div style={{
                width: 52, height: 52, borderRadius: 16, marginTop: -16,
                background: "linear-gradient(135deg,#3b82f6,#06b6d4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 300, color: "white",
                boxShadow: "0 4px 16px rgba(59,130,246,0.5)"
              }}>+</div>
            ) : (
              <>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: activeTab === item.id ? "#3b82f6" : "#94a3b8"
                }}>{item.label}</span>
                {activeTab === item.id && (
                  <div style={{ width: 4, height: 4, borderRadius: 99, background: "#3b82f6" }} />
                )}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}