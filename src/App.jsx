import { useState, useRef, useEffect } from "react";

// ─── PALETA DE COLORES PREMIUM (DARK THEME) ─────────────────────────────────
const theme = {
  bg: "#0B0F19",
  card: "rgba(30, 41, 59, 0.4)",
  border: "rgba(255, 255, 255, 0.08)",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  accent: "#3B82F6",
  energy: "#F97316",
  protein: "#EF4444",
  carbs: "#F59E0B",
  fat: "#8B5CF6",
  water: "#06B6D4",
  success: "#10B981"
};

const NAV_ITEMS = [
  { id: "inicio", icon: "🏠", label: "Inicio" },
  { id: "estadisticas", icon: "📊", label: "Stats" },
  { id: "add", icon: "📷", label: "", isCenter: true },
  { id: "ejercicios", icon: "🏋️", label: "Rutina" },
  { id: "progreso", icon: "📈", label: "Evolución" },
];

const getHoyStr = () => new Date().toLocaleDateString('es-CL');

const generarSemana = () => {
  const dias = [];
  const nombres = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    dias.push({ fechaStr: d.toLocaleDateString('es-CL'), diaNombre: nombres[d.getDay()], diaNum: d.getDate(), esHoy: i === 0 });
  }
  return dias;
};

// ─── CONEXIONES A GEMINI (VISIÓN Y COACH) ──────────────────────────────────
async function analyzeImageWithGemini(base64Image, mimeType) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return { error: "API Key no configurada." };
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: mimeType, data: base64Image } },
          { text: `Analiza detalladamente esta comida. Responde SOLO en JSON numérico:
{ "nombre": "Plato", "ingredientes": "Lista breve", "calorias": 0, "proteinas": 0, "carbohidratos": 0, "grasas": 0, "emoji": "🍽️" }
Si no hay comida: {"error": "No se detectó comida en la imagen"}` }
        ]}], generationConfig: { temperature: 0.1 }
      })
    });
    if (!response.ok) throw new Error(`Google Error ${response.status}`);
    const data = await response.json();
    return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text.replace(/```json/g, "").replace(/```/g, "").trim() || "");
  } catch (error) { return { error: `Error de red: ${error.message}` }; }
}

