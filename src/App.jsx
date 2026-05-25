import { useState, useRef, useEffect } from "react";

// ─── CONFIGURACIÓN GLOBAL ───────────────────────────────────────────────────
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

// ─── CONEXIÓN DIRECTA A GEMINI (BLINDADA) ──────────────────────────────────
async function analyzeImageWithGemini(base64Image, mimeType) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === "") return { error: "Falta la clave VITE_GEMINI_API_KEY en Vercel." };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Image } },
              { text: `Analiza esta foto de comida y responde SOLO en este formato JSON exacto, usa números (sin la letra g), y sin texto adicional:
{ "nombre": "nombre del plato", "calorias": 0, "proteinas": 0, "carbohidratos": 0, "grasas": 0, "emoji": "🍽️" }
Si no hay comida, responde exactamente: {"error": "No se detectó comida en la imagen"}` }
            ]
          }],
          generationConfig: { temperature: 0.1 }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return { error: `Error de Google (${response.status}): ${errorData.error?.message || "Desconocido"}` };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    return { error: `Fallo en la comunicación: ${error.message}` };
  }
}

// ─── COMPONENTES VISUALES COMPARTIDOS ───────────────────────────────────────
function CircularProgress({ value, max, size = 120, stroke = 10, color = "#3b82f6", label, sublabel }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(value / max, 1) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: "white", lineHeight: 1 }}>{label}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>{sublabel}</span>
      </div>
    </div>
  );
}

function MacroBar({ label, pct, color }) {
  const safePct = isNaN(pct) || !isFinite(pct) ? 0 : Math.min(pct, 100);
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

function MealCard({ meal, onDelete }) {
  return (
    <div style={{ background: "white", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", flexShrink: 0, position: "relative" }}>
        {meal.imageUrl ? <img src={meal.imageUrl} alt={meal.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{meal.emoji}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meal.name}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#64748b" }}>{meal.time}</span>
          <span style={{ fontSize: 11, background: "#eff6ff", color: "#3b82f6", borderRadius: 6, padding: "1px 6px", fontWeight: 700 }}>{meal.kcal} kcal</span>
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
    setImageUrl(URL.createObjectURL(file));
    setStage("analyzing");

    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.readAsDataURL(file);
      });
      const data = await analyzeImageWithGemini(base64, file.type);
      if (data.error) { setErrorMsg(data.error); setStage("error"); } 
      else { setResult(data); setStage("result"); }
    } catch (e) { setErrorMsg("Fallo crítico: " + e.message); setStage("error"); }
  };

  const handleAdd = () => {
    onAdd({
      id: Date.now(), name: result.nombre, time: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
      kcal: Number(result.calorias) || 0, p: Number(result.proteinas) || 0, c: Number(result.carbohidratos) || 0, g: Number(result.grasas) || 0, emoji: result.emoji || "🍽️", imageUrl
    });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 430, paddingBottom: 40 }} onClick={e => e.stopPropagation()}>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
        <input ref={galleryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />

        {stage === "select" && (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", marginBottom: 16 }}>📷 Analizar Comida</h3>
            <button onClick={() => cameraRef.current.click()} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#3b82f6,#06b6d4)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>📷 Tomar Foto</button>
            <button onClick={() => galleryRef.current.click()} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "2px solid #e2e8f0", background: "white", color: "#1e293b", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>🖼️ Elegir de Galería</button>
          </>
        )}
        {stage === "analyzing" && <div style={{ textAlign: "center", padding: "20px 0" }}><h3 style={{ fontSize: 17, fontWeight: 800, color: "#1e293b" }}>Analizando IA...</h3></div>}
        {stage === "result" && result && (
          <>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#3b82f6", textAlign: "center", margin: "20px 0" }}>{result.calorias} kcal</div>
            <button onClick={handleAdd} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>✓ Agregar</button>
          </>
        )}
        {stage === "error" && <div style={{ textAlign: "center" }}><p style={{ color: "red" }}>{errorMsg}</p><button onClick={() => setStage("select")}>Reintentar</button></div>}
      </div>
    </div>
  );
}

