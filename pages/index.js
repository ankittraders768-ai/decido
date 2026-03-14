import { useState, useEffect, useRef } from "react";
import Head from "next/head";

async function callAI(system, user) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user }),
  });
  if (!res.ok) throw new Error("API error " + res.status);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}

function pj(t) {
  try {
    const m = t.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; }
}

const EXAMPLES = {
  analyze: ["Should I quit my job?", "Should I move to another city?", "Should I start freelancing?"],
  compare: ["iPhone 15 vs Samsung S24", "Job A vs Job B", "Rent vs Buy a house"],
  roast:   ["Should I text my ex?", "Should I quit my job on a whim?", "Should I eat the whole pizza?"],
};

const LOADING_MSGS = [
  "Parsing your decision…",
  "Evaluating risk factors…",
  "Running probability models…",
  "Synthesizing insights…",
  "Writing your verdict…",
];

// ── Score Ring ──
function Ring({ score, size = 130 }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const [off, setOff] = useState(circ);
  useEffect(() => {
    const t = setTimeout(() => setOff(circ * (1 - score / 100)), 150);
    return () => clearTimeout(t);
  }, [score, circ]);
  return (
    <div style={{ position:"relative", width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="9" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
          style={{ transition:"stroke-dashoffset 1.4s cubic-bezier(.34,1.56,.64,1)", filter:`drop-shadow(0 0 8px ${color}77)` }} />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", animation:"spop .5s .3s ease both" }}>
        <span style={{ fontFamily:"'Unbounded',sans-serif", fontSize:size>110?34:22, fontWeight:900, color, lineHeight:1 }}>{score}</span>
        <span style={{ fontSize:10, color:"rgba(240,238,255,.3)", fontWeight:600, marginTop:2 }}>/100</span>
      </div>
    </div>
  );
}

// ── Animated Bar ──
function Bar({ value, color, label, sub }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(value), 200); return () => clearTimeout(t); }, [value]);
  return (
    <div style={{ marginBottom:12 }}>
      {label && (
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ fontSize:13, color:"rgba(240,238,255,.55)" }}>{label}</span>
          <span style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13, fontWeight:700, color }}>{value}%{sub?` ${sub}`:""}</span>
        </div>
      )}
      <div className="bar-t">
        <div style={{ height:"100%", borderRadius:100, width:`${w}%`, background:`linear-gradient(90deg,${color}88,${color})`, transition:"width 1.3s cubic-bezier(.34,1.56,.64,1)" }} />
      </div>
    </div>
  );
}

// ── Loading Screen ──
function LoadingScreen() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i+1) % LOADING_MSGS.length), 2200);
    return () => clearInterval(t);
  }, []);
  const S = 140;
  const rings = [
    { sz:S,    col:"rgba(139,92,246,.45)", a:"sp 8s linear infinite"  },
    { sz:S-22, col:"rgba(167,139,250,.4)", a:"spr 5s linear infinite" },
    { sz:S-46, col:"rgba(196,181,253,.5)", a:"sp 3s linear infinite"  },
    { sz:S-72, col:"rgba(167,139,250,.7)", a:"spr 1.8s linear infinite" },
  ];
  return (
    <div className="scr" style={{ justifyContent:"center", alignItems:"center" }}>
      <div style={{ position:"relative", width:S, height:S, marginBottom:44 }}>
        {rings.map((ring, i) => {
          const off = (S - ring.sz) / 2;
          return <div key={i} style={{ position:"absolute", top:off, left:off, width:ring.sz, height:ring.sz, borderRadius:"50%", border:"2px solid rgba(255,255,255,.05)", borderTopColor:ring.col, animation:ring.a }} />;
        })}
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:16, height:16, borderRadius:"50%", background:"radial-gradient(circle,#a78bfa,#6d28d9)", boxShadow:"0 0 18px rgba(167,139,250,.8)", animation:"pd 1.5s ease-in-out infinite" }} />
      </div>
      <p style={{ fontFamily:"'Unbounded',sans-serif", fontSize:12, color:"#a78bfa", letterSpacing:".08em", fontWeight:600, marginBottom:20 }} key={idx}>
        {LOADING_MSGS[idx]}
      </p>
      <div style={{ display:"flex", gap:6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"rgba(167,139,250,.5)", animation:`db 1.2s ${i*.2}s ease-in-out infinite` }} />
        ))}
      </div>
    </div>
  );
}

// ── Home Screen ──
function HomeScreen({ onStart }) {
  const [mode, setMode] = useState("analyze");
  const [dec,  setDec]  = useState("");
  const [oa,   setOa]   = useState("");
  const [ob,   setOb]   = useState("");
  const canGo = mode === "compare" ? oa.trim() && ob.trim() : dec.trim();

  const go = () => {
    if (!canGo) return;
    onStart({ mode, decision: mode==="compare" ? `${oa} vs ${ob}` : dec, optA:oa, optB:ob });
  };

  const useExample = (t) => {
    if (mode === "compare") {
      const p = t.split(" vs ");
      if (p.length === 2) { setOa(p[0]); setOb(p[1]); } else setDec(t);
    } else setDec(t);
  };

  return (
    <div className="scr" style={{ justifyContent:"center" }}>
      <div className="w" style={{ animation:"fiu .5s ease both" }}>

        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ marginBottom:14 }}>
            <span className="logo">DECIDO</span><span className="logo-dot" />
          </div>
          <h1 style={{ fontFamily:"'Unbounded',sans-serif", fontSize:36, fontWeight:900, lineHeight:1.1, letterSpacing:-1, background:"linear-gradient(135deg,#f0eeff 0%,#c4b5fd 55%,#7c3aed 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", marginBottom:12 }}>
            Your AI<br/>Decision Maker
          </h1>
          <p style={{ fontSize:14, color:"rgba(240,238,255,.42)", lineHeight:1.65 }}>
            Get a clear <strong style={{ color:"#a78bfa" }}>YES or NO</strong> — with full AI analysis.<br/>No more overthinking.
          </p>
        </div>

        <div style={{ marginBottom:18 }}>
          <div className="tabs">
            {[["analyze","⚡ Analyze"],["compare","⚖️ Compare"],["roast","🔥 Roast Me"]].map(([id,label]) => (
              <button key={id} className={`tab${mode===id?" on":""}`}
                onClick={() => { setMode(id); setDec(""); setOa(""); setOb(""); }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="glass" style={{ padding:20, marginBottom:14 }}>
          {mode === "compare" ? (
            <>
              <div className="lbl">Option A</div>
              <input className="inp" placeholder="e.g. iPhone 15 Pro" value={oa} onChange={e=>setOa(e.target.value)} style={{ marginBottom:10 }} />
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <div style={{ flex:1, height:1, background:"rgba(255,255,255,.07)" }} />
                <span style={{ fontSize:11, color:"rgba(240,238,255,.28)", fontWeight:700 }}>VS</span>
                <div style={{ flex:1, height:1, background:"rgba(255,255,255,.07)" }} />
              </div>
              <div className="lbl">Option B</div>
              <input className="inp" placeholder="e.g. Samsung S24 Ultra" value={ob} onChange={e=>setOb(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} />
            </>
          ) : (
            <>
              <div className="lbl">{mode==="roast" ? "What's your questionable idea?" : "What decision are you facing?"}</div>
              <textarea className="inp" rows={3}
                placeholder={mode==="roast" ? "e.g. Should I text my ex at 2am?" : "e.g. Should I quit my job to start a business?"}
                value={dec} onChange={e=>setDec(e.target.value)} style={{ resize:"none" }} />
            </>
          )}
        </div>

        <button className="btn" onClick={go} disabled={!canGo} style={{ marginBottom:16 }}>
          {mode==="roast" ? "🔥 Roast This Decision" : mode==="compare" ? "⚖️ Compare Options" : "⚡ Analyze Decision"}
        </button>

        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:11, color:"rgba(240,238,255,.25)", marginBottom:8 }}>Try an example</p>
          <div>{EXAMPLES[mode].map(ex => <button key={ex} className="chip" onClick={()=>useExample(ex)}>{ex}</button>)}</div>
        </div>

        <p style={{ textAlign:"center", marginTop:40, fontSize:11, color:"rgba(240,238,255,.15)" }}>
          Powered by Groq AI · Decido
        </p>
      </div>
    </div>
  );
}

// ── Questions Screen ──
function QuestionsScreen({ questions, onAnswer, idx }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  const q = questions[idx];
  const prog = (idx / questions.length) * 100;
  useEffect(() => { setVal(""); setTimeout(() => ref.current?.focus(), 60); }, [idx]);
  const submit = () => { if (!val.trim()) return; onAnswer(val.trim()); };

  return (
    <div className="scr" style={{ justifyContent:"center" }}>
      <div className="w">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
          <span className="logo" style={{ fontSize:20 }}>DECIDO</span><span className="logo-dot" style={{ width:6, height:6 }} />
          <span style={{ fontSize:12, color:"rgba(240,238,255,.4)", fontWeight:500 }}>{idx+1} of {questions.length}</span>
        </div>
        <div className="prog-t" style={{ marginBottom:30 }}>
          <div style={{ height:"100%", borderRadius:100, width:`${prog}%`, background:"linear-gradient(90deg,#5b21b6,#a78bfa)", transition:"width .4s ease" }} />
        </div>
        <div key={idx} style={{ animation:"fiu .38s ease both" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:13, marginBottom:22 }}>
            <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, background:"linear-gradient(135deg,#4c1d95,#6d28d9)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:"0 4px 16px rgba(109,40,217,.45)" }}>🤖</div>
            <div className="glass" style={{ padding:16, flex:1, borderRadius:14, borderTopLeftRadius:4 }}>
              <p style={{ fontSize:15, fontWeight:500, lineHeight:1.65, color:"#f0eeff" }}>{q?.text}</p>
            </div>
          </div>
          <textarea ref={ref} className="inp" rows={3} style={{ resize:"none", marginBottom:12 }}
            placeholder={q?.placeholder || "Type your answer…"}
            value={val} onChange={e=>setVal(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit();} }} />
          <button className="btn" onClick={submit} disabled={!val.trim()}>
            {idx < questions.length-1 ? "Continue →" : "Get My Answer ⚡"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Verdict Block ──
function VerdictBlock({ verdict, oneLiner, score }) {
  const isYes = verdict?.startsWith("YES");
  const isNo  = verdict?.startsWith("NO");
  const color = isYes ? "#10b981" : isNo ? "#ef4444" : "#f59e0b";
  const emoji = isYes ? "✅" : isNo ? "❌" : "⚠️";
  return (
    <div style={{ padding:24, borderRadius:18, background:`${color}0f`, border:`1px solid ${color}30`, marginBottom:14, textAlign:"center" }}>
      <div style={{ fontSize:44, marginBottom:10 }}>{emoji}</div>
      <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:28, fontWeight:900, color, marginBottom:12, display:"inline-block", padding:"6px 22px", borderRadius:10, background:`${color}15`, animation:"vpop .5s .1s ease both" }}>
        {verdict}
      </div>
      <p style={{ fontSize:15, color:"rgba(240,238,255,.9)", fontWeight:600, lineHeight:1.55, marginBottom:16 }}>{oneLiner}</p>
      <div style={{ display:"inline-flex", alignItems:"center", gap:14 }}>
        <Ring score={score} size={100} />
        <div style={{ textAlign:"left" }}>
          <p style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(240,238,255,.32)", marginBottom:4 }}>Decision Score</p>
          <p style={{ fontSize:14, color, fontWeight:700 }}>{score>=70?"Strong choice ✓":score>=50?"Moderate choice":"Risky choice ⚠"}</p>
        </div>
      </div>
    </div>
  );
}

// ── Analysis Result ──
function AnalysisResult({ r, onReset }) {
  const rColor = { Low:"#10b981", Medium:"#f59e0b", High:"#ef4444", Catastrophic:"#dc2626" }[r.riskLevel] || "#f59e0b";
  return (
    <div className="scr">
      <div className="w">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <span className="logo" style={{ fontSize:20 }}>DECIDO</span><span className="logo-dot" style={{ width:6, height:6 }} />
          <button className="btn-sm" onClick={onReset}>+ New Decision</button>
        </div>
        <div className="au"><VerdictBlock verdict={r.verdict} oneLiner={r.oneLiner} score={r.score} /></div>
        <div style={{ padding:22, borderRadius:16, background:"rgba(109,40,217,.13)", border:"1px solid rgba(167,139,250,.28)", borderLeft:"3px solid #a78bfa", marginBottom:14, animation:"fiu .4s .06s ease both" }}>
          <p className="lbl">🎯 The Bottom Line</p>
          <p style={{ fontSize:15, fontWeight:600, lineHeight:1.8, color:"#f0eeff" }}>{r.finalAnswer}</p>
        </div>
        <div className="glass" style={{ padding:16, marginBottom:14, display:"flex", animation:"fiu .4s .1s ease both" }}>
          {[
            { label:"AI Confidence", val:`${r.confidence}%`,        color:"#a78bfa"  },
            { label:"Risk Level",    val:r.riskLevel,                color:rColor     },
            { label:"Success Rate",  val:`${r.successProbability}%`, color:"#10b981"  },
          ].map((s,i) => (
            <div key={i} style={{ flex:1, textAlign:"center", padding:"4px 6px", borderLeft:i>0?"1px solid rgba(255,255,255,.07)":"none" }}>
              <p style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(240,238,255,.3)", marginBottom:5 }}>{s.label}</p>
              <p style={{ fontFamily:"'Unbounded',sans-serif", fontSize:i===1?14:20, fontWeight:800, color:s.color }}>{s.val}</p>
            </div>
          ))}
        </div>
        <div className="glass" style={{ padding:16, marginBottom:14, animation:"fiu .4s .14s ease both" }}>
          <div className="lbl">⏳ Future Regret Predictor</div>
          <Bar value={r.successProbability} color="#10b981" label="If you go for it"       sub="satisfied" />
          <Bar value={r.regretProbability}  color="#ef4444" label="If you don't go for it" sub="regret"    />
        </div>
        <div style={{ animation:"fiu .4s .18s ease both", marginBottom:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }} className="grid-2">
            <div>
              <div className="lbl">✅ Pros</div>
              {r.pros?.map((p,i) => <div key={i} className="pro"><div className="ic-p">✓</div><span>{p}</span></div>)}
            </div>
            <div>
              <div className="lbl">❌ Cons</div>
              {r.cons?.map((c,i) => <div key={i} className="con"><div className="ic-n">✕</div><span>{c}</span></div>)}
            </div>
          </div>
        </div>
        <button className="btn" onClick={onReset}>Make Another Decision</button>
      </div>
    </div>
  );
}

// ── Compare Result ──
function CompareResult({ r, onReset }) {
  const winA = r.winner === "optionA";
  const OptCard = ({ opt, isWin, delay }) => {
    const c  = opt.score>=70?"#10b981":opt.score>=50?"#f59e0b":"#ef4444";
    const rc = { Low:"#10b981", Medium:"#f59e0b", High:"#ef4444" }[opt.riskLevel]||"#f59e0b";
    return (
      <div className={isWin?"glass-p":"glass"} style={{ flex:1, padding:16, borderRadius:16, position:"relative", marginTop:isWin?14:0, animation:`fiu .4s ${delay}s ease both` }}>
        {isWin && <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:"linear-gradient(135deg,#5b21b6,#a78bfa)", padding:"3px 12px", borderRadius:100, fontSize:9, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:"#fff", whiteSpace:"nowrap" }}>👑 WINNER</div>}
        <p style={{ fontSize:11, fontWeight:700, color:isWin?"rgba(167,139,250,.9)":"rgba(240,238,255,.4)", textAlign:"center", marginBottom:10, marginTop:isWin?6:0 }}>{opt.name}</p>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}><Ring score={opt.score} size={100} /></div>
        <div style={{ fontSize:10, color:"rgba(240,238,255,.32)", marginBottom:5 }}>Risk: <span style={{ color:rc, fontWeight:700 }}>{opt.riskLevel}</span></div>
        <Bar value={opt.riskScore} color={rc} />
        <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", paddingTop:10, marginTop:6 }}>
          {opt.pros?.slice(0,2).map((p,i) => <div key={i} style={{ display:"flex", gap:5, marginBottom:4 }}><span style={{ color:"#10b981", fontSize:10, marginTop:2 }}>✓</span><span style={{ fontSize:11, color:"rgba(240,238,255,.75)", lineHeight:1.45 }}>{p}</span></div>)}
          {opt.cons?.slice(0,2).map((cv,i) => <div key={i} style={{ display:"flex", gap:5, marginBottom:4 }}><span style={{ color:"#ef4444", fontSize:10, marginTop:2 }}>✕</span><span style={{ fontSize:11, color:"rgba(240,238,255,.75)", lineHeight:1.45 }}>{cv}</span></div>)}
        </div>
        {opt.longTerm && <div style={{ marginTop:8, padding:"8px 10px", background:"rgba(255,255,255,.03)", borderRadius:8, fontSize:11, color:"rgba(240,238,255,.45)", lineHeight:1.45 }}>📈 {opt.longTerm}</div>}
      </div>
    );
  };
  return (
    <div className="scr">
      <div className="w">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
          <span className="logo" style={{ fontSize:20 }}>DECIDO</span><span className="logo-dot" style={{ width:6, height:6 }} />
          <button className="btn-sm" onClick={onReset}>+ New</button>
        </div>
        <div style={{ padding:20, borderRadius:16, background:"rgba(109,40,217,.13)", border:"1px solid rgba(167,139,250,.28)", borderLeft:"3px solid #a78bfa", marginBottom:18, animation:"fiu .35s ease both" }}>
          <p className="lbl">🎯 Final Answer</p>
          <p style={{ fontSize:16, fontWeight:700, lineHeight:1.7, color:"#f0eeff" }}>{r.finalAnswer}</p>
          {r.confidence && <p style={{ fontSize:11, color:"rgba(167,139,250,.5)", marginTop:10 }}>AI Confidence: {r.confidence}%</p>}
        </div>
        <div style={{ display:"flex", gap:12, marginBottom:16, alignItems:"flex-start" }}>
          <OptCard opt={r.optionA} isWin={winA}  delay={.1} />
          <OptCard opt={r.optionB} isWin={!winA} delay={.18} />
        </div>
        <button className="btn" onClick={onReset}>Make Another Decision</button>
      </div>
    </div>
  );
}

// ── Roast Result ──
function RoastResult({ r, onReset }) {
  const statusMap = {
    "ABORT MISSION":        { bg:"rgba(239,68,68,.1)",   bd:"rgba(239,68,68,.3)",   c:"#ef4444", em:"🚨" },
    "PROCEED WITH CAUTION": { bg:"rgba(245,158,11,.09)", bd:"rgba(245,158,11,.3)",  c:"#f59e0b", em:"⚠️" },
    "SURPRISINGLY VALID":   { bg:"rgba(16,185,129,.09)", bd:"rgba(16,185,129,.25)", c:"#10b981", em:"✅" },
    "GREEN LIGHT":          { bg:"rgba(16,185,129,.09)", bd:"rgba(16,185,129,.25)", c:"#10b981", em:"🟢" },
  };
  const key = Object.keys(statusMap).find(k => r.missionStatus?.includes(k)) || "ABORT MISSION";
  const s = statusMap[key];
  const rc = { Low:"#10b981", Medium:"#f59e0b", High:"#ef4444", Catastrophic:"#dc2626" }[r.riskLevel]||"#f59e0b";
  const rw = { Low:20, Medium:52, High:80, Catastrophic:96 };
  return (
    <div className="scr">
      <div className="w">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <span className="logo" style={{ fontSize:20 }}>DECIDO</span><span className="logo-dot" style={{ width:6, height:6 }} />
          <button className="btn-sm" onClick={onReset}>+ New</button>
        </div>
        <div style={{ padding:22, borderRadius:18, background:s.bg, border:`1px solid ${s.bd}`, textAlign:"center", marginBottom:14, animation:"fiu .38s ease both" }}>
          <div style={{ fontSize:44, marginBottom:10 }}>{s.em}</div>
          <div style={{ display:"inline-block", padding:"8px 20px", borderRadius:100, background:`${s.c}18`, border:`1px solid ${s.bd}`, color:s.c, fontFamily:"'Unbounded',sans-serif", fontSize:11, fontWeight:700, letterSpacing:".07em", marginBottom:14 }}>{r.missionStatus}</div>
          <p style={{ fontFamily:"'Unbounded',sans-serif", fontSize:17, fontWeight:700, color:"#f0eeff", lineHeight:1.3 }}>{r.verdict}</p>
        </div>
        <div style={{ padding:18, borderRadius:14, borderLeft:"3px solid #f59e0b", background:"rgba(245,158,11,.05)", fontSize:14, lineHeight:1.8, color:"rgba(240,238,255,.85)", fontStyle:"italic", marginBottom:14, animation:"fiu .4s .08s ease both" }}>
          "{r.roastLine}"
        </div>
        <div className="glass" style={{ padding:14, marginBottom:14, animation:"fiu .4s .12s ease both" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:12, color:"rgba(240,238,255,.5)" }}>Risk Level</span>
            <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:100, background:`${rc}18`, border:`1px solid ${rc}30`, color:rc }}>{r.riskLevel}</span>
          </div>
          <Bar value={rw[r.riskLevel]||50} color={rc} />
        </div>
        {r.silverLinings?.length > 0 && (
          <div style={{ marginBottom:13, animation:"fiu .4s .16s ease both" }}>
            <div className="lbl">😬 Silver Linings</div>
            {r.silverLinings.map((p,i) => <div key={i} className="pro"><div className="ic-p">✓</div><span>{p}</span></div>)}
          </div>
        )}
        {r.realityCheck?.length > 0 && (
          <div style={{ marginBottom:22, animation:"fiu .4s .2s ease both" }}>
            <div className="lbl">💀 Reality Check</div>
            {r.realityCheck.map((c,i) => <div key={i} className="con"><div className="ic-n">✕</div><span>{c}</span></div>)}
          </div>
        )}
        <button className="btn" onClick={onReset}>🔥 Roast Another Decision</button>
      </div>
    </div>
  );
}

// ── Toast ──
function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 6000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background:"rgba(239,68,68,.13)", border:"1px solid rgba(239,68,68,.32)", borderRadius:12, padding:"12px 22px", fontSize:13, color:"#ef4444", fontWeight:500, zIndex:999, whiteSpace:"nowrap", maxWidth:"90vw", textAlign:"center" }}>
      {msg}
      <button onClick={onClose} style={{ marginLeft:10, background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:18 }}>×</button>
    </div>
  );
}

// ── Main App ──
export default function Decido() {
  const [screen, setScreen] = useState("home");
  const [ctx,    setCtx]    = useState({});
  const [qs,     setQs]     = useState([]);
  const [qi,     setQi]     = useState(0);
  const [answers,setAns]    = useState({});
  const [result, setResult] = useState(null);
  const [toast,  setToast]  = useState("");

  const showErr = (msg) => { setToast(msg); setScreen("home"); };
  const reset   = () => { setScreen("home"); setCtx({}); setQs([]); setQi(0); setAns({}); setResult(null); };

  const handleStart = async ({ mode, decision, optA, optB }) => {
    setCtx({ mode, decision, optA, optB });
    setScreen("loading");

    if (mode === "roast") {
      try {
        const t = await callAI(
          "You are a witty AI roaster. Be funny and sharp but never mean. Always return ONLY valid JSON with no extra text or markdown.",
          `Roast this decision: "${decision}"\n\nReturn ONLY this JSON object:\n{"verdict":"YES or NO — one bold sentence","silverLinings":["funny optimistic take 1","take 2"],"realityCheck":["brutal truth 1","truth 2","truth 3"],"roastLine":"Savage but funny 2-sentence roast","riskLevel":"Low","missionStatus":"ABORT MISSION"}`
        );
        const r = pj(t);
        if (r) { setResult({ type:"roast", ...r }); setScreen("results"); }
        else showErr("AI returned an unexpected response. Please try again.");
      } catch(e) { showErr("Something went wrong: " + e.message); }
      return;
    }

    try {
      const t = await callAI(
        "You are a decision analysis AI. Always return ONLY valid JSON with no extra text, explanation, or markdown code blocks.",
        `The user is deciding: "${decision}"\n\nGenerate exactly 3 smart clarifying questions to better understand their situation.\n\nReturn ONLY this JSON:\n{"questions":[{"id":"q1","text":"Your first question here?","placeholder":"short example answer"},{"id":"q2","text":"Your second question here?","placeholder":"short example answer"},{"id":"q3","text":"Your third question here?","placeholder":"short example answer"}]}`
      );
      const r = pj(t);
      if (r?.questions?.length) {
        setQs(r.questions); setQi(0); setAns({}); setScreen("questions");
      } else showErr("Failed to generate questions. Please try again.");
    } catch(e) { showErr("Something went wrong: " + e.message); }
  };

  const handleAnswer = async (answer) => {
    const q = qs[qi];
    const newAns = { ...answers, [q.id]: answer };
    setAns(newAns);
    if (qi < qs.length - 1) { setQi(qi + 1); return; }

    setScreen("loading");
    const ansText = qs.map(q2 => `Q: ${q2.text}\nA: ${newAns[q2.id] || "Not answered"}`).join("\n\n");

    try {
      if (ctx.mode === "compare") {
        const t = await callAI(
          "You are an elite decision analyst. Always be decisive and pick a clear winner. Return ONLY valid JSON with no extra text or markdown.",
          `Compare these two options for the user:\nOption A: "${ctx.optA}"\nOption B: "${ctx.optB}"\n\nUser's context:\n${ansText}\n\nReturn ONLY this JSON:\n{"optionA":{"name":"${ctx.optA}","score":74,"pros":["pro 1","pro 2","pro 3"],"cons":["con 1","con 2"],"riskLevel":"Low","riskScore":22,"longTerm":"one sentence about 3-year outlook"},"optionB":{"name":"${ctx.optB}","score":61,"pros":["pro 1","pro 2"],"cons":["con 1","con 2","con 3"],"riskLevel":"Medium","riskScore":54,"longTerm":"one sentence about 3-year outlook"},"winner":"optionA","finalAnswer":"Start with GO WITH [NAME]. Then 2-3 specific sentences explaining why based on the user context.","confidence":85}`
        );
        const r = pj(t);
        if (r) { setResult({ type:"compare", ...r }); setScreen("results"); }
        else showErr("AI returned an unexpected response. Please try again.");
      } else {
        const t = await callAI(
          "You are an elite decision analyst. Always start with a clear YES or NO verdict. Return ONLY valid JSON with no extra text or markdown.",
          `The user is deciding: "${ctx.decision}"\n\nTheir answers to clarifying questions:\n${ansText}\n\nReturn ONLY this JSON:\n{"verdict":"YES","score":74,"oneLiner":"One punchy sentence that is the direct answer","pros":["specific pro 1 based on their answers","pro 2","pro 3"],"cons":["specific con 1 based on their answers","con 2"],"riskLevel":"Medium","riskScore":38,"finalAnswer":"3-4 sentences of direct specific advice. Tell them exactly what to do and why. Reference their actual situation. No vague language.","confidence":84,"successProbability":71,"regretProbability":22}`
        );
        const r = pj(t);
        if (r) { setResult({ type:"analyze", ...r }); setScreen("results"); }
        else showErr("AI returned an unexpected response. Please try again.");
      }
    } catch(e) { showErr("Something went wrong: " + e.message); }
  };

  return (
    <>
      <Head>
        <title>Decido — AI Decision Maker</title>
        <meta name="description" content="Get a clear YES or NO on any decision. AI-powered analysis with scores, pros, cons and recommendations." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Decido — AI Decision Maker" />
        <meta property="og:description" content="Stop overthinking. Get a clear YES or NO with full AI analysis. Free." />
        <meta property="og:type" content="website" />
      </Head>
      <div className="root">
        {toast && <Toast msg={toast} onClose={()=>setToast("")} />}
        {screen==="home"      && <HomeScreen onStart={handleStart} />}
        {screen==="questions" && qs.length>0 && <QuestionsScreen questions={qs} onAnswer={handleAnswer} idx={qi} />}
        {screen==="loading"   && <LoadingScreen />}
        {screen==="results"   && result?.type==="analyze" && <AnalysisResult r={result} onReset={reset} />}
        {screen==="results"   && result?.type==="compare" && <CompareResult  r={result} onReset={reset} />}
        {screen==="results"   && result?.type==="roast"   && <RoastResult    r={result} onReset={reset} />}
      </div>
    </>
  );
}
