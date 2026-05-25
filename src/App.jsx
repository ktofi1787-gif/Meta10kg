import { useState, useRef, useEffect } from "react";

// ─── CONFIGURACIÓN GLOBAL ───────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "inicio", icon: "🏠", label: "Inicio" },
  { id: "nutricion", icon: "🍎", label: "Nutrición" },
  { id: "add", icon: "+", label: "", isCenter: true },
  { id: "ejercicios", icon: "🏋️", label: "Ejercicios" },
  { id: "progreso", icon: "📈", label: "Progreso" },
];

// ─── FECHAS Y CALENDARIO ────────────────────────────────────────────────────
const getHoyStr = () => new Date().toLocaleDateString('es-CL');

const generarSemana = () => {
  const dias = [];
  const nombres = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  for (let i = -3; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dias.push({
      fechaStr: d.toLocaleDateString('es-CL'),
      diaNombre: nombres[d.getDay()],
      diaNum: d.getDate(),
      esHoy: i === 0
    });
  }
  return dias;
};

// ─── CONEXIÓN A GEMINI ──────────────────────────────────────────────────────
async function analyzeImageWithGemini(base64Image, mimeType) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return { error: "Falta la clave VITE_GEMINI_API_KEY." };

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
              { text: `Analiza esta foto de comida y responde SOLO en formato JSON exacto, usa números:
{ "nombre": "nombre del plato", "calorias": 0, "proteinas": 0, "carbohidratos": 0, "grasas": 0, "emoji": "🍽️" }
Si no hay comida, responde: {"error": "No se detectó comida en la imagen"}` }
            ]
          }],
          generationConfig: { temperature: 0.1 }
        }),
      }
    );
    if (!response.ok) throw new Error(`Google Error ${response.status}`);
    const data = await response.json();
    const cleanText = data.candidates?.[0]?.content?.parts?.[0]?.text.replace(/```json/g, "").replace(/```/g, "").trim() || "";
    return JSON.parse(cleanText);
  } catch (error) {
    return { error: `Fallo: ${error.message}` };
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
      <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.2)" }}><div style={{ width: `${safePct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1s ease" }} /></div>
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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 11, color: "#64748b" }}>{meal.time}</span><span style={{ fontSize: 11, background: "#eff6ff", color: "#3b82f6", borderRadius: 6, padding: "1px 6px", fontWeight: 700 }}>{meal.kcal} kcal</span></div>
      </div>
      <button onClick={() => onDelete(meal.id)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#cbd5e1", padding: 4 }}>✕</button>
    </div>
  );
}

// ─── MODAL DE CÁMARA E IA ───────────────────────────────────────────────────
function PhotoAnalysisModal({ onClose, onAdd, targetDate }) {
  const [stage, setStage] = useState("select"); 
  const [result, setResult] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const cameraRef = useRef();
  const galleryRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
    setStage("analyzing");
    try {
      const base64 = await new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.readAsDataURL(file);
      });
      const data = await analyzeImageWithGemini(base64, file.type);
      if (data.error) { setStage("error"); } else { setResult(data); setStage("result"); }
    } catch (e) { setStage("error"); }
  };

  const handleAdd = () => {
    onAdd({
      id: Date.now(), date: targetDate, name: result.nombre, time: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
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
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", marginBottom: 16 }}>📷 Añadir a: {targetDate}</h3>
            <button onClick={() => cameraRef.current.click()} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#3b82f6,#06b6d4)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>📷 Tomar Foto</button>
            <button onClick={() => galleryRef.current.click()} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "2px solid #e2e8f0", background: "white", color: "#1e293b", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>🖼️ Elegir de Galería</button>
          </>
        )}
        {stage === "analyzing" && <div style={{ textAlign: "center", padding: "20px 0" }}><h3 style={{ fontSize: 17, fontWeight: 800, color: "#1e293b" }}>Analizando...</h3></div>}
        {stage === "result" && result && (
          <><div style={{ fontSize: 30, fontWeight: 900, color: "#3b82f6", textAlign: "center", margin: "20px 0" }}>{result.calorias} kcal</div><button onClick={handleAdd} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>✓ Agregar</button></>
        )}
        {stage === "error" && <div style={{ textAlign: "center" }}><p style={{ color: "red" }}>Error al escanear.</p><button onClick={() => setStage("select")}>Reintentar</button></div>}
      </div>
    </div>
  );
}

