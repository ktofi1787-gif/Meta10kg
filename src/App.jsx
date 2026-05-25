import { useState, useRef, useEffect } from "react";

// ─── DATOS Y CONFIGURACIÓN ──────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "inicio", icon: "🏠", label: "Inicio" },
  { id: "nutricion", icon: "🍎", label: "Nutrición" },
  { id: "add", icon: "+", label: "", isCenter: true },
  { id: "ejercicios", icon: "🏋️", label: "Ejercicios" },
  { id: "progreso", icon: "📈", label: "Progreso" },
];

const WORKOUTS = [
  { day: "Lun", done: true }, { day: "Mar", done: true }, { day: "Mié", done: true },
  { day: "Jue", done: true }, { day: "Vie", done: false }, { day: "Sáb", done: false },
  { day: "Dom", done: false },
];

const PROGRESS_DATA = [
  { week: "S1", weight: 85 }, { week: "S2", weight: 84.2 }, { week: "S3", weight: 83.5 },
  { week: "S4", weight: 82.8 }, { week: "S5", weight: 82.1 }, { week: "S6", weight: 81.4 },
];

// ─── CONEXIÓN DIRECTA A GEMINI (BLINDADA) ──────────────────────────────────
async function analyzeImageWithGemini(base64Image, mimeType) {
  // 1. Verificamos que la variable exista en Vercel
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === "") {
    return { error: "Falta la clave VITE_GEMINI_API_KEY en Vercel." };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Image } },
              { text: `Analiza esta foto de comida y responde SOLO en este formato JSON exacto, usa números para los valores (sin la letra g), y sin texto adicional:
{
  "nombre": "nombre del plato",
  "calorias": 0,
  "proteinas": 0,
  "carbohidratos": 0,
  "grasas": 0,
  "emoji": "🍽️"
}
Si no hay comida, responde exactamente esto: {"error": "No se detectó comida en la imagen"}` }
            ]
          }],
          generationConfig: { temperature: 0.1 }
        }),
      }
    );

    // 2. Si Google rechaza la petición, capturamos el motivo real
    if (!response.ok) {
      const errorData = await response.json();
      return { error: `Error de Google (${response.status}): ${errorData.error?.message || "Desconocido"}` };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // 3. Limpiamos cualquier formato basura que devuelva la IA
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanText);

  } catch (error) {
    return { error: `Fallo en la comunicación: ${error.message}` };
  }
}

// ─── COMPONENTES VISUALES ───────────────────────────────────────────────────
function CircularProgress({ value, max, size = 120, stroke = 10, color = "#3b82f6", label, sublabel }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(value / max, 1) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: "white", lineHeight: 1 }}>{label}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>{sublabel}</span>
      </div>
    </div>
  );
}