// ─── PANTALLA 1: INICIO (Contador de Agua y Calorías Rápidas) ───────────────
function InicioScreen({ meals, setMeals, openScanner, water, setWater, targetKcal }) {
  const totalKcal = meals.reduce((a, m) => a + m.kcal, 0);
  const totalP = meals.reduce((a, m) => a + m.p, 0);
  const totalC = meals.reduce((a, m) => a + m.c, 0);
  const totalG = meals.reduce((a, m) => a + m.g, 0);
  const totalMacro = totalP + totalC + totalG || 1;

  const handleQuickAdd = () => {
    const input = window.prompt("¿Cuántas calorías quieres sumar rápido? (Ej: 150)");
    if (input && !isNaN(input)) {
      setMeals(prev => [...prev, { id: Date.now(), name: "Carga Manual", time: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }), kcal: Number(input), p: 0, c: 0, g: 0, emoji: "⚡" }]);
    }
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)", borderRadius: "0 0 28px 28px", padding: "50px 20px 28px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div><span style={{ fontSize: 22, fontWeight: 900, color: "white" }}>¡Hola, Nelson! 👋</span></div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <CircularProgress value={totalKcal} max={targetKcal} size={120} stroke={10} color="#10b981" label={totalKcal} sublabel={`/ ${targetKcal} kcal`} />
            <div style={{ flex: 1 }}>
              <MacroBar label="Carbohidratos" pct={Math.round((totalC / totalMacro) * 100)} color="#f59e0b" />
              <MacroBar label="Proteínas" pct={Math.round((totalP / totalMacro) * 100)} color="#ef4444" />
              <MacroBar label="Grasas" pct={Math.round((totalG / totalMacro) * 100)} color="#8b5cf6" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Contador Simple de Agua */}
        <div style={{ background: "white", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>💧</span><span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Agua del día</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setWater(w => Math.max(0, w - 1))} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "#f1f5f9", fontWeight: 800, color: "#475569", cursor: "pointer" }}>-</button>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", minWidth: 20, textAlign: "center" }}>{water}</span>
              <button onClick={() => setWater(w => w + 1)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "#06b6d4", color: "white", fontWeight: 800, cursor: "pointer" }}>+</button>
            </div>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: "#f1f5f9" }}><div style={{ width: `${Math.min((water / 8) * 100, 100)}%`, height: "100%", background: "#06b6d4", borderRadius: 99, transition: "width 0.3s" }} /></div>
          <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "right", marginTop: 4 }}>Meta: 8 vasos</div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button onClick={handleQuickAdd} style={{ flex: 1, padding: "12px", background: "white", border: "1px solid #e2e8f0", borderRadius: 12, color: "#1e293b", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>⚡ Carga Rápida</button>
          <button onClick={openScanner} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg,#3b82f6,#06b6d4)", border: "none", borderRadius: 12, color: "white", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}>📷 Analizar Foto</button>
        </div>

        {meals.map(m => <MealCard key={m.id} meal={m} onDelete={(id) => setMeals(prev => prev.filter(x => x.id !== id))} />)}
      </div>
    </div>
  );
}

// ─── PANTALLA 2: NUTRICIÓN (Calculadora Déficit/Superávit) ──────────────────
function NutricionScreen({ profile, setProfile }) {
  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  // Fórmula Mifflin-St Jeor
  const weight = parseFloat(profile.weight) || 0;
  const height = parseFloat(profile.height) || 0;
  const age = parseFloat(profile.age) || 0;
  const isMale = profile.gender === 'M';
  const tmb = (10 * weight) + (6.25 * height) - (5 * age) + (isMale ? 5 : -161);
  const tdee = Math.round(tmb * parseFloat(profile.activity));
  
  let targetKcal = tdee;
  if (profile.goal === 'lose') targetKcal -= 500;
  if (profile.goal === 'gain') targetKcal += 500;

  return (
    <div style={{ padding: "50px 16px 80px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>🍎 Calculadora Metabólica</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Ajusta tus requerimientos diarios.</p>

      <div style={{ background: "white", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Peso (kg)</label><input type="number" name="weight" value={profile.weight} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Altura (cm)</label><input type="number" name="height" value={profile.height} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Edad</label><input type="number" name="age" value={profile.age} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Sexo</label><select name="gender" value={profile.gender} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }}><option value="M">Hombre</option><option value="F">Mujer</option></select></div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Actividad Física</label>
          <select name="activity" value={profile.activity} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }}>
            <option value="1.2">Sedentario (Poco o nada)</option><option value="1.375">Ligero (1-3 días/sem)</option><option value="1.55">Moderado (3-5 días/sem)</option><option value="1.725">Fuerte (6-7 días/sem)</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Objetivo</label>
          <select name="goal" value={profile.goal} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }}>
            <option value="lose">Bajar de peso (Déficit)</option><option value="maintain">Mantener peso</option><option value="gain">Subir volumen (Superávit)</option>
          </select>
        </div>
      </div>

      <div style={{ background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)", borderRadius: 16, padding: 20, color: "white", textAlign: "center" }}>
        <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, fontWeight: 600 }}>Tus calorías diarias calculadas:</p>
        <div style={{ fontSize: 36, fontWeight: 900 }}>{targetKcal} <span style={{ fontSize: 14, fontWeight: 600 }}>kcal</span></div>
        <p style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>Basado en la ecuación de Mifflin-St Jeor</p>
      </div>
    </div>
  );
}

// ─── PANTALLA 3: PROGRESO (Registro de Peso) ────────────────────────────────
function ProgresoScreen({ weightLogs, setWeightLogs, profile, setProfile }) {
  const currentWeight = weightLogs.length > 0 ? weightLogs[0].weight : profile.weight;
  const remaining = (currentWeight - profile.targetWeight).toFixed(1);

  const handleAddWeight = () => {
    const input = window.prompt("Ingresa tu peso actual (kg):", currentWeight);
    if (input && !isNaN(input)) {
      setWeightLogs(prev => [{ date: new Date().toLocaleDateString('es-CL'), weight: Number(input) }, ...prev]);
      setProfile(p => ({ ...p, weight: Number(input) })); // Sincroniza el perfil
    }
  };

  return (
    <div style={{ padding: "50px 16px 80px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>📈 Tu Evolución</h2>
      
      <div style={{ display: "flex", gap: 12, marginBottom: 20, marginTop: 20 }}>
        <div style={{ flex: 1, background: "white", padding: 16, borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block" }}>Peso Actual</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#1e293b" }}>{currentWeight} kg</span>
        </div>
        <div style={{ flex: 1, background: "white", padding: 16, borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block" }}>Faltan para meta</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#10b981" }}>{Math.max(0, remaining)} kg</span>
        </div>
      </div>

      <button onClick={handleAddWeight} style={{ width: "100%", padding: "14px", background: "#10b981", border: "none", borderRadius: 12, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 20, boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}>
        ⚖️ Registrar peso de hoy
      </button>

      <div style={{ background: "white", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 12 }}>Historial de Peso</h4>
        <div>
          {weightLogs.map((log, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i === weightLogs.length - 1 ? "none" : "1px solid #f1f5f9" }}>
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>{log.date}</span>
              <span style={{ fontSize: 14, color: "#1e293b", fontWeight: 800 }}>{log.weight} kg</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EjerciciosScreen() { return <div style={{ padding: "50px 16px", textAlign: "center", color: "#64748b" }}><h2>🏋️ Ejercicios</h2><p>Pestaña en construcción</p></div>; }

// ─── APLICACIÓN PRINCIPAL (Estado Global) ───────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("inicio");
  const [showModal, setShowModal] = useState(false);
  
  // Estados persistentes
  const [meals, setMeals] = useState(() => JSON.parse(localStorage.getItem("m10_meals")) || []);
  const [water, setWater] = useState(() => Number(localStorage.getItem("m10_water")) || 0);
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem("m10_profile")) || { weight: 85, height: 175, age: 20, gender: 'M', activity: 1.2, goal: 'lose', targetWeight: 75 });
  const [weightLogs, setWeightLogs] = useState(() => JSON.parse(localStorage.getItem("m10_weights")) || [{ date: new Date().toLocaleDateString('es-CL'), weight: 85 }]);

  // Cálculo en tiempo real del límite diario
  const tmb = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + (profile.gender === 'M' ? 5 : -161);
  const targetKcal = Math.round(tmb * parseFloat(profile.activity)) + (profile.goal === 'lose' ? -500 : profile.goal === 'gain' ? 500 : 0);

  // Guardado automático
  useEffect(() => { localStorage.setItem("m10_meals", JSON.stringify(meals)); }, [meals]);
  useEffect(() => { localStorage.setItem("m10_water", water.toString()); }, [water]);
  useEffect(() => { localStorage.setItem("m10_profile", JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem("m10_weights", JSON.stringify(weightLogs)); }, [weightLogs]);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", width: "100%", maxWidth: 430, margin: "0 auto", position: "relative", boxShadow: "0 0 24px rgba(0,0,0,0.05)" }}>
      {showModal && <PhotoAnalysisModal onClose={() => setShowModal(false)} onAdd={(newMeal) => setMeals(prev => [...prev, newMeal])} />}
      
      {activeTab === "inicio" && <InicioScreen meals={meals} setMeals={setMeals} openScanner={() => setShowModal(true)} water={water} setWater={setWater} targetKcal={targetKcal} />}
      {activeTab === "nutricion" && <NutricionScreen profile={profile} setProfile={setProfile} />}
      {activeTab === "ejercicios" && <EjerciciosScreen />}
      {activeTab === "progreso" && <ProgresoScreen weightLogs={weightLogs} setWeightLogs={setWeightLogs} profile={profile} setProfile={setProfile} />}

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