// ─── MODAL DE RECORDATORIOS (NOTIFICACIONES) ────────────────────────────────
function RemindersModal({ onClose, reminders, setReminders }) {
  const requestPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then(perm => {
        if (perm === "granted") {
          setReminders({ ...reminders, active: true });
          new Notification("¡Recordatorios activados!", { body: "Te avisaremos cuando sea hora de comer." });
        } else {
          alert("Debes dar permiso en tu navegador para recibir alertas.");
        }
      });
    }
  };

  const handleChange = (e) => setReminders({ ...reminders, [e.target.name]: e.target.value });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 430, paddingBottom: 40 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>🔔 Alarmas de Comida</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20 }}>✕</button>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Desayuno</label><input type="time" name="desayuno" value={reminders.desayuno} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Almuerzo</label><input type="time" name="almuerzo" value={reminders.almuerzo} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Once/Snack</label><input type="time" name="once" value={reminders.once} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Cena</label><input type="time" name="cena" value={reminders.cena} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }} /></div>
        </div>

        {!reminders.active ? (
          <button onClick={requestPermission} style={{ width: "100%", padding: "14px", background: "#3b82f6", border: "none", borderRadius: 12, color: "white", fontWeight: 700, cursor: "pointer" }}>Activar Notificaciones</button>
        ) : (
          <button onClick={() => setReminders({...reminders, active: false})} style={{ width: "100%", padding: "14px", background: "#ef4444", border: "none", borderRadius: 12, color: "white", fontWeight: 700, cursor: "pointer" }}>Desactivar Notificaciones</button>
        )}
      </div>
    </div>
  );
}

// ─── PANTALLA 1: INICIO (Con Calendario) ────────────────────────────────────
function InicioScreen({ meals, setMeals, openScanner, water, setWater, targetKcal, selectedDate, setSelectedDate, openReminders }) {
  const weekDays = generarSemana();
  const dayMeals = meals.filter(m => m.date === selectedDate);
  const totalKcal = dayMeals.reduce((a, m) => a + m.kcal, 0);
  const totalP = dayMeals.reduce((a, m) => a + m.p, 0);
  const totalC = dayMeals.reduce((a, m) => a + m.c, 0);
  const totalG = dayMeals.reduce((a, m) => a + m.g, 0);
  const totalMacro = totalP + totalC + totalG || 1;

  const handleQuickAdd = () => {
    const input = window.prompt("Calorías a sumar rápido:");
    if (input && !isNaN(input)) {
      setMeals(prev => [...prev, { id: Date.now(), date: selectedDate, name: "Carga Manual", time: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }), kcal: Number(input), p: 0, c: 0, g: 0, emoji: "⚡" }]);
    }
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)", borderRadius: "0 0 28px 28px", padding: "50px 20px 28px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: "white" }}>Meta 10kg 💪</span>
          <button onClick={openReminders} style={{ width: 40, height: 40, borderRadius: 99, background: "rgba(255,255,255,0.2)", border: "none", fontSize: 20, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>🔔</button>
        </div>

        {/* ─── CALENDARIO SEMANAL ─── */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          {weekDays.map((d, i) => {
            const isSelected = d.fechaStr === selectedDate;
            return (
              <div key={i} onClick={() => setSelectedDate(d.fechaStr)} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 4px", background: isSelected ? "white" : "transparent", borderRadius: 12, cursor: "pointer", minWidth: 40 }}>
                <span style={{ fontSize: 10, color: isSelected ? "#1d4ed8" : "rgba(255,255,255,0.7)", fontWeight: 700, marginBottom: 4 }}>{d.diaNombre}</span>
                <span style={{ fontSize: 14, color: isSelected ? "#1d4ed8" : "white", fontWeight: 900 }}>{d.diaNum}</span>
              </div>
            );
          })}
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
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button onClick={handleQuickAdd} style={{ flex: 1, padding: "12px", background: "white", border: "1px solid #e2e8f0", borderRadius: 12, color: "#1e293b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⚡ Rápido</button>
          <button onClick={openScanner} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg,#3b82f6,#06b6d4)", border: "none", borderRadius: 12, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📷 Analizar</button>
        </div>
        {dayMeals.length === 0 ? <p style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>No hay registros para este día.</p> : dayMeals.map(m => <MealCard key={m.id} meal={m} onDelete={(id) => setMeals(prev => prev.filter(x => x.id !== id))} />)}
      </div>
    </div>
  );
}

// ─── OTRAS PANTALLAS (Nutrición y Progreso) ─────────────────────────────────
function NutricionScreen({ profile, setProfile }) {
  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });
  const tmb = (10 * (parseFloat(profile.weight)||0)) + (6.25 * (parseFloat(profile.height)||0)) - (5 * (parseFloat(profile.age)||0)) + (profile.gender === 'M' ? 5 : -161);
  const tdee = Math.round(tmb * parseFloat(profile.activity));
  const targetKcal = tdee + (profile.goal === 'lose' ? -500 : profile.goal === 'gain' ? 500 : 0);

  return (
    <div style={{ padding: "50px 16px 80px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 20 }}>🍎 Tu Perfil Metabólico</h2>
      <div style={{ background: "white", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Peso (kg)</label><input type="number" name="weight" value={profile.weight} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Altura (cm)</label><input type="number" name="height" value={profile.height} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Edad</label><input type="number" name="age" value={profile.age} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Sexo</label><select name="gender" value={profile.gender} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }}><option value="M">Hombre</option><option value="F">Mujer</option></select></div>
        </div>
        <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Actividad</label><select name="activity" value={profile.activity} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }}><option value="1.2">Sedentario</option><option value="1.375">Ligero</option><option value="1.55">Moderado</option><option value="1.725">Fuerte</option></select></div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Objetivo</label><select name="goal" value={profile.goal} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 4, boxSizing: "border-box" }}><option value="lose">Bajar de peso</option><option value="maintain">Mantener</option><option value="gain">Subir masa</option></select></div>
      </div>
      <div style={{ background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)", borderRadius: 16, padding: 20, color: "white", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 600 }}>Tus calorías diarias calculadas:</p>
        <div style={{ fontSize: 36, fontWeight: 900 }}>{targetKcal} <span style={{ fontSize: 14 }}>kcal</span></div>
      </div>
    </div>
  );
}

