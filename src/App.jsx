import { useState, useRef } from "react";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const NAV_ITEMS = [
  { id: "inicio", icon: "🏠", label: "Inicio" },
  { id: "nutricion", icon: "🍎", label: "Nutrición" },
  { id: "add", icon: "+", label: "", isCenter: true },
  { id: "ejercicios", icon: "🏋️", label: "Ejercicios" },
  { id: "progreso", icon: "📈", label: "Progreso" },
];

const WORKOUTS = [
  { day: "Lun", done: true },
  { day: "Mar", done: true },
  { day: "Mié", done: true },
  { day: "Jue", done: true },
  { day: "Vie", done: false },
  { day: "Sáb", done: false },
  { day: "Dom", done: false },
];

const PROGRESS_DATA = [
  { week: "S1", weight: 85 },
  { week: "S2", weight: 84.2 },
  { week: "S3", weight: 83.5 },
  { week: "S4", weight: 82.8 },
  { week: "S5", weight: 82.1 },
  { week: "S6", weight: 81.4 },
];

// ─── GEMINI ANALYSIS ────────────────────────────────────────────────────────
async function analyzeImageWithGemini(base64Image, mimeType) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image,
              },
            },
            {
              text: `Analiza esta foto de comida y responde SOLO en este formato JSON exacto, sin texto adicional:
{
  "nombre": "nombre del plato en español",
  "calorias": número estimado de calorías,
  "proteinas": gramos de proteína,
  "carbohidratos": gramos de carbohidratos,
  "grasas": gramos de grasas,
  "emoji": emoji representativo del plato
}
Si no hay comida en la imagen, responde: {"error": "No se detectó comida en la imagen"}`
            }
          ]
        }],
        generationConfig: { temperature: 0.1 }
      }),
    }
  );
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

function CircularProgress({ value, max, size = 120, stroke = 10, color = "#3b82f6", label, sublabel }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(value / max, 1) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: "white", lineHeight: 1 }}>{label}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>{sublabel}</span>
      </div>
    </div>
  );
}