async function getAICoachFeedback(profile, dayMeals, water, targetKcal) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return "Configura tu API Key para hablar con tu Coach.";
  const kcalHoy = dayMeals.reduce((a, m) => a + m.kcal, 0);
  const pHoy = dayMeals.reduce((a, m) => a + m.p, 0);
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Actúa como un Coach de Fitness experto, motivador y directo.
Datos de tu cliente: Peso ${profile.weight}kg, Objetivo: ${profile.goal === 'lose' ? 'Bajar peso' : profile.goal === 'gain' ? 'Subir masa' : 'Mantener'}.
Hoy ha consumido: ${kcalHoy} kcal (de un objetivo de ${targetKcal} kcal), ${pHoy}g de proteína y ${water} de 8 vasos de agua.
Dale un análisis rápido de cómo va hoy, qué debe corregir (si aplica) y motívalo. Máximo 3 líneas. Tutea al usuario.` }]}],
        generationConfig: { temperature: 0.7 }
      })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude generar una respuesta. Intenta de nuevo.";
  } catch (error) { return "Hubo un error al conectar con el Coach."; }
}

// ─── COMPONENTES UI PREMIUM ─────────────────────────────────────────────────
const GlassCard = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: theme.card, backdropFilter: "blur(16px)", borderRadius: "24px", border: `1px solid ${theme.border}`, padding: "20px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", ...style }}>
    {children}
  </div>
);

function ProgressRing({ value, max, size = 140, stroke = 12, color = theme.energy, label, sublabel }) {
  const r = (size - stroke) / 2; const circ = 2 * Math.PI * r; const dash = Math.min(value / max, 1) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, filter: `drop-shadow(0 0 12px ${color}40)` }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: theme.text, lineHeight: 1 }}>{label}</span>
        <span style={{ fontSize: 12, color: theme.textMuted, marginTop: 4, fontWeight: 600 }}>{sublabel}</span>
      </div>
    </div>
  );
}

// ─── TARJETA DE COMIDA EXPANDIBLE ───────────────────────────────────────────
function MealCardPremium({ meal, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div onClick={() => setExpanded(!expanded)} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}`, borderRadius: "16px", padding: "12px", marginBottom: "10px", transition: "all 0.3s", cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ width: 50, height: 50, borderRadius: "14px", overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
          {meal.imageUrl ? <img src={meal.imageUrl} alt={meal.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : meal.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: 14, fontWeight: 800, color: theme.text, margin: "0 0 4px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meal.name}</h4>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: 11, background: `${theme.energy}20`, color: theme.energy, borderRadius: "6px", padding: "2px 6px", fontWeight: 800 }}>{meal.kcal} kcal</span>
            <span style={{ fontSize: 11, color: theme.textMuted }}>{meal.time}</span>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(meal.id); }} style={{ background: "none", border: "none", color: theme.textMuted, fontSize: 18 }}>✕</button>
      </div>
      
      {/* DETALLES DESPLEGABLES */}
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${theme.border}`, animation: "fadeIn 0.3s ease" }}>
          {meal.ingredientes && <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12, fontStyle: "italic" }}>🥄 {meal.ingredientes}</p>}
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            <div style={{ textAlign: "center" }}><span style={{ display: "block", color: theme.protein, fontWeight: 800, fontSize: 13 }}>{meal.p}g</span><span style={{ fontSize: 10, color: theme.textMuted }}>Proteínas</span></div>
            <div style={{ textAlign: "center" }}><span style={{ display: "block", color: theme.carbs, fontWeight: 800, fontSize: 13 }}>{meal.c}g</span><span style={{ fontSize: 10, color: theme.textMuted }}>Carbos</span></div>
            <div style={{ textAlign: "center" }}><span style={{ display: "block", color: theme.fat, fontWeight: 800, fontSize: 13 }}>{meal.g}g</span><span style={{ fontSize: 10, color: theme.textMuted }}>Grasas</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PANTALLA 1: DASHBOARD (INICIO CON CATEGORÍAS Y AGUA) ───────────────────
function InicioScreen({ meals, setMeals, water, setWater, targetKcal, selectedDate, setSelectedDate, openProfile, avatar, openScannerWithCategory, openCoach }) {
  const weekDays = generarSemana();
  const dayMeals = meals.filter(m => m.date === selectedDate);
  const totalKcal = dayMeals.reduce((a, m) => a + m.kcal, 0);

  // Agrupación por categorías (si no tiene tipo, lo manda a Snacks por defecto)
  const getMealsByType = (type) => dayMeals.filter(m => (m.type || 'snack') === type);
  const cats = [
    { id: "desayuno", label: "Desayuno", icon: "☕", color: theme.accent },
    { id: "almuerzo", label: "Almuerzo", icon: "🥗", color: theme.success },
    { id: "cena", label: "Cena", icon: "🥩", color: theme.energy },
    { id: "snack", label: "Snacks", icon: "🍎", color: theme.fat }
  ];

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Header y Perfil */}
      <div style={{ padding: "40px 24px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: theme.text, margin: 0, background: `linear-gradient(to right, ${theme.text}, ${theme.textMuted})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Meta 10kg</h1>
          <p style={{ fontSize: 14, color: theme.textMuted, margin: "4px 0 0 0", fontWeight: 500 }}>Tu evolución inteligente</p>
        </div>
        <button onClick={openProfile} style={{ width: 48, height: 48, borderRadius: "24px", background: theme.card, border: `2px solid ${theme.accent}`, overflow: "hidden", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {avatar ? <img src={avatar} alt="Perfil" style={{width: "100%", height: "100%", objectFit: "cover"}} /> : <span style={{fontSize: 24}}>👤</span>}
        </button>
      </div>

      {/* Calendario */}
      <div style={{ display: "flex", overflowX: "auto", gap: "12px", padding: "0 24px 20px", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {weekDays.map((d, i) => (
          <div key={i} onClick={() => setSelectedDate(d.fechaStr)} style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 56, height: 72, background: d.fechaStr === selectedDate ? `linear-gradient(135deg, ${theme.accent}, ${theme.water})` : theme.card, borderRadius: "20px", border: `1px solid ${d.fechaStr === selectedDate ? 'transparent' : theme.border}`, cursor: "pointer", transition: "all 0.3s ease" }}>
            <span style={{ fontSize: 11, color: d.fechaStr === selectedDate ? "#fff" : theme.textMuted, fontWeight: 700, marginBottom: 4 }}>{d.diaNombre}</span>
            <span style={{ fontSize: 18, color: d.fechaStr === selectedDate ? "#fff" : theme.text, fontWeight: 900 }}>{d.diaNum}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 24px" }}>
        {/* Resumen Central */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 30 }}>
          <ProgressRing value={totalKcal} max={targetKcal} size={160} stroke={14} color={theme.energy} label={totalKcal} sublabel={`/ ${targetKcal} kcal`} />
        </div>

        {/* AGUA INTERACTIVA ANIMADA */}
        <GlassCard style={{ marginBottom: 24, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: theme.text }}>Agua diaria 💧</span>
            <span style={{ fontSize: 14, color: theme.water, fontWeight: 900 }}>{water} / 8 L</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "4px" }}>
            {[...Array(8)].map((_, i) => {
              const isFilled = i < water;
              return (
                <div key={i} onClick={() => setWater(isFilled ? i : i + 1)} style={{ width: 32, height: 40, borderRadius: "4px 4px 12px 12px", border: `2px solid ${theme.water}`, position: "relative", overflow: "hidden", cursor: "pointer", transform: isFilled ? "scale(1.05)" : "scale(1)", transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: isFilled ? "100%" : "0%", background: `linear-gradient(to top, ${theme.water}, #67E8F9)`, transition: "height 0.4s ease-in-out" }} />
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* BOTÓN COACH IA */}
        <button onClick={openCoach} style={{ width: "100%", padding: "16px", borderRadius: "16px", background: `linear-gradient(135deg, ${theme.fat}, ${theme.accent})`, border: "none", color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: 30, boxShadow: `0 8px 24px ${theme.fat}50` }}>
          <span style={{fontSize: 20}}>🧠</span> Consultar a mi Coach IA
        </button>

        {/* CATEGORÍAS DE COMIDAS */}
        <h3 style={{ fontSize: 18, fontWeight: 800, color: theme.text, marginBottom: 16 }}>Diario de Comidas</h3>
        {cats.map(cat => {
          const catMeals = getMealsByType(cat.id);
          const catKcal = catMeals.reduce((a, m) => a + m.kcal, 0);
          return (
            <GlassCard key={cat.id} style={{ padding: "16px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: catMeals.length > 0 ? 16 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: 20 }}>{cat.icon}</span>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 800, color: theme.text, margin: 0 }}>{cat.label}</h4>
                    <span style={{ fontSize: 12, color: theme.textMuted }}>{catKcal} kcal</span>
                  </div>
                </div>
                <button onClick={() => openScannerWithCategory(cat.id)} style={{ width: 36, height: 36, borderRadius: 18, border: "none", background: `${cat.color}20`, color: cat.color, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>+</button>
              </div>
              {catMeals.map(m => <MealCardPremium key={m.id} meal={m} onDelete={(id) => setMeals(prev => prev.filter(x => x.id !== id))} />)}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

// ─── MODAL COACH IA ─────────────────────────────────────────────────────────
function CoachModal({ onClose, profile, dayMeals, water, targetKcal }) {
  const [feedback, setFeedback] = useState("Analizando tus datos de hoy...");
  
  useEffect(() => {
    getAICoachFeedback(profile, dayMeals, water, targetKcal).then(res => setFeedback(res));
  }, [profile, dayMeals, water, targetKcal]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <GlassCard style={{ width: "90%", maxWidth: 380, padding: "30px", textAlign: "center", background: `linear-gradient(135deg, ${theme.card}, rgba(139, 92, 246, 0.1))` }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🤖</div>
        <h3 style={{ fontSize: 20, fontWeight: 900, color: theme.text, marginBottom: 16 }}>Tu Coach Fitness</h3>
        <div style={{ background: "rgba(0,0,0,0.3)", padding: "20px", borderRadius: "16px", border: `1px solid ${theme.border}`, marginBottom: 24 }}>
          {feedback === "Analizando tus datos de hoy..." ? (
            <p style={{ color: theme.accent, fontStyle: "italic", animation: "pulse 1.5s infinite", margin: 0 }}>{feedback}</p>
          ) : (
            <p style={{ color: theme.text, fontSize: 15, lineHeight: 1.5, margin: 0 }}>"{feedback}"</p>
          )}
        </div>
        <button onClick={onClose} style={{ width: "100%", padding: "16px", borderRadius: "14px", border: "none", background: theme.fat, color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>¡Entendido!</button>
      </GlassCard>
    </div>
  );
}

// ─── PANTALLA DE PROGRESO (CINTURA Y PESO) ──────────────────────────────────
function ProgresoScreen({ weightLogs, setWeightLogs, waistLogs, setWaistLogs, profile, setProfile }) {
  const currentWeight = weightLogs.length > 0 ? weightLogs[0].weight : profile.weight;
  const currentWaist = waistLogs.length > 0 ? waistLogs[0].waist : (profile.waist || 0);

  const handleAddMeasurement = (type) => {
    const isWeight = type === 'weight';
    const input = window.prompt(`Ingresa tu ${isWeight ? 'peso (kg)' : 'cintura (cm)'} actual:`, isWeight ? currentWeight : currentWaist);
    if (input && !isNaN(input)) {
      const val = Number(input);
      if (isWeight) {
        setWeightLogs(prev => [{ date: getHoyStr(), weight: val }, ...prev]);
        setProfile(p => ({ ...p, weight: val }));
      } else {
        setWaistLogs(prev => [{ date: getHoyStr(), waist: val }, ...prev]);
        setProfile(p => ({ ...p, waist: val }));
      }
    }
  };

  return (
    <div style={{ padding: "40px 24px 120px" }}>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: theme.text, marginBottom: 24 }}>Medidas y Evolución</h2>
      
      {/* TARJETAS DE MEDIDAS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <GlassCard style={{ textAlign: "center", padding: "20px 12px" }}>
          <span style={{ fontSize: 12, color: theme.textMuted, fontWeight: 700, display: "block", marginBottom: 8 }}>Peso Actual ⚖️</span>
          <span style={{ fontSize: 26, fontWeight: 900, color: theme.text }}>{currentWeight}<span style={{fontSize: 14}}>kg</span></span>
          <button onClick={() => handleAddMeasurement('weight')} style={{ marginTop: 12, padding: "8px", width: "100%", borderRadius: "8px", border: "none", background: theme.accent, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Actualizar</button>
        </GlassCard>
        
        <GlassCard style={{ textAlign: "center", padding: "20px 12px" }}>
          <span style={{ fontSize: 12, color: theme.textMuted, fontWeight: 700, display: "block", marginBottom: 8 }}>Cintura 📏</span>
          <span style={{ fontSize: 26, fontWeight: 900, color: theme.text }}>{currentWaist > 0 ? currentWaist : '--'}<span style={{fontSize: 14}}>cm</span></span>
          <button onClick={() => handleAddMeasurement('waist')} style={{ marginTop: 12, padding: "8px", width: "100%", borderRadius: "8px", border: "none", background: theme.fat, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Medir</button>
        </GlassCard>
      </div>

      {/* HISTORIALES */}
      <h3 style={{ fontSize: 18, fontWeight: 800, color: theme.text, marginBottom: 16 }}>Historial de Peso</h3>
      <GlassCard style={{ padding: "8px 20px", marginBottom: 24 }}>
        {weightLogs.length === 0 ? <p style={{color:theme.textMuted, fontSize:12}}>Sin registros</p> : weightLogs.map((log, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: i === weightLogs.length - 1 ? "none" : `1px solid ${theme.border}` }}>
            <span style={{ fontSize: 14, color: theme.textMuted, fontWeight: 600 }}>{log.date}</span>
            <span style={{ fontSize: 16, color: theme.text, fontWeight: 800 }}>{log.weight} kg</span>
          </div>
        ))}
      </GlassCard>

      <h3 style={{ fontSize: 18, fontWeight: 800, color: theme.text, marginBottom: 16 }}>Historial de Cintura</h3>
      <GlassCard style={{ padding: "8px 20px" }}>
        {waistLogs.length === 0 ? <p style={{color:theme.textMuted, fontSize:12}}>Sin registros</p> : waistLogs.map((log, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: i === waistLogs.length - 1 ? "none" : `1px solid ${theme.border}` }}>
            <span style={{ fontSize: 14, color: theme.textMuted, fontWeight: 600 }}>{log.date}</span>
            <span style={{ fontSize: 16, color: theme.text, fontWeight: 800 }}>{log.waist} cm</span>
          </div>
        ))}
      </GlassCard>
    </div>
  );
}

// ─── OTROS COMPONENTES EXISTENTES REUTILIZADOS ──────────────────────────────
function ProfileModal({ onClose, profile, setProfile, avatar, setAvatar }) {
  // (Mismo componente de Perfil del código anterior para mantener IMC)
  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });
  const InputStyle = { width: "100%", padding: "12px", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: `1px solid ${theme.border}`, color: theme.text, fontSize: 14, marginTop: 4, outline: "none" };
  const fileInputRef = useRef(null);
  const handleAvatarChange = (e) => { const file = e.target.files[0]; if (file) setAvatar(URL.createObjectURL(file)); };

  const peso = parseFloat(profile.weight) || 0; const alturaMts = (parseFloat(profile.height) || 1) / 100;
  const imc = (peso / (alturaMts * alturaMts)).toFixed(1);
  let imcStatus = "Normal"; let imcColor = theme.success;
  if (imc < 18.5) { imcStatus = "Bajo peso"; imcColor = theme.water; } else if (imc >= 25 && imc < 30) { imcStatus = "Sobrepeso"; imcColor = theme.carbs; } else if (imc >= 30) { imcStatus = "Obesidad"; imcColor = theme.protein; }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <GlassCard style={{ width: "90%", maxWidth: 380, maxHeight: "85vh", overflowY: "auto", padding: "30px 20px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -20 }}><button onClick={onClose} style={{ background: "none", border: "none", color: theme.textMuted, fontSize: 20 }}>✕</button></div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <div onClick={() => fileInputRef.current.click()} style={{ width: 90, height: 90, borderRadius: "45px", background: theme.card, border: `2px solid ${theme.accent}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer", position: "relative" }}>
            {avatar ? <img src={avatar} alt="Avatar" style={{width: "100%", height: "100%", objectFit: "cover"}} /> : <span style={{fontSize: 40}}>📷</span>}
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleAvatarChange} />
          <h3 style={{ fontSize: 20, fontWeight: 900, color: theme.text, margin: "12px 0 4px" }}>Tu Perfil</h3>
        </div>
        <div style={{ background: `linear-gradient(135deg, ${imcColor}20, transparent)`, border: `1px solid ${imcColor}40`, borderRadius: "16px", padding: "16px", textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 12, color: theme.textMuted, fontWeight: 700 }}>IMC</span>
          <div style={{ fontSize: 32, fontWeight: 900, color: imcColor, margin: "4px 0" }}>{imc}</div>
          <span style={{ fontSize: 12, fontWeight: 800, background: imcColor, color: "#fff", padding: "4px 10px", borderRadius: "8px" }}>{imcStatus}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted }}>Peso (kg)</label><input type="number" name="weight" value={profile.weight} onChange={handleChange} style={InputStyle} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted }}>Altura (cm)</label><input type="number" name="height" value={profile.height} onChange={handleChange} style={InputStyle} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted }}>Edad</label><input type="number" name="age" value={profile.age} onChange={handleChange} style={InputStyle} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted }}>Sexo</label><select name="gender" value={profile.gender} onChange={handleChange} style={InputStyle}><option value="M">Hombre</option><option value="F">Mujer</option></select></div>
        </div>
        <div style={{ marginBottom: "12px" }}><label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted }}>Actividad</label><select name="activity" value={profile.activity} onChange={handleChange} style={InputStyle}><option value="1.2">Sedentario</option><option value="1.375">Ligero</option><option value="1.55">Moderado</option><option value="1.725">Fuerte</option></select></div>
        <div style={{ marginBottom: "20px" }}><label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted }}>Objetivo</label><select name="goal" value={profile.goal} onChange={handleChange} style={InputStyle}><option value="lose">Déficit (Bajar)</option><option value="maintain">Mantenimiento</option><option value="gain">Superávit (Subir)</option></select></div>
        <button onClick={onClose} style={{ width: "100%", padding: "16px", background: theme.accent, border: "none", borderRadius: "12px", color: "white", fontWeight: 800 }}>Guardar Perfil</button>
      </GlassCard>
    </div>
  );
}

function PhotoAnalysisModal({ onClose, onAdd, targetDate, category }) {
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

  const handleQuickManual = () => {
    const input = window.prompt(`Ingresa calorías manuales para ${category}:`);
    if (input && !isNaN(input)) {
      onAdd({ id: Date.now(), date: targetDate, type: category, name: "Agregado Manual", ingredientes: "Sin descripción", time: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }), kcal: Number(input), p: 0, c: 0, g: 0, emoji: "⚡" });
      onClose();
    }
  };

  const handleAdd = () => {
    onAdd({ id: Date.now(), date: targetDate, type: category, name: result.nombre, ingredientes: result.ingredientes, time: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }), kcal: Number(result.calorias)||0, p: Number(result.proteinas)||0, c: Number(result.carbohidratos)||0, g: Number(result.grasas)||0, emoji: result.emoji || "🍽️", imageUrl });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: theme.bg, borderRadius: "32px 32px 0 0", padding: "32px 24px", width: "100%", maxWidth: 430, paddingBottom: 50, borderTop: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
        <input ref={galleryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
        
        {stage === "select" && (
          <>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: theme.text, marginBottom: 8, textAlign: "center", textTransform: "capitalize" }}>Añadir a {category}</h3>
            <p style={{ fontSize: 14, color: theme.textMuted, marginBottom: 24, textAlign: "center" }}>La IA identificará macros e ingredientes.</p>
            <div style={{ display: "flex", gap: "12px", marginBottom: 12 }}>
              <button onClick={() => cameraRef.current.click()} style={{ flex: 1, padding: "20px", borderRadius: "20px", border: "none", background: `linear-gradient(135deg, ${theme.accent}, ${theme.water})`, color: "white", fontSize: 16, fontWeight: 800, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><span style={{fontSize: 28}}>📷</span> Cámara</button>
              <button onClick={() => galleryRef.current.click()} style={{ flex: 1, padding: "20px", borderRadius: "20px", border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 16, fontWeight: 800, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><span style={{fontSize: 28}}>🖼️</span> Galería</button>
            </div>
            <button onClick={handleQuickManual} style={{ width: "100%", padding: "16px", borderRadius: "16px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.text, fontWeight: 700 }}>⚡ Agregar Calorías Manuales</button>
          </>
        )}
        
        {stage === "analyzing" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: theme.text, animation: "pulse 1.5s infinite" }}>Analizando con IA...</h3>
          </div>
        )}

        {stage === "result" && result && (
           <div style={{ textAlign: "center" }}>
             <h3 style={{ fontSize: 20, fontWeight: 800, color: theme.text, marginBottom: 4 }}>{result.nombre}</h3>
             <p style={{ fontSize: 12, color: theme.textMuted, margin: "0 0 8px", fontStyle: "italic" }}>{result.ingredientes}</p>
             <div style={{ fontSize: 48, fontWeight: 900, color: theme.energy, margin: "16px 0" }}>{result.calorias} <span style={{fontSize:16, color: theme.textMuted}}>kcal</span></div>
             <button onClick={handleAdd} style={{ width: "100%", padding: "18px", borderRadius: "16px", border: "none", background: theme.success, color: "white", fontSize: 16, fontWeight: 800 }}>✓ Guardar en {category}</button>
           </div>
        )}
      </div>
    </div>
  );
}

function StatsScreen() { return <div style={{ padding: "40px 24px" }}><h2 style={{ fontSize: 28, fontWeight: 900, color: theme.text }}>Estadísticas</h2><p style={{color: theme.textMuted}}>Próximamente.</p></div>; }
function EjerciciosScreen() { return <div style={{ padding: "40px 24px" }}><h2 style={{ fontSize: 28, fontWeight: 900, color: theme.text }}>Rutinas</h2><p style={{color: theme.textMuted}}>Próximamente.</p></div>; }

// ─── APLICACIÓN PRINCIPAL ───────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("inicio");
  const [showProfile, setShowProfile] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [scannerConfig, setScannerConfig] = useState({ open: false, category: 'snack' });
  const [selectedDate, setSelectedDate] = useState(getHoyStr());
  
  const [avatar, setAvatar] = useState(() => localStorage.getItem("m10_avatar") || null);
  const [meals, setMeals] = useState(() => JSON.parse(localStorage.getItem("m10_meals")) || []);
  const [water, setWater] = useState(() => Number(localStorage.getItem("m10_water")) || 0);
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem("m10_profile")) || { weight: 85, initialWeight: 85, height: 175, age: 20, gender: 'M', activity: 1.2, goal: 'lose', waist: 0 });
  const [weightLogs, setWeightLogs] = useState(() => JSON.parse(localStorage.getItem("m10_weights")) || [{ date: getHoyStr(), weight: 85 }]);
  const [waistLogs, setWaistLogs] = useState(() => JSON.parse(localStorage.getItem("m10_waist")) || []);

  const targetKcal = Math.round(((10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + (profile.gender === 'M' ? 5 : -161)) * parseFloat(profile.activity)) + (profile.goal === 'lose' ? -500 : profile.goal === 'gain' ? 500 : 0);

  useEffect(() => { localStorage.setItem("m10_avatar", avatar); }, [avatar]);
  useEffect(() => { localStorage.setItem("m10_meals", JSON.stringify(meals)); }, [meals]);
  useEffect(() => { localStorage.setItem("m10_water", water.toString()); }, [water]);
  useEffect(() => { localStorage.setItem("m10_profile", JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem("m10_weights", JSON.stringify(weightLogs)); }, [weightLogs]);
  useEffect(() => { localStorage.setItem("m10_waist", JSON.stringify(waistLogs)); }, [waistLogs]);

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", width: "100%", maxWidth: 430, margin: "0 auto", position: "relative", fontFamily: "system-ui, -apple-system, sans-serif", overflowX: "hidden" }}>
      {scannerConfig.open && <PhotoAnalysisModal onClose={() => setScannerConfig({ open: false, category: 'snack' })} onAdd={(m) => setMeals([m, ...meals])} targetDate={selectedDate} category={scannerConfig.category} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} profile={profile} setProfile={setProfile} avatar={avatar} setAvatar={setAvatar} />}
      {showCoach && <CoachModal onClose={() => setShowCoach(false)} profile={profile} dayMeals={meals.filter(m => m.date === selectedDate)} water={water} targetKcal={targetKcal} />}
      
      {activeTab === "inicio" && <InicioScreen meals={meals} setMeals={setMeals} water={water} setWater={setWater} targetKcal={targetKcal} selectedDate={selectedDate} setSelectedDate={setSelectedDate} openProfile={() => setShowProfile(true)} avatar={avatar} openScannerWithCategory={(cat) => setScannerConfig({ open: true, category: cat })} openCoach={() => setShowCoach(true)} />}
      {activeTab === "estadisticas" && <StatsScreen />}
      {activeTab === "ejercicios" && <EjerciciosScreen />}
      {activeTab === "progreso" && <ProgresoScreen weightLogs={weightLogs} setWeightLogs={setWeightLogs} waistLogs={waistLogs} setWaistLogs={setWaistLogs} profile={profile} setProfile={setProfile} />}

      {/* FLOATING BOTTOM NAV PREMIUM */}
      <nav style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", width: "90%", maxWidth: 390, height: 72, background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", borderRadius: "36px", border: `1px solid ${theme.border}`, zIndex: 90, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
        {NAV_ITEMS.map((item) => {
          if (item.isCenter) return (
            <div key={item.id} style={{ position: "relative", top: -24 }}>
              <button onClick={() => { setSelectedDate(getHoyStr()); setScannerConfig({ open: true, category: 'snack' }); }} style={{ width: 64, height: 64, borderRadius: 32, background: `linear-gradient(135deg, ${theme.accent}, ${theme.water})`, border: "none", color: "white", fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: `0 8px 24px ${theme.accent}60`, transition: "transform 0.2s" }}>{item.icon}</button>
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