function ProgresoScreen({ weightLogs, setWeightLogs, profile, setProfile }) {
  const currentWeight = weightLogs.length > 0 ? weightLogs[0].weight : profile.weight;
  const handleAddWeight = () => {
    const input = window.prompt("Ingresa tu peso actual (kg):", currentWeight);
    if (input && !isNaN(input)) {
      setWeightLogs(prev => [{ date: getHoyStr(), weight: Number(input) }, ...prev]);
      setProfile(p => ({ ...p, weight: Number(input) }));
    }
  };
  return (
    <div style={{ padding: "50px 16px 80px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 20 }}>📈 Tu Evolución</h2>
      <button onClick={handleAddWeight} style={{ width: "100%", padding: "14px", background: "#10b981", border: "none", borderRadius: 12, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 20 }}>⚖️ Registrar peso de hoy</button>
      <div style={{ background: "white", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 12 }}>Historial de Peso</h4>
        <div>{weightLogs.map((log, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i === weightLogs.length - 1 ? "none" : "1px solid #f1f5f9" }}><span style={{ fontSize: 13, color: "#64748b" }}>{log.date}</span><span style={{ fontSize: 14, color: "#1e293b", fontWeight: 800 }}>{log.weight} kg</span></div>))}</div>
      </div>
    </div>
  );
}

function EjerciciosScreen() { return <div style={{ padding: "50px 16px", textAlign: "center", color: "#64748b" }}><h2>🏋️ Ejercicios</h2><p>Próximamente...</p></div>; }