function MacroBar({ label, pct, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color: "white", fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.2)" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function StatWidget({ icon, title, value, max, unit, color }) {
  const pct = Math.min((parseFloat(value) / parseFloat(max)) * 100, 100);
  return (
    <div style={{ background: "white", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{title}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
          {value}<span style={{ color: "#94a3b8", fontWeight: 500 }}> / {max} {unit}</span>
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: "#f1f5f9" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${color}99,${color})`, borderRadius: 99, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function MealCard({ meal, onDelete }) {
  return (
    <div style={{ background: "white", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", flexShrink: 0, position: "relative" }}>
        {meal.imageUrl ? (
          <img src={meal.imageUrl} alt={meal.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
            {meal.emoji}
          </div>
        )}
        {meal.fromPhoto && (
          <div style={{ position: "absolute", top: -3, right: -3, width: 16, height: 16, background: "#10b981", borderRadius: 99, fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>📷</div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meal.name}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#64748b" }}>{meal.time}</span>
          <span style={{ fontSize: 11, background: "#eff6ff", color: "#3b82f6", borderRadius: 6, padding: "1px 6px", fontWeight: 700 }}>{meal.kcal} kcal</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>{meal.p}g P</span>
          <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600 }}>{meal.c}g C</span>
          <span style={{ fontSize: 10, color: "#8b5cf6", fontWeight: 600 }}>{meal.g}g G</span>
        </div>
      </div>
      <button onClick={() => onDelete(meal.id)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#cbd5e1", padding: 4 }}>✕</button>
    </div>
  );
}

// ─── PHOTO MODAL ─────────────────────────────────────────────────────────────
function PhotoAnalysisModal({ onClose, onAdd }) {
  const [stage, setStage] = useState("select"); // select | analyzing | result | error
  const [result, setResult] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const cameraRef = useRef();
  const galleryRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setStage("analyzing");

    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const data = await analyzeImageWithGemini(base64, file.type);

      if (data.error) {
        setErrorMsg(data.error);
        setStage("error");
      } else {
        setResult(data);
        setStage("result");
      }
    } catch (e) {
      setErrorMsg("Error al analizar la imagen. Intenta de nuevo.");
      setStage("error");
    }
  };

  const handleAdd = () => {
    const now = new Date();
    const time = now.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    onAdd({
      id: Date.now(),
      name: result.nombre,
      time,
      kcal: result.calorias,
      p: result.proteinas,
      c: result.carbohidratos,
      g: result.grasas,
      emoji: result.emoji || "🍽️",
      imageUrl,
      fromPhoto: true,
    });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 430, paddingBottom: 40 }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 99, margin: "0 auto 20px" }} />

        {/* Inputs ocultos */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
        <input ref={galleryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />

        {stage === "select" && (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>📷 Analizar Comida con IA</h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>La IA reconocerá los alimentos y calculará calorías y macros automáticamente.</p>
            <button onClick={() => cameraRef.current.click()} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#3b82f6,#06b6d4)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
              📷 Tomar Foto
            </button>
            <button onClick={() => galleryRef.current.click()} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "2px solid #e2e8f0", background: "white", color: "#1e293b", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              🖼️ Elegir de Galería
            </button>
          </>
        )}

        {stage === "analyzing" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            {imageUrl && <img src={imageUrl} alt="foto" style={{ width: 120, height: 120, borderRadius: 16, objectFit: "cover", marginBottom: 16 }} />}
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>Analizando con IA...</h3>
            <p style={{ fontSize: 13, color: "#64748b" }}>Identificando alimentos y calculando nutrientes</p>
            <div style={{ marginTop: 20, height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: "70%", height: "100%", background: "linear-gradient(90deg,#3b82f6,#10b981)", borderRadius: 99, animation: "pulse 1.5s ease infinite" }} />
            </div>
          </div>
        )}

        {stage === "result" && result && (
          <>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
              {imageUrl && <img src={imageUrl} alt="comida" style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover" }} />}
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{result.nombre}</div>
                <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>✓ Análisis completado</div>
              </div>
            </div>
            <div style={{ background: "linear-gradient(135deg,#eff6ff,#f0fdf4)", borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#3b82f6", textAlign: "center" }}>{result.calorias} kcal</div>
              <div style={{ display: "flex", justifyContent: "space-around", marginTop: 12 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444" }}>{result.proteinas}g</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Proteínas</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>{result.carbohidratos}g</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Carbos</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#8b5cf6" }}>{result.grasas}g</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Grasas</div>
                </div>
              </div>
            </div>
            <button onClick={handleAdd} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>
              ✓ Agregar al registro
            </button>
            <button onClick={() => setStage("select")} style={{ width: "100%", padding: "13px", borderRadius: 14, border: "2px solid #e2e8f0", background: "white", fontSize: 14, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>
              Tomar otra foto
            </button>
          </>
        )}

        {stage === "error" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>No se pudo analizar</h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>{errorMsg}</p>
            <button onClick={() => setStage("select")} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#3b82f6,#06b6d4)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SCREENS ─────────────────────────────────────────────────────────────────

function InicioScreen({ meals, setMeals }) {
  const [showModal, setShowModal] = useState(false);
  const totalKcal = meals.reduce((a, m) => a + m.kcal, 0);
  const totalP = meals.reduce((a, m) => a + m.p, 0);
  const totalC = meals.reduce((a, m) => a + m.c, 0);
  const totalG = meals.reduce((a, m) => a + m.g, 0);
  const totalMacro = totalP + totalC + totalG || 1;

  return (
    <div style={{ paddingBottom: 20 }}>
      {showModal && <PhotoAnalysisModal onClose={() => setShowModal(false)} onAdd={(meal) => setMeals(prev => [...prev, meal])} />}

      <div style={{ background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)", borderRadius: "0 0 28px 28px", padding: "50px 20px 28px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "white" }}>C🏋️</div>
              <span style={{ fontSize: 16, fontWeight: 800, color: "white" }}>Meta 10kg</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, color: "white" }}>¡Hola, Nelson! 👋</span>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>Hoy es un gran día para avanzar</div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 99, background: "linear-gradient(135deg,#f59e0b,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: "3px solid rgba(255,255,255,0.4)" }}>🧑‍💻</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: 16 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600, marginBottom: 12, textAlign: "center" }}>📊 Diario Calórico</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <CircularProgress value={totalKcal} max={2100} size={120} stroke={10} color="#10b981"
              label={totalKcal} sublabel={`/ 2,100 kcal`} />
            <div style={{ flex: 1 }}>
              <MacroBar label="🟠 Carbohidratos" pct={Math.round((totalC / totalMacro) * 100)} color="#f59e0b" />
              <MacroBar label="🔴 Proteínas" pct={Math.round((totalP / totalMacro) * 100)} color="#ef4444" />
              <MacroBar label="🟣 Grasas" pct={Math.round((totalG / totalMacro) * 100)} color="#8b5cf6" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 10 }}>Indicadores del día</div>
        <StatWidget icon="👟" title="Pasos" value={8750} max={10000} color="#3b82f6" />
        <div style={{ background: "white", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>💪</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Entrenamiento</div>
              <div style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>✓ Hombros / Brazos</div>
            </div>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✅</div>
        </div>
        <StatWidget icon="💧" title="Agua" value="2.1" max="3" unit="L" color="#06b6d4" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>Registro de Comidas</div>
          <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "linear-gradient(135deg,#3b82f6,#06b6d4)", border: "none", borderRadius: 10, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            📷 Analizar Foto
          </button>
        </div>

        {meals.length === 0 && (
          <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🍽️</div>
            <div style={{ fontSize: 13 }}>Aún no has registrado comidas hoy</div>
          </div>
        )}
        {meals.map(m => <MealCard key={m.id} meal={m} onDelete={(id) => setMeals(prev => prev.filter(x => x.id !== id))} />)}
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
      <div style={{ background: "linear-gradient(135deg,#eff6ff,#f0fdf4)", borderRadius: 20, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 12 }}>Resumen semanal</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
          {days.map((d, i) => (
            <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", borderRadius: 6, height: dayKcals[i] > 0 ? `${(dayKcals[i] / 2100) * 64}px` : "4px", background: i === 3 ? "linear-gradient(180deg,#3b82f6,#06b6d4)" : dayKcals[i] > 0 ? "#bfdbfe" : "#e2e8f0", transition: "height 1s ease" }} />
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
          <div key={s.label} style={{ background: "white", borderRadius: 16, padding: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.unit}</div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
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
          <div key={w.day} style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 12, background: w.done ? "linear-gradient(135deg,#3b82f6,#06b6d4)" : "white", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: w.done ? "rgba(255,255,255,0.8)" : "#94a3b8" }}>{w.day}</div>
            <div style={{ fontSize: 10, color: w.done ? "white" : "#64748b", marginTop: 2 }}>{w.done ? "✓" : "○"}</div>
          </div>
        ))}
      </div>
      {exercises.map((ex, i) => (
        <div key={i} style={{ background: "white", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, opacity: ex.done ? 1 : 0.7 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: ex.done ? "linear-gradient(135deg,#10b981,#059669)" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
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
      <div style={{ background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)", borderRadius: 20, padding: 20, marginBottom: 16, color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16 }}>
          {[["Peso inicial","85 kg"],["Actual","81.4 kg"],["Meta","75 kg"]].map(([l,v]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{l}</div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, height: 8, overflow: "hidden" }}>
          <div style={{ width: "36%", height: "100%", background: "linear-gradient(90deg,#10b981,#34d399)", borderRadius: 10 }} />
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 6, textAlign: "center" }}>3.6 kg perdidos · 6.4 kg restantes · 36% completado</div>
      </div>
      <div style={{ background: "white", borderRadius: 20, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Evolución del peso</div>
        <svg width="100%" height={chartH + 20} style={{ overflow: "visible" }}>
          {PROGRESS_DATA.map((d, i) => {
            const x = (i / (PROGRESS_DATA.length - 1)) * 90 + 5;
            const y = chartH - ((d.weight - minW) / range) * (chartH - 20) - 10;
            const next = PROGRESS_DATA[i + 1];
            const nx = next ? ((i+1)/(PROGRESS_DATA.length-1))*90+5 : null;
            const ny = next ? chartH - ((next.weight - minW) / range) * (chartH - 20) - 10 : null;
            return (
              <g key={i}>
                {next && <line x1={`${x}%`} y1={y} x2={`${nx}%`} y2={ny} stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />}
                <circle cx={`${x}%`} cy={y} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />
                <text x={`${x}%`} y={y-10} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">{d.weight}</text>
                <text x={`${x}%`} y={chartH+15} textAnchor="middle" fontSize="9" fill="#94a3b8">{d.week}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function AddScreen({ setShowModal }) {
  return (
    <div style={{ padding: "80px 16px 16px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", marginBottom: 20 }}>➕ Agregar</h2>
      {[
        { icon: "📷", label: "Analizar foto con IA", color: "#3b82f6", action: () => setShowModal(true) },
        { icon: "💧", label: "Registrar agua", color: "#0ea5e9", action: () => {} },
        { icon: "💪", label: "Registrar ejercicio", color: "#10b981", action: () => {} },
        { icon: "⚖️", label: "Actualizar peso", color: "#f59e0b", action: () => {} },
      ].map(opt => (
        <button key={opt.label} onClick={opt.action} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "16px 20px", marginBottom: 12, background: "white", border: "none", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", cursor: "pointer", fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, fontSize: 22, background: opt.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>{opt.icon}</div>
          {opt.label}
          <span style={{ marginLeft: "auto", color: "#cbd5e1" }}>›</span>
        </button>
      ))}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("inicio");
  const [meals, setMeals] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const handleNavClick = (id) => {
    if (id === "add") { setShowModal(true); return; }
    setActiveTab(id);
  };

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", maxWidth: 430, margin: "0 auto", background: "#f8fafc", minHeight: "100vh", position: "relative" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { display: none; }`}</style>

      {showModal && <PhotoAnalysisModal onClose={() => setShowModal(false)} onAdd={(meal) => { setMeals(prev => [...prev, meal]); setActiveTab("inicio"); }} />}

      <div style={{ overflowY: "auto", height: "100vh", paddingBottom: 90 }}>
        {activeTab === "inicio" && <InicioScreen meals={meals} setMeals={setMeals} />}
        {activeTab === "nutricion" && <NutricionScreen meals={meals} />}
        {activeTab === "ejercicios" && <EjerciciosScreen />}
        {activeTab === "progreso" && <ProgresoScreen />}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "white", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", padding: "8px 0 20px", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)", zIndex: 50 }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => handleNavClick(item.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, border: "none", background: "none", cursor: "pointer", padding: "4px 0" }}>
            {item.isCenter ? (
              <div style={{ width: 52, height: 52, borderRadius: 16, marginTop: -16, background: "linear-gradient(135deg,#3b82f6,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "white", boxShadow: "0 4px 16px rgba(59,130,246,0.5)" }}>+</div>
            ) : (
              <>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: activeTab === item.id ? "#3b82f6" : "#94a3b8" }}>{item.label}</span>
                {activeTab === item.id && <div style={{ width: 4, height: 4, borderRadius: 99, background: "#3b82f6" }} />}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}