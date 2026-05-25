import { useState, useRef, useEffect } from "react";

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
  if (!GEMINI_API_KEY) {
    throw new Error("Falta configurar la API Key de Gemini.");
  }
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
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
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
  const finalPct = isNaN(pct) ? 0 : pct;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyBetween: "space-between", marginBottom: 3 }} className="justify-between">
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color: "white", fontWeight: 700 }}>{finalPct}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.2)" }}>
        <div style={{ width: `${finalPct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1s ease" }} />
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
          {value}<span style={{ color: "#94a3b8", fontWeight: 500 }}> / {max} {unit || ""}</span>
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
    const time = now.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
    onAdd({
      id: Date.now(),
      name: result.nombre,
      time,
      kcal: parseInt(result.calorias) || 0,
      p: parseInt(result.proteinas) || 0,
      c: parseInt(result.carbohidratos) || 0,
      g: parseInt(result.grasas) || 0,
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
            <div style={{ fontSize: 32, marginBottom: 12 }} className="animate-bounce">🤖</div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>Analizando con IA...</h3>
            <p style={{ fontSize: 13, color: "#64748b" }}>Identificando alimentos y calculando nutrientes</p>
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

function InicioScreen({ meals, setMeals, openScanner }) {
  const totalKcal = meals.reduce((a, m) => a + m.kcal, 0);
  const totalP = meals.reduce((a, m) => a + m.p, 0);
  const totalC = meals.reduce((a, m) => a + m.c, 0);
  const totalG = meals.reduce((a, m) => a + m.g, 0);
  const totalMacro = totalP + totalC + totalG || 1;

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)", borderRadius: "0 0 28px 28px", padding: "50px 20px 28px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "white" }}>🏋️</div>
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
        <StatWidget icon="👟" title="Pasos" value={8750} max={10000} color="#3b82f6" unit="pasos" />
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 4 }} className="justify-between">
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>Registro de Comidas</div>
          <button onClick={openScanner} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "linear-gradient(135deg,#3b82f6,#06b6d4)", border: "none", borderRadius: 10, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
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
  const dayKcals = [1950, 2050, 1800, totalKcal, 0, 0, 0]; // Datos de ejemplo semanales con el día real integrado

  return (
    <div style={{ padding: "50px 16px 80px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>🍎 Resumen de Nutrición</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Análisis profundo de tus macronutrientes acumulados.</p>

      {/* Gráfico de barras simple para calorías semanales */}
      <div style={{ background: "white", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 20 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 12 }}>Calorías esta semana</h4>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: 100, padding: "0 10px" }}>
          {dayKcals.map((kcal, i) => {
            const heightPct = Math.min((kcal / 2500) * 100, 100);
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <div style={{ width: 14, height: `${heightPct || 4}%`, background: kcal > 2100 ? '#ef4444' : '#10b981', borderRadius: 99, transition: 'height 0.5s ease' }} />
                <span style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, fontWeight: 600 }}>{days[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: "#1e293b", borderRadius: 20, padding: 20, color: "white" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>Desglose de Macros Totales</h3>
        <div style={{ spaceY: 12 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }} className="justify-between">
              <span>🔴 Proteínas totales</span>
              <span style={{ fontWeight: 700 }}>{totalP}g</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 99 }}><div style={{ width: `${Math.min((totalP/150)*100, 100)}%`, height: "100%", background: "#ef4444", borderRadius: 99 }} /></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }} className="justify-between">
              <span>🟠 Carbohidratos totales</span>
              <span style={{ fontWeight: 700 }}>{totalC}g</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 99 }}><div style={{ width: `${Math.min((totalC/220)*100, 100)}%`, height: "100%", background: "#f59e0b", borderRadius: 99 }} /></div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }} className="justify-between">
              <span>🟣 Grasas totales</span>
              <span style={{ fontWeight: 700 }}>{totalG}g</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 99 }}><div style={{ width: `${Math.min((totalG/70)*100, 100)}%`, height: "100%", background: "#8b5cf6", borderRadius: 99 }} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EjerciciosScreen() {
  return (
    <div style={{ padding: "50px 16px 80px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>🏋️ Control de Rutinas</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Racha actual de entrenamientos completados.</p>

      <div style={{ background: "white", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 20 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 12 }}>Calendario Semanal</h4>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {WORKOUTS.map((w, i) => (
            <div key={i} style={{ textAlign: "center", flex: 1 }}>
              <div style={{ width: 32, height: 32, borderRadius: 99, background: w.done ? "#dcfce7" : "#f1f5f9", color: w.done ? "#10b981" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, margin: "0 auto 6px" }}>
                {w.done ? "✓" : "•"}
              </div>
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{w.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Rutina Sugerida para Mañana</h4>
        <div style={{ borderLeft: "4px solid #3b82f6", paddingLeft: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Cardio HIIT + Abdomen</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>Duración estimada: 45 minutos</div>
        </div>
      </div>
    </div>
  );
}

function ProgresoScreen() {
  const currentWeight = PROGRESS_DATA[PROGRESS_DATA.length - 1].weight;
  const initialWeight = PROGRESS_DATA[0].weight;
  const lostWeight = Math.abs(initialWeight - currentWeight).toFixed(1);

  return (
    <div style={{ padding: "50px 16px 80px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>📈 Tu Evolución</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Camino hacia tu meta de pérdida de peso.</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, background: "white", padding: 16, borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block" }}>Peso Actual</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#1e293b" }}>{currentWeight} kg</span>
        </div>
        <div style={{ flex: 1, background: "white", padding: 16, borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block" }}>Total Bajado</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#10b981" }}>- {lostWeight} kg</span>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 12 }}>Historial de semanas</h4>
        <div style={{ spaceY: 8 }}>
          {PROGRESS_DATA.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i === PROGRESS_DATA.length - 1 ? "none" : "1px solid #f1f5f9" }} className="justify-between">
              <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Semana {p.week.replace("S", "")}</span>
              <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 700 }}>{p.weight} kg</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP COMPONENT ──────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("inicio");
  const [showModal, setShowModal] = useState(false);
  const [meals, setMeals] = useState(() => {
    const saved = localStorage.getItem("meta10kg_meals");
    return saved ? JSON.parse(saved) : [];
  });

  // Persistencia automática local
  useEffect(() => {
    localStorage.setItem("meta10kg_meals", JSON.stringify(meals));
  }, [meals]);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", width: "100%", maxWidth: 430, margin: "0 auto", position: "relative", boxShadow: "0 0 24px rgba(0,0,0,0.05)" }}>
      {/* Ventana de Análisis con IA */}
      {showModal && <PhotoAnalysisModal onClose={() => setShowModal(false)} onAdd={(newMeal) => setMeals(prev => [...prev, newMeal])} />}

      {/* Renderizado Condicional de las Pantallas */}
      {activeTab === "inicio" && <InicioScreen meals={meals} setMeals={setMeals} openScanner={() => setShowModal(true)} />}
      {activeTab === "nutricion" && <NutricionScreen meals={meals} />}
      {activeTab === "ejercicios" && <EjerciciosScreen />}
      {activeTab === "progreso" && <ProgresoScreen />}

      {/* ─── BOTTOM NAVBAR (Fija en el celular) ──────────────────────────────── */}
      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, height: 68, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "space-around", borderTop: "1px solid #e2e8f0", zIndex: 90, paddingBottom: 10 }}>
        {NAV_ITEMS.map((item) => {
          if (item.isCenter) {
            return (
              <button key={item.id} onClick={() => setShowModal(true)} style={{ width: 48, height: 48, borderRadius: 99, background: "linear-gradient(135deg,#3b82f6,#0ea5e9)", border: "none", color: "white", fontSize: 24, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: -24, boxShadow: "0 4px 14px rgba(59,130,246,0.4)" }}>
                {item.icon}
              </button>
            );
          }

          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", flex: 1, color: isActive ? "#3b82f6" : "#94a3b8" }}>
              <span style={{ fontSize: isActive ? 20 : 18, transition: "transform 0.2s" }} className={isActive ? "scale-110" : ""}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