// ─── APLICACIÓN PRINCIPAL (Estado Global y Cronómetro) ──────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("inicio");
  const [showModal, setShowModal] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getHoyStr());
  
  const [meals, setMeals] = useState(() => JSON.parse(localStorage.getItem("m10_meals")) || []);
  const [water, setWater] = useState(() => Number(localStorage.getItem("m10_water")) || 0);
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem("m10_profile")) || { weight: 85, height: 175, age: 20, gender: 'M', activity: 1.2, goal: 'lose', targetWeight: 75 });
  const [weightLogs, setWeightLogs] = useState(() => JSON.parse(localStorage.getItem("m10_weights")) || [{ date: getHoyStr(), weight: 85 }]);
  const [reminders, setReminders] = useState(() => JSON.parse(localStorage.getItem("m10_reminders")) || { desayuno: "08:00", almuerzo: "13:30", once: "18:00", cena: "21:00", active: false });

  const targetKcal = Math.round(((10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + (profile.gender === 'M' ? 5 : -161)) * parseFloat(profile.activity)) + (profile.goal === 'lose' ? -500 : profile.goal === 'gain' ? 500 : 0);

  // Motor de notificaciones (revisa la hora cada minuto)
  useEffect(() => {
    if (!reminders.active || !("Notification" in window) || Notification.permission !== "granted") return;
    const interval = setInterval(() => {
      const now = new Date();
      const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (current === reminders.desayuno) new Notification("¡Hora del Desayuno! 🍳", { body: "Abre Meta 10kg y escanea tu comida." });
      if (current === reminders.almuerzo) new Notification("¡Hora del Almuerzo! 🥗", { body: "Abre Meta 10kg y escanea tu plato." });
      if (current === reminders.once) new Notification("¡Hora de la Once/Snack! ☕", { body: "Abre Meta 10kg para mantener tu déficit." });
      if (current === reminders.cena) new Notification("¡Hora de la Cena! 🥩", { body: "Abre Meta 10kg y cierra tu día con éxito." });
    }, 60000); // 60.000 ms = 1 minuto
    return () => clearInterval(interval);
  }, [reminders]);

  useEffect(() => { localStorage.setItem("m10_meals", JSON.stringify(meals)); }, [meals]);
  useEffect(() => { localStorage.setItem("m10_water", water.toString()); }, [water]);
  useEffect(() => { localStorage.setItem("m10_profile", JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem("m10_weights", JSON.stringify(weightLogs)); }, [weightLogs]);
  useEffect(() => { localStorage.setItem("m10_reminders", JSON.stringify(reminders)); }, [reminders]);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", width: "100%", maxWidth: 430, margin: "0 auto", position: "relative", boxShadow: "0 0 24px rgba(0,0,0,0.05)" }}>
      {showModal && <PhotoAnalysisModal onClose={() => setShowModal(false)} onAdd={(newMeal) => setMeals(prev => [...prev, newMeal])} targetDate={selectedDate} />}
      {showReminders && <RemindersModal onClose={() => setShowReminders(false)} reminders={reminders} setReminders={setReminders} />}
      
      {activeTab === "inicio" && <InicioScreen meals={meals} setMeals={setMeals} openScanner={() => setShowModal(true)} water={water} setWater={setWater} targetKcal={targetKcal} selectedDate={selectedDate} setSelectedDate={setSelectedDate} openReminders={() => setShowReminders(true)} />}
      {activeTab === "nutricion" && <NutricionScreen profile={profile} setProfile={setProfile} />}
      {activeTab === "ejercicios" && <EjerciciosScreen />}
      {activeTab === "progreso" && <ProgresoScreen weightLogs={weightLogs} setWeightLogs={setWeightLogs} profile={profile} setProfile={setProfile} />}

      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, height: 68, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "space-around", borderTop: "1px solid #e2e8f0", zIndex: 90, paddingBottom: 10 }}>
        {NAV_ITEMS.map((item) => {
          if (item.isCenter) return <button key={item.id} onClick={() => { setSelectedDate(getHoyStr()); setShowModal(true); }} style={{ width: 48, height: 48, borderRadius: 99, background: "linear-gradient(135deg,#3b82f6,#0ea5e9)", border: "none", color: "white", fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: -24, boxShadow: "0 4px 14px rgba(59,130,246,0.4)" }}>{item.icon}</button>;
          return <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", flex: 1, color: activeTab === item.id ? "#3b82f6" : "#94a3b8" }}><span style={{ fontSize: activeTab === item.id ? 20 : 18 }}>{item.icon}</span><span style={{ fontSize: 10, fontWeight: activeTab === item.id ? 700 : 500 }}>{item.label}</span></button>;
        })}
      </nav>
    </div>
  );
}