function MacroBar({ label, pct, color }) {
  const safePct = isNaN(pct) ? 0 : pct;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color: "white", fontWeight: 700 }}>{safePct}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.2)" }}>
        <div style={{ width: `${safePct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1s ease" }} />
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
          <div style={{ width: "100%", height: "100%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{meal.emoji}</div>
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

// ─── MODAL DE CÁMARA E IA ───────────────────────────────────────────────────
function PhotoAnalysisModal({ onClose, onAdd }) {
  const [stage, setStage] = useState("select"); 
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
        setErrorMsg(data.error); // Aquí mostramos el error EXACTO
        setStage("error");
      } else {
        setResult(data);
        setStage("result");
      }
    } catch (e) {
      setErrorMsg("Fallo crítico en la app: " + e.message);
      setStage("error");
    }
  };

  const handleAdd = () => {
    const time = new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
    onAdd({
      id: Date.now(),
      name: result.nombre,
      time,
      kcal: Number(result.calorias) || 0,
      p: Number(result.proteinas) || 0,
      c: Number(result.carbohidratos) || 0,
      g: Number(result.grasas) || 0,
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
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>📷 Analizar Comida</h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>La IA reconocerá los alimentos automáticamente.</p>
            <button onClick={() => cameraRef.current.click()} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#3b82f6,#06b6d4)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>📷 Tomar Foto</button>
            <button onClick={() => galleryRef.current.click()} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "2px solid #e2e8f0", background: "white", color: "#1e293b", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>🖼️ Elegir de Galería</button>
          </>
        )}

        {stage === "analyzing" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            {imageUrl && <img src={imageUrl} alt="foto" style={{ width: 120, height: 120, borderRadius: 16, objectFit: "cover", marginBottom: 16 }} />}
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>Analizando...</h3>
            <p style={{ fontSize: 13, color: "#64748b" }}>Conectando con Google Gemini</p>
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
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444" }}>{result.proteinas}g</div><div style={{ fontSize: 11, color: "#64748b" }}>Proteínas</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>{result.carbohidratos}g</div><div style={{ fontSize: 11, color: "#64748b" }}>Carbos</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: "#8b5cf6" }}>{result.grasas}g</div><div style={{ fontSize: 11, color: "#64748b" }}>Grasas</div></div>
              </div>
            </div>
            <button onClick={handleAdd} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>✓ Agregar al registro</button>
            <button onClick={() => setStage("select")} style={{ width: "100%", padding: "13px", borderRadius: 14, border: "2px solid #e2e8f0", background: "white", fontSize: 14, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Tomar otra foto</button>
          </>
        )}

        {stage === "error" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>Detalle del Error</h3>
            {/* AQUÍ ESTÁ LA MAGIA: MOSTRARÁ EL ERROR REAL */}
            <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 12, borderRadius: 8, fontSize: 12, marginBottom: 20, textAlign: "left", wordBreak: "break-word" }}>
              {errorMsg}
            </div>
            <button onClick={() => setStage("select")} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#3b82f6,#06b6d4)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Intentar de nuevo</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PANTALLAS ──────────────────────────────────────────────────────────────
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
        </div>

        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: 16 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600, marginBottom: 12, textAlign: "center" }}>📊 Diario Calórico</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <CircularProgress value={totalKcal} max={2100} size={120} stroke={10} color="#10b981" label={totalKcal} sublabel={`/ 2,100 kcal`} />
            <div style={{ flex: 1 }}>
              <MacroBar label="🟠 Carbohidratos" pct={Math.round((totalC / totalMacro) * 100)} color="#f59e0b" />
              <MacroBar label="🔴 Proteínas" pct={Math.round((totalP / totalMacro) * 100)} color="#ef4444" />
              <MacroBar label="🟣 Grasas" pct={Math.round((totalG / totalMacro) * 100)} color="#8b5cf6" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>Registro de Comidas</div>
          <button onClick={openScanner} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "linear-gradient(135deg,#3b82f6,#06b6d4)", border: "none", borderRadius: 10, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📷 Analizar Foto</button>
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

function NutricionScreen() { return <div style={{ padding: "50px 16px", textAlign: "center", color: "#64748b" }}><h2>🍎 Nutrición</h2><p>Próximamente</p></div>; }
function EjerciciosScreen() { return <div style={{ padding: "50px 16px", textAlign: "center", color: "#64748b" }}><h2>🏋️ Ejercicios</h2><p>Próximamente</p></div>; }
function ProgresoScreen() { return <div style={{ padding: "50px 16px", textAlign: "center", color: "#64748b" }}><h2>📈 Progreso</h2><p>Próximamente</p></div>; }

// ─── APLICACIÓN PRINCIPAL ───────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("inicio");
  const [showModal, setShowModal] = useState(false);
  const [meals, setMeals] = useState(() => {
    const saved = localStorage.getItem("meta10kg_meals");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem("meta10kg_meals", JSON.stringify(meals)); }, [meals]);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", width: "100%", maxWidth: 430, margin: "0 auto", position: "relative", boxShadow: "0 0 24px rgba(0,0,0,0.05)" }}>
      {showModal && <PhotoAnalysisModal onClose={() => setShowModal(false)} onAdd={(newMeal) => setMeals(prev => [...prev, newMeal])} />}
      
      {activeTab === "inicio" && <InicioScreen meals={meals} setMeals={setMeals} openScanner={() => setShowModal(true)} />}
      {activeTab === "nutricion" && <NutricionScreen />}
      {activeTab === "ejercicios" && <EjerciciosScreen />}
      {activeTab === "progreso" && <ProgresoScreen />}

      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, height: 68, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "space-around", borderTop: "1px solid #e2e8f0", zIndex: 90, paddingBottom: 10 }}>
        {NAV_ITEMS.map((item) => {
          if (item.isCenter) {
            return <button key={item.id} onClick={() => setShowModal(true)} style={{ width: 48, height: 48, borderRadius: 99, background: "linear-gradient(135deg,#3b82f6,#0ea5e9)", border: "none", color: "white", fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: -24, boxShadow: "0 4px 14px rgba(59,130,246,0.4)" }}>{item.icon}</button>;
          }
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", flex: 1, color: isActive ? "#3b82f6" : "#94a3b8" }}>
              <span style={{ fontSize: isActive ? 20 : 18 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
