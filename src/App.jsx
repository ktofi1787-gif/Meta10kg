import { useState, useRef, useEffect } from "react";

// ─── PALETA DE COLORES PREMIUM (DARK THEME) ─────────────────────────────────
const theme = {
  bg: "#0B0F19", // Azul muy oscuro (Casi negro)
  card: "rgba(30, 41, 59, 0.4)", // Translúcido para Glassmorphism
  border: "rgba(255, 255, 255, 0.08)",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  accent: "#3B82F6", // Azul Tech
  energy: "#F97316", // Naranja (Calorías)
  protein: "#EF4444", // Rojo
  carbs: "#F59E0B", // Ámbar
  fat: "#8B5CF6", // Morado
  water: "#06B6D4", // Cyan
  success: "#10B981" // Verde Progreso
};

// ─── CONFIGURACIÓN GLOBAL ───────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "inicio", icon: "🏠", label: "Inicio" },
  { id: "nutricion", icon: "🔥", label: "Macros" },
  { id: "add", icon: "📷", label: "", isCenter: true },
  { id: "ejercicios", icon: "🏋️", label: "Rutina" },
  { id: "progreso", icon: "📈", label: "Evolución" },
];

const getHoyStr = () => new Date().toLocaleDateString('es-CL');

const generarSemana = () => {
  const dias = [];
  const nombres = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  for (let i = -3; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dias.push({ fechaStr: d.toLocaleDateString('es-CL'), diaNombre: nombres[d.getDay()], diaNum: d.getDate(), esHoy: i === 0 });
  }
  return dias;
};

// ─── CONEXIÓN A GEMINI ──────────────────────────────────────────────────────
async function analyzeImageWithGemini(base64Image, mimeType) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return { error: "API Key no configurada." };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mimeType, data: base64Image } },
            { text: `Analiza esta comida. Responde SOLO en JSON con números (sin 'g' ni texto):
{ "nombre": "Plato", "calorias": 0, "proteinas": 0, "carbohidratos": 0, "grasas": 0, "emoji": "🍽️" }
Si no hay comida: {"error": "Sin comida"}` }
          ]}],
          generationConfig: { temperature: 0.1 }
        })
      }
    );
    if (!response.ok) throw new Error(`Google Error ${response.status}`);
    const data = await response.json();
    const cleanText = data.candidates?.[0]?.content?.parts?.[0]?.text.replace(/```json/g, "").replace(/```/g, "").trim() || "";
    return JSON.parse(cleanText);
  } catch (error) {
    return { error: `Error de red: ${error.message}` };
  }
}

// ─── COMPONENTES UI PREMIUM ─────────────────────────────────────────────────
const GlassCard = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{
    background: theme.card,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderRadius: "24px",
    border: `1px solid ${theme.border}`,
    padding: "20px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    ...style
  }}>
    {children}
  </div>
);

function ProgressRing({ value, max, size = 140, stroke = 12, color = theme.energy, label, sublabel }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(value / max, 1) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, filter: `drop-shadow(0 0 12px ${color}40)` }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: theme.text, lineHeight: 1 }}>{label}</span>
        <span style={{ fontSize: 12, color: theme.textMuted, marginTop: 4, fontWeight: 600 }}>{sublabel}</span>
      </div>
    </div>
  );
}

function PremiumMacroBar({ label, pct, color, amount }) {
  const safePct = isNaN(pct) || !isFinite(pct) ? 0 : Math.min(pct, 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: theme.textMuted, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color: theme.text, fontWeight: 800 }}>{amount}g <span style={{ color: color, opacity: 0.8 }}>({safePct}%)</span></span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <div style={{ width: `${safePct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1s ease", boxShadow: `0 0 8px ${color}` }} />
      </div>
    </div>
  );
}

function MealCardPremium({ meal, onDelete }) {
  return (
    <GlassCard style={{ padding: "12px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "16px", transition: "transform 0.2s", cursor: "pointer" }} >
      <div style={{ width: 64, height: 64, borderRadius: "18px", overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)" }}>
        {meal.imageUrl ? <img src={meal.imageUrl} alt={meal.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : meal.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: 15, fontWeight: 800, color: theme.text, margin: "0 0 4px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meal.name}</h4>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ fontSize: 12, color: theme.textMuted }}>{meal.time}</span>
          <span style={{ fontSize: 12, background: `${theme.energy}20`, color: theme.energy, borderRadius: "8px", padding: "2px 8px", fontWeight: 800 }}>{meal.kcal} kcal</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{ fontSize: 11, color: theme.protein, fontWeight: 700 }}>{meal.p}g P</span>
          <span style={{ fontSize: 11, color: theme.carbs, fontWeight: 700 }}>{meal.c}g C</span>
          <span style={{ fontSize: 11, color: theme.fat, fontWeight: 700 }}>{meal.g}g G</span>
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(meal.id); }} style={{ background: "none", border: "none", width: 32, height: 32, borderRadius: 16, background: "rgba(239, 68, 68, 0.1)", color: theme.protein, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
    </GlassCard>
  );
}

// ─── PANTALLA 1: DASHBOARD (INICIO) ─────────────────────────────────────────
function InicioScreen({ meals, setMeals, water, setWater, targetKcal, selectedDate, setSelectedDate, openReminders }) {
  const weekDays = generarSemana();
  const dayMeals = meals.filter(m => m.date === selectedDate);
  const totalKcal = dayMeals.reduce((a, m) => a + m.kcal, 0);
  const totalP = dayMeals.reduce((a, m) => a + m.p, 0);
  const totalC = dayMeals.reduce((a, m) => a + m.c, 0);
  const totalG = dayMeals.reduce((a, m) => a + m.g, 0);
  const totalMacro = totalP + totalC + totalG || 1;

  const handleQuickAdd = () => {
    const input = window.prompt("Ingresa calorías rápidas:");
    if (input && !isNaN(input)) {
      setMeals(prev => [{ id: Date.now(), date: selectedDate, name: "Carga Rápida", time: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }), kcal: Number(input), p: 0, c: 0, g: 0, emoji: "⚡" }, ...prev]);
    }
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header Premium */}
      <div style={{ padding: "40px 24px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: theme.text, margin: 0, background: `linear-gradient(to right, ${theme.text}, ${theme.textMuted})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Meta 10kg</h1>
          <p style={{ fontSize: 14, color: theme.textMuted, margin: "4px 0 0 0", fontWeight: 500 }}>Tu evolución inteligente</p>
        </div>
        <button onClick={openReminders} style={{ width: 44, height: 44, borderRadius: "14px", background: theme.card, border: `1px solid ${theme.border}`, fontSize: 20, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>🔔</button>
      </div>

      {/* Calendario Píldoras */}
      <div style={{ display: "flex", overflowX: "auto", gap: "12px", padding: "0 24px 20px", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {weekDays.map((d, i) => {
          const isSelected = d.fechaStr === selectedDate;
          return (
            <div key={i} onClick={() => setSelectedDate(d.fechaStr)} style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 56, height: 72, background: isSelected ? `linear-gradient(135deg, ${theme.accent}, ${theme.water})` : theme.card, borderRadius: "20px", border: `1px solid ${isSelected ? 'transparent' : theme.border}`, cursor: "pointer", transition: "all 0.3s ease", boxShadow: isSelected ? `0 8px 16px ${theme.accent}40` : 'none' }}>
              <span style={{ fontSize: 11, color: isSelected ? "#fff" : theme.textMuted, fontWeight: 700, marginBottom: 4 }}>{d.diaNombre}</span>
              <span style={{ fontSize: 18, color: isSelected ? "#fff" : theme.text, fontWeight: 900 }}>{d.diaNum}</span>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "0 24px" }}>
        {/* Anillo y Macros */}
        <GlassCard style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "24px" }}>
          <ProgressRing value={totalKcal} max={targetKcal} size={130} stroke={12} color={theme.energy} label={totalKcal} sublabel={`/ ${targetKcal} kcal`} />
          <div style={{ flex: 1 }}>
            <PremiumMacroBar label="Proteínas" pct={Math.round((totalP / (targetKcal*0.3/4)) * 100)} amount={totalP} color={theme.protein} />
            <PremiumMacroBar label="Carbohidratos" pct={Math.round((totalC / (targetKcal*0.4/4)) * 100)} amount={totalC} color={theme.carbs} />
            <PremiumMacroBar label="Grasas" pct={Math.round((totalG / (targetKcal*0.3/9)) * 100)} amount={totalG} color={theme.fat} />
          </div>
        </GlassCard>

        {/* Tracker de Agua y Carga Rápida */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
          <GlassCard style={{ padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>Agua 💧</span>
              <span style={{ fontSize: 12, color: theme.water, fontWeight: 800 }}>{water}/8</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setWater(w => Math.max(0, w - 1))} style={{ flex: 1, height: 36, borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "none", color: theme.text, fontSize: 18, cursor: "pointer" }}>-</button>
              <button onClick={() => setWater(w => w + 1)} style={{ flex: 1, height: 36, borderRadius: "10px", background: `${theme.water}30`, border: "none", color: theme.water, fontSize: 18, cursor: "pointer", fontWeight: "bold" }}>+</button>
            </div>
          </GlassCard>

          <GlassCard onClick={handleQuickAdd} style={{ padding: "16px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", cursor: "pointer", background: `linear-gradient(135deg, ${theme.energy}20, transparent)` }}>
            <span style={{ fontSize: 24, marginBottom: 8 }}>⚡</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>Carga Rápida</span>
          </GlassCard>
        </div>

        {/* Lista de Comidas */}
        <h3 style={{ fontSize: 18, fontWeight: 800, color: theme.text, marginBottom: 16 }}>Diario del Día</h3>
        {dayMeals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", opacity: 0.5 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
            <p style={{ color: theme.textMuted, fontSize: 14, margin: 0 }}>No has registrado comidas aún</p>
          </div>
        ) : (
          dayMeals.map(m => <MealCardPremium key={m.id} meal={m} onDelete={(id) => setMeals(prev => prev.filter(x => x.id !== id))} />)
        )}
      </div>
    </div>
  );
}

// ─── PANTALLA 2: NUTRICIÓN Y PERFIL ─────────────────────────────────────────
function NutricionScreen({ profile, setProfile }) {
  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });
  const tmb = (10 * (parseFloat(profile.weight)||0)) + (6.25 * (parseFloat(profile.height)||0)) - (5 * (parseFloat(profile.age)||0)) + (profile.gender === 'M' ? 5 : -161);
  const targetKcal = Math.round(tmb * parseFloat(profile.activity)) + (profile.goal === 'lose' ? -500 : profile.goal === 'gain' ? 500 : 0);

  const InputStyle = { width: "100%", padding: "14px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: `1px solid ${theme.border}`, color: theme.text, fontSize: 14, marginTop: 6, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ padding: "40px 24px 100px" }}>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: theme.text, marginBottom: 24 }}>Perfil Metabólico</h2>
      
      <div style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.fat})`, borderRadius: "24px", padding: "30px 20px", color: "white", textAlign: "center", marginBottom: 32, boxShadow: `0 12px 24px ${theme.accent}40` }}>
        <p style={{ fontSize: 14, fontWeight: 600, opacity: 0.9, margin: "0 0 8px 0" }}>Calorías Diarias Objetivo</p>
        <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>{targetKcal} <span style={{ fontSize: 16, fontWeight: 600, opacity: 0.8 }}>kcal</span></div>
      </div>

      <GlassCard>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div><label style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted }}>Peso (kg)</label><input type="number" name="weight" value={profile.weight} onChange={handleChange} style={InputStyle} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted }}>Altura (cm)</label><input type="number" name="height" value={profile.height} onChange={handleChange} style={InputStyle} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted }}>Edad</label><input type="number" name="age" value={profile.age} onChange={handleChange} style={InputStyle} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted }}>Sexo</label><select name="gender" value={profile.gender} onChange={handleChange} style={{...InputStyle, appearance: "none"}}><option value="M">Hombre</option><option value="F">Mujer</option></select></div>
        </div>
        <div style={{ marginBottom: "16px" }}><label style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted }}>Actividad Física</label><select name="activity" value={profile.activity} onChange={handleChange} style={{...InputStyle, appearance: "none"}}><option value="1.2">Sedentario</option><option value="1.375">Ligero (1-3 días)</option><option value="1.55">Moderado (3-5 días)</option><option value="1.725">Fuerte (6-7 días)</option></select></div>
        <div><label style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted }}>Objetivo Visual</label><select name="goal" value={profile.goal} onChange={handleChange} style={{...InputStyle, appearance: "none"}}><option value="lose">Déficit (Perder Grasa)</option><option value="maintain">Mantenimiento</option><option value="gain">Superávit (Ganar Músculo)</option></select></div>
      </GlassCard>
    </div>
  );
}

// ─── PANTALLA 3: PROGRESO Y PESO ────────────────────────────────────────────
function ProgresoScreen({ weightLogs, setWeightLogs, profile, setProfile }) {
  const currentWeight = weightLogs.length > 0 ? weightLogs[0].weight : profile.weight;
  const lost = (profile.initialWeight || 85) - currentWeight;

  const handleAddWeight = () => {
    const input = window.prompt("Peso actual (kg):", currentWeight);
    if (input && !isNaN(input)) {
      setWeightLogs(prev => [{ date: getHoyStr(), weight: Number(input) }, ...prev]);
      setProfile(p => ({ ...p, weight: Number(input) }));
    }
  };

  return (
    <div style={{ padding: "40px 24px 100px" }}>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: theme.text, marginBottom: 24 }}>Tu Evolución</h2>
      
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <GlassCard style={{ flex: 1, textAlign: "center", padding: "24px 16px" }}>
          <span style={{ fontSize: 12, color: theme.textMuted, fontWeight: 700, display: "block", marginBottom: 8 }}>Peso Actual</span>
          <span style={{ fontSize: 28, fontWeight: 900, color: theme.text }}>{currentWeight}<span style={{fontSize: 14}}>kg</span></span>
        </GlassCard>
        <GlassCard style={{ flex: 1, textAlign: "center", padding: "24px 16px", background: `linear-gradient(135deg, ${theme.success}20, transparent)` }}>
          <span style={{ fontSize: 12, color: theme.success, fontWeight: 700, display: "block", marginBottom: 8 }}>Total Bajado</span>
          <span style={{ fontSize: 28, fontWeight: 900, color: theme.success }}>-{Math.max(0, lost).toFixed(1)}<span style={{fontSize: 14}}>kg</span></span>
        </GlassCard>
      </div>

      <button onClick={handleAddWeight} style={{ width: "100%", padding: "18px", background: `linear-gradient(135deg, ${theme.success}, #059669)`, border: "none", borderRadius: "16px", color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", marginBottom: 32, boxShadow: `0 8px 24px ${theme.success}40` }}>⚖️ Registrar peso de hoy</button>

      <h3 style={{ fontSize: 18, fontWeight: 800, color: theme.text, marginBottom: 16 }}>Historial Analítico</h3>
      <GlassCard style={{ padding: "8px 20px" }}>
        {weightLogs.map((log, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: i === weightLogs.length - 1 ? "none" : `1px solid ${theme.border}` }}>
            <span style={{ fontSize: 14, color: theme.textMuted, fontWeight: 600 }}>{log.date}</span>
            <span style={{ fontSize: 16, color: theme.text, fontWeight: 800 }}>{log.weight} kg</span>
          </div>
        ))}
      </GlassCard>
    </div>
  );
}

// ─── PANTALLA 4: RUTINAS (CONSTRUCCIÓN VISUAL) ──────────────────────────────
function EjerciciosScreen() { 
  return (
    <div style={{ padding: "40px 24px 100px" }}>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: theme.text, marginBottom: 24 }}>Gym & Rutinas</h2>
      <GlassCard style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🚧</div>
        <h3 style={{ color: theme.text, fontSize: 18, fontWeight: 800 }}>Sección en Construcción</h3>
        <p style={{ color: theme.textMuted, fontSize: 14 }}>Pronto podrás trackear tus pesos muertos y sentadillas aquí.</p>
      </GlassCard>
    </div>
  ); 
}

// ─── MODAL DE IA FOTOGRÁFICO PREMIUM ────────────────────────────────────────
function PhotoAnalysisModal({ onClose, onAdd, targetDate }) {
  const [stage, setStage] = useState("select"); 
  const [result, setResult] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const cameraRef = useRef(); const galleryRef = useRef();

  const handleFile = async (file) => {
    if (!file) return; setImageUrl(URL.createObjectURL(file)); setStage("analyzing");
    try {
      const base64 = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.readAsDataURL(file); });
      const data = await analyzeImageWithGemini(base64, file.type);
      if (data.error) setStage("error"); else { setResult(data); setStage("result"); }
    } catch (e) { setStage("error"); }
  };

  const handleAdd = () => {
    onAdd({ id: Date.now(), date: targetDate, name: result.nombre, time: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }), kcal: Number(result.calorias)||0, p: Number(result.proteinas)||0, c: Number(result.carbohidratos)||0, g: Number(result.grasas)||0, emoji: result.emoji || "🍽️", imageUrl });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: theme.bg, borderRadius: "32px 32px 0 0", padding: "32px 24px", width: "100%", maxWidth: 430, paddingBottom: 50, borderTop: `1px solid ${theme.border}`, boxShadow: "0 -10px 40px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
        <input ref={galleryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
        
        {stage === "select" && (
          <>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: theme.text, marginBottom: 8, textAlign: "center" }}>Escanear Plato</h3>
            <p style={{ fontSize: 14, color: theme.textMuted, marginBottom: 32, textAlign: "center" }}>La IA identificará los macros exactos.</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => cameraRef.current.click()} style={{ flex: 1, padding: "20px", borderRadius: "20px", border: "none", background: `linear-gradient(135deg, ${theme.accent}, ${theme.water})`, color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><span style={{fontSize: 28}}>📷</span> Cámara</button>
              <button onClick={() => galleryRef.current.click()} style={{ flex: 1, padding: "20px", borderRadius: "20px", border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 16, fontWeight: 800, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><span style={{fontSize: 28}}>🖼️</span> Galería</button>
            </div>
          </>
        )}
        
        {stage === "analyzing" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 120, height: 120, margin: "0 auto 24px", borderRadius: "24px", overflow: "hidden", position: "relative" }}>
              <img src={imageUrl} alt="Scan" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }} />
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: theme.water, boxShadow: `0 0 15px ${theme.water}`, animation: "scan 2s infinite ease-in-out" }} />
              <style>{`@keyframes scan { 0% { top: 0 } 50% { top: 100% } 100% { top: 0 } }`}</style>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: theme.text, animation: "pulse 1.5s infinite" }}>Analizando con Gemini AI...</h3>
          </div>
        )}

        {stage === "result" && result && (
           <div style={{ textAlign: "center" }}>
             <h3 style={{ fontSize: 20, fontWeight: 800, color: theme.text, marginBottom: 8 }}>{result.nombre}</h3>
             <div style={{ fontSize: 48, fontWeight: 900, color: theme.energy, margin: "16px 0", textShadow: `0 0 20px ${theme.energy}40` }}>{result.calorias} <span style={{fontSize:16, color: theme.textMuted}}>kcal</span></div>
             <div style={{ display: "flex", justifyContent: "space-between", background: theme.card, padding: "16px", borderRadius: "16px", marginBottom: "24px" }}>
               <div><span style={{display:"block", color:theme.protein, fontWeight:900, fontSize:18}}>{result.proteinas}g</span><span style={{fontSize:11, color:theme.textMuted}}>Proteínas</span></div>
               <div><span style={{display:"block", color:theme.carbs, fontWeight:900, fontSize:18}}>{result.carbohidratos}g</span><span style={{fontSize:11, color:theme.textMuted}}>Carbos</span></div>
               <div><span style={{display:"block", color:theme.fat, fontWeight:900, fontSize:18}}>{result.grasas}g</span><span style={{fontSize:11, color:theme.textMuted}}>Grasas</span></div>
             </div>
             <button onClick={handleAdd} style={{ width: "100%", padding: "18px", borderRadius: "16px", border: "none", background: theme.success, color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: `0 8px 24px ${theme.success}40` }}>✓ Guardar Comida</button>
           </div>
        )}
      </div>
    </div>
  );
}

// ─── MODAL RECORDATORIOS ────────────────────────────────────────────────────
function RemindersModal({ onClose, reminders, setReminders }) {
  const handleChange = (e) => setReminders({ ...reminders, [e.target.name]: e.target.value });
  const InputStyle = { width: "100%", padding: "12px", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: `1px solid ${theme.border}`, color: theme.text, outline: "none", colorScheme: "dark" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <GlassCard style={{ width: "90%", maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: theme.text, marginBottom: 20 }}>⏰ Notificaciones</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: 24 }}>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted }}>Desayuno</label><input type="time" name="desayuno" value={reminders.desayuno} onChange={handleChange} style={InputStyle} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted }}>Almuerzo</label><input type="time" name="almuerzo" value={reminders.almuerzo} onChange={handleChange} style={InputStyle} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted }}>Snack</label><input type="time" name="once" value={reminders.once} onChange={handleChange} style={InputStyle} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted }}>Cena</label><input type="time" name="cena" value={reminders.cena} onChange={handleChange} style={InputStyle} /></div>
        </div>
        <button onClick={() => setReminders({...reminders, active: !reminders.active})} style={{ width: "100%", padding: "14px", background: reminders.active ? theme.card : theme.accent, border: `1px solid ${reminders.active ? theme.border : 'transparent'}`, borderRadius: "12px", color: theme.text, fontWeight: 800, cursor: "pointer" }}>
          {reminders.active ? "Desactivar Alarmas" : "Activar Alarmas"}
        </button>
      </GlassCard>
    </div>
  );
}

// ─── APLICACIÓN PRINCIPAL ───────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("inicio");
  const [showModal, setShowModal] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getHoyStr());
  
  const [meals, setMeals] = useState(() => JSON.parse(localStorage.getItem("m10_meals")) || []);
  const [water, setWater] = useState(() => Number(localStorage.getItem("m10_water")) || 0);
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem("m10_profile")) || { weight: 85, initialWeight: 85, height: 175, age: 20, gender: 'M', activity: 1.2, goal: 'lose' });
  const [weightLogs, setWeightLogs] = useState(() => JSON.parse(localStorage.getItem("m10_weights")) || [{ date: getHoyStr(), weight: 85 }]);
  const [reminders, setReminders] = useState(() => JSON.parse(localStorage.getItem("m10_reminders")) || { desayuno: "08:00", almuerzo: "13:30", once: "18:00", cena: "21:00", active: false });

  const targetKcal = Math.round(((10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + (profile.gender === 'M' ? 5 : -161)) * parseFloat(profile.activity)) + (profile.goal === 'lose' ? -500 : profile.goal === 'gain' ? 500 : 0);

  useEffect(() => { localStorage.setItem("m10_meals", JSON.stringify(meals)); }, [meals]);
  useEffect(() => { localStorage.setItem("m10_water", water.toString()); }, [water]);
  useEffect(() => { localStorage.setItem("m10_profile", JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem("m10_weights", JSON.stringify(weightLogs)); }, [weightLogs]);
  useEffect(() => { localStorage.setItem("m10_reminders", JSON.stringify(reminders)); }, [reminders]);

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", width: "100%", maxWidth: 430, margin: "0 auto", position: "relative", fontFamily: "system-ui, -apple-system, sans-serif", overflowX: "hidden" }}>
      {showModal && <PhotoAnalysisModal onClose={() => setShowModal(false)} onAdd={(m) => setMeals([m, ...meals])} targetDate={selectedDate} />}
      {showReminders && <RemindersModal onClose={() => setShowReminders(false)} reminders={reminders} setReminders={setReminders} />}
      
      {activeTab === "inicio" && <InicioScreen meals={meals} setMeals={setMeals} openScanner={() => setShowModal(true)} water={water} setWater={setWater} targetKcal={targetKcal} selectedDate={selectedDate} setSelectedDate={setSelectedDate} openReminders={() => setShowReminders(true)} />}
      {activeTab === "nutricion" && <NutricionScreen profile={profile} setProfile={setProfile} />}
      {activeTab === "ejercicios" && <EjerciciosScreen />}
      {activeTab === "progreso" && <ProgresoScreen weightLogs={weightLogs} setWeightLogs={setWeightLogs} profile={profile} setProfile={setProfile} />}

      {/* FLOATING BOTTOM NAV PREMIUM */}
      <nav style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", width: "90%", maxWidth: 390, height: 72, background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", borderRadius: "36px", border: `1px solid ${theme.border}`, zIndex: 90, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
        {NAV_ITEMS.map((item) => {
          if (item.isCenter) return (
            <div key={item.id} style={{ position: "relative", top: -24 }}>
              <button onClick={() => { setSelectedDate(getHoyStr()); setShowModal(true); }} style={{ width: 64, height: 64, borderRadius: 32, background: `linear-gradient(135deg, ${theme.accent}, ${theme.water})`, border: "none", color: "white", fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: `0 8px 24px ${theme.accent}60`, transition: "transform 0.2s" }}>
                {item.icon}
              </button>
            </div>
          );
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 60, cursor: "pointer", color: isActive ? theme.accent : theme.textMuted, transition: "all 0.3s ease" }}>
              <span style={{ fontSize: isActive ? 22 : 20, marginBottom: 4, filter: isActive ? `drop-shadow(0 0 8px ${theme.accent})` : "none" }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 800 : 600 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
