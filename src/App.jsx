import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc } from "firebase/firestore";

// FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDL2FV0gfT5b58f5mXmAPJMqSbwKde0IV0",
  authDomain: "mundial2026-2026.firebaseapp.com",
  projectId: "mundial2026-2026",
  storageBucket: "mundial2026-2026.firebasestorage.app",
  messagingSenderId: "76029862427",
  appId: "1:76029862427:web:23f21566a32e1c40610ebe"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const PARTICIPANTS_DOC = doc(db, "tournament", "participants");
const MATCHES_DOC = doc(db, "tournament", "matches");
const SETTINGS_DOC = doc(db, "tournament", "settings");
const INVOICES_DOC = doc(db, "tournament", "invoices");

// GROUPS
const GROUPS = {
  A: ["Mexico", "Sudafrica", "Corea del Sur", "Rep. UEFA D*"],
  B: ["Canada", "Suiza", "Qatar", "Rep. UEFA A*"],
  C: ["Brasil", "Marruecos", "Escocia", "Haiti"],
  D: ["Estados Unidos", "Paraguay", "Australia", "Rep. UEFA C*"],
  E: ["Alemania", "Curazao", "Costa de Marfil", "Ecuador"],
  F: ["Paises Bajos", "Japon", "Tunez", "Rep. UEFA B*"],
  G: ["Belgica", "Egipto", "Nueva Zelanda", "Rep. Intercont. 2*"],
  H: ["Espana", "Uruguay", "Arabia Saudita", "Cabo Verde"],
  I: ["Francia", "Senegal", "Noruega", "Rep. Intercont. 2*"],
  J: ["Argentina", "Austria", "Argelia", "Jordania"],
  K: ["Portugal", "Colombia", "Uzbekistan", "Rep. Intercont. 1*"],
  L: ["Inglaterra", "Croacia", "Panama", "Ghana"],
};

const GROUP_COLORS = {
  A:"#1A5276",B:"#1F618D",C:"#117A65",D:"#1E8449",
  E:"#7D6608",F:"#784212",G:"#6E2FD6",H:"#943126",
  I:"#7B241C",J:"#4A235A",K:"#1B2631",L:"#0B6E4F",
};

const LOCK_DATES = {
  groups:  new Date("2026-06-10T00:00:00"),
  round32: new Date("2026-07-01T00:00:00"),
  quarters:new Date("2026-07-03T00:00:00"),
  semis:   new Date("2026-07-14T00:00:00"),
  third:   new Date("2026-07-17T00:00:00"),
  final:   new Date("2026-07-18T00:00:00"),
};

// INVOICE POINTS SCALE (CAD)
function calcInvoicePoints(amount) {
  const a = parseFloat(amount);
  if (isNaN(a) || a < 10) return 0;
  if (a <= 50)  return 5;
  if (a <= 100) return 10;
  if (a <= 200) return 20;
  return 30;
}

function isPhaseLocked(phase, adminUnlocked = {}) {
  if (adminUnlocked[phase]) return false;
  const lockDate = LOCK_DATES[phase];
  if (!lockDate) return false;
  return new Date() >= lockDate;
}

function generateGroupMatches() {
  const matches = [];
  let id = 1;
  const dates = {
    A:["11 Jun","12 Jun","16 Jun","16 Jun","20 Jun","24 Jun"],
    B:["12 Jun","16 Jun","17 Jun","20 Jun","21 Jun","25 Jun"],
    C:["13 Jun","17 Jun","18 Jun","21 Jun","22 Jun","26 Jun"],
    D:["12 Jun","13 Jun","17 Jun","18 Jun","22 Jun","26 Jun"],
    E:["15 Jun","15 Jun","19 Jun","19 Jun","23 Jun","27 Jun"],
    F:["14 Jun","14 Jun","18 Jun","18 Jun","22 Jun","26 Jun"],
    G:["13 Jun","13 Jun","17 Jun","17 Jun","21 Jun","25 Jun"],
    H:["14 Jun","15 Jun","18 Jun","19 Jun","22 Jun","26 Jun"],
    I:["15 Jun","16 Jun","19 Jun","20 Jun","23 Jun","27 Jun"],
    J:["16 Jun","16 Jun","20 Jun","20 Jun","24 Jun","28 Jun"],
    K:["14 Jun","15 Jun","18 Jun","19 Jun","23 Jun","27 Jun"],
    L:["13 Jun","14 Jun","17 Jun","18 Jun","21 Jun","25 Jun"],
  };
  Object.entries(GROUPS).forEach(([grp, teams]) => {
    [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]].forEach(([i,j], idx) => {
      matches.push({ id:id++, phase:"groups", group:grp,
        date:dates[grp]?.[idx]||"TBD",
        home:teams[i], away:teams[j],
        realHome:null, realAway:null });
    });
  });
  return matches;
}

function generateElimMatches() {
  const rounds = [
    {phase:"round32", label:"Octavos de Final", count:16, date:"2-3 Jul"},
    {phase:"quarters", label:"Cuartos de Final", count:8, date:"4-5 Jul"},
    {phase:"semis", label:"Semifinales", count:4, date:"15-16 Jul"},
    {phase:"third", label:"Tercer Lugar", count:1, date:"18 Jul"},
    {phase:"final", label:"Gran Final", count:1, date:"19 Jul"},
  ];
  const matches = [];
  let id = 1000;
  rounds.forEach(r => {
    for (let k = 0; k < r.count; k++) {
      matches.push({ id:id++, phase:r.phase, label:r.label,
        date:r.date, matchNum:k+1,
        home:"Por definir", away:"Por definir",
        realHome:null, realAway:null });
    }
  });
  return matches;
}

const INITIAL_MATCHES = [...generateGroupMatches(), ...generateElimMatches()];

// SCORING
function calcPoints(predH, predA, realH, realA) {
  if (realH===null||realA===null||predH===null||predA===null) return null;
  const ph=Number(predH),pa=Number(predA),rh=Number(realH),ra=Number(realA);
  if (isNaN(ph)||isNaN(pa)||isNaN(rh)||isNaN(ra)) return null;
  if (ph===rh&&pa===ra) return 5;
  const pw=ph>pa?"H":ph<pa?"A":"D";
  const rw=rh>ra?"H":rh<ra?"A":"D";
  if (pw===rw) return 3;
  return 0;
}

// Calculate group standings from a set of match results (either real or predicted)
function calcGroupStandings(groupName, allMatches, getScore) {
  const teams = GROUPS[groupName];
  const standings = {};
  teams.forEach(t => { standings[t] = {team:t, pts:0, gf:0, ga:0, gd:0, played:0}; });

  allMatches.filter(m => m.phase==="groups" && m.group===groupName).forEach(m => {
    const score = getScore(m);
    if (!score) return;
    const {h, a} = score;
    if (h===null||a===null||isNaN(h)||isNaN(a)) return;
    if (!standings[m.home]||!standings[m.away]) return;
    standings[m.home].played++; standings[m.away].played++;
    standings[m.home].gf+=h; standings[m.home].ga+=a;
    standings[m.away].gf+=a; standings[m.away].ga+=h;
    standings[m.home].gd+=h-a; standings[m.away].gd+=a-h;
    if (h>a) { standings[m.home].pts+=3; }
    else if (h<a) { standings[m.away].pts+=3; }
    else { standings[m.home].pts+=1; standings[m.away].pts+=1; }
  });

  return Object.values(standings)
    .sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf);
}

// Get top 2 + best 3rd for each group
function calcAllClassified(allMatches, getScore) {
  const result = { byGroup:{}, thirdPlaces:[] };
  Object.keys(GROUPS).forEach(grp => {
    const standings = calcGroupStandings(grp, allMatches, getScore);
    // Only count if group has enough played matches
    const played = standings.filter(s=>s.played>0);
    if (played.length < 2) return;
    result.byGroup[grp] = standings;
    if (standings[0]?.played>0) result.byGroup[grp+"_1st"] = standings[0].team;
    if (standings[1]?.played>0) result.byGroup[grp+"_2nd"] = standings[1].team;
    if (standings[2]?.played>0) result.thirdPlaces.push({...standings[2], group:grp});
  });
  // Best 8 third places
  result.top8thirds = result.thirdPlaces
    .sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf)
    .slice(0,8)
    .map(t=>t.team);
  return result;
}

// Calculate bonus points for classification predictions
function calcClassificationBonus(predictions, allMatches) {
  // Check if real results have enough data
  const realGroupMatches = allMatches.filter(m=>m.phase==="groups"&&m.realHome!==null);
  if (realGroupMatches.length === 0) return {bonus:0, details:[]};

  // Real classified
  const realClassified = calcAllClassified(allMatches, m=>({h:m.realHome, a:m.realAway}));

  // Predicted classified (from participant's predictions)
  const predClassified = calcAllClassified(allMatches, m=>{
    const pred = predictions?.[m.id];
    if (!pred||pred.home===null||pred.away===null) return null;
    return {h:Number(pred.home), a:Number(pred.away)};
  });

  let bonus = 0;
  const details = [];

  // Check 1st and 2nd place for each group
  Object.keys(GROUPS).forEach(grp => {
    ["1st","2nd"].forEach(pos => {
      const key = grp+"_"+pos;
      const real = realClassified.byGroup[key];
      const pred = predClassified.byGroup[key];
      if (!real||!pred) return;
      if (pred===real) {
        bonus+=10;
        details.push({type:"group_pos", grp, pos, team:real, pts:10, msg:"Acerto "+pos+" del Grupo "+grp+": "+real+" (10pts)"});
      } else {
        // Check if predicted team classified but wrong position
        const realGrp = realClassified.byGroup[grp];
        if (realGrp && realGrp.slice(0,2).some(s=>s.team===pred)) {
          bonus+=5;
          details.push({type:"group_team", grp, pos, team:pred, pts:5, msg:"Acerto clasificado Grupo "+grp+": "+pred+" (5pts)"});
        }
      }
    });
  });

  // Check best 8 thirds
  const realTop8 = realClassified.top8thirds;
  const predTop8 = predClassified.top8thirds;
  if (realTop8.length>0 && predTop8.length>0) {
    predTop8.forEach((team,i) => {
      if (realTop8[i]===team) {
        bonus+=10;
        details.push({type:"third_pos", team, pts:10, msg:"Acerto mejor 3ro posicion "+(i+1)+": "+team+" (10pts)"});
      } else if (realTop8.includes(team)) {
        bonus+=5;
        details.push({type:"third_team", team, pts:5, msg:"Acerto mejor 3ro: "+team+" (5pts)"});
      }
    });
  }

  return {bonus, details};
}

function calcParticipantPoints(predictions, matches, invoices) {
  let total=0, exact=0, correct=0;
  matches.forEach(m => {
    const pred=predictions?.[m.id];
    if (!pred) return;
    const pts=calcPoints(pred.home,pred.away,m.realHome,m.realAway);
    if (pts===null) return;
    total+=pts;
    if (pts===5) exact++;
    if (pts>=3) correct++;
  });
  const invPts = (invoices||[])
    .filter(inv=>inv.status==="approved")
    .reduce((sum,inv)=>sum+calcInvoicePoints(inv.amount),0);
  total += invPts;
  return {total, exact, correct, invPts};
}

// BRAND
const BRAND = {
  red: "#d3172e",
  redDark: "#a8101f",
  redLight: "#f5e6e8",
  white: "#ffffff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray600: "#4b5563",
  gray900: "#111827",
  black: "#0a0a0a",
};

// STYLES
const S = {
  app: {
    minHeight:"100vh",
    background:BRAND.gray50,
    fontFamily:"'Segoe UI', system-ui, sans-serif",
    color:BRAND.gray900,
  },
  header: {
    background:BRAND.white,
    borderBottom:"3px solid "+BRAND.red,
    position:"sticky", top:0, zIndex:100,
    boxShadow:"0 2px 12px rgba(0,0,0,0.08)",
  },
  headerInner: {
    maxWidth:1000, margin:"0 auto",
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"10px 16px", flexWrap:"wrap", gap:8,
  },
  logo: {
    display:"flex", alignItems:"center", gap:10,
  },
  nav: {display:"flex", gap:4, flexWrap:"wrap"},
  navBtn: (active) => ({
    background: active?BRAND.red:"transparent",
    color: active?"#ffffff":"#111827",
    border:"1.5px solid "+(active?BRAND.red:BRAND.gray200),
    borderRadius:6, padding:"6px 14px",
    cursor:"pointer", fontSize:"0.78rem",
    fontWeight:700, letterSpacing:0.5,
    transition:"all .15s",
  }),
  main: {maxWidth:1000, margin:"0 auto", padding:"20px 14px"},
  card: {
    background:BRAND.white,
    border:"1px solid "+BRAND.gray200,
    borderRadius:12, padding:18, marginBottom:14,
    boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
  },
  sectionTitle: {
    fontSize:"0.85rem", fontWeight:800, letterSpacing:2,
    color:BRAND.red, borderBottom:"2px solid "+BRAND.gray100,
    paddingBottom:8, marginBottom:14,
    textTransform:"uppercase",
  },
  input: {
    background:BRAND.gray50, border:"1.5px solid "+BRAND.gray200,
    color:BRAND.gray900, borderRadius:8, padding:"9px 12px",
    fontSize:"0.95rem", width:"100%",
    fontFamily:"inherit", outline:"none",
    boxSizing:"border-box",
    transition:"border .15s",
  },
  scoreInput: {
    background:BRAND.gray50, border:"1.5px solid "+BRAND.gray200,
    color:BRAND.gray900, borderRadius:6, padding:"5px 0",
    fontSize:"1rem", fontWeight:700, width:46,
    textAlign:"center", fontFamily:"inherit", outline:"none",
  },
  btn: (color=BRAND.red, outline=false) => ({
    background: outline?"transparent":color,
    color: outline?color:BRAND.white,
    border:"2px solid "+color,
    borderRadius:8, padding:"8px 18px",
    cursor:"pointer", fontSize:"0.85rem",
    fontWeight:700, fontFamily:"inherit",
    transition:"opacity .15s",
  }),
  matchRow: {
    display:"grid",
    gridTemplateColumns:"1fr 46px 10px 46px 1fr",
    gap:5, alignItems:"center",
    background:BRAND.gray50, border:"1px solid "+BRAND.gray200,
    borderRadius:8, padding:"7px 10px", marginBottom:5,
  },
  badge: (pts) => ({
    display:"inline-block",
    background:pts===5?"#16a34a":pts===3?"#2563eb":pts===0?"#dc2626":BRAND.gray200,
    color:pts===null?BRAND.gray600:"#fff",
    borderRadius:20, padding:"2px 8px",
    fontSize:"0.78rem", fontWeight:700,
    minWidth:26, textAlign:"center",
  }),
  leaderRow: (i) => ({
    background:i===0?"#fff0f2":i===1?"#fafafa":i===2?"#fffbf0":BRAND.white,
    border:"1.5px solid "+(i===0?BRAND.red:i===1?"#9ca3af":i===2?"#d4a017":BRAND.gray200),
    borderRadius:10, padding:"10px 16px",
    display:"flex", alignItems:"center", gap:12,
    marginBottom:7,
  }),
  groupHeader: (color) => ({
    background:color+"15", borderLeft:"4px solid "+color,
    padding:"6px 12px", borderRadius:"0 8px 8px 0",
    marginBottom:7, marginTop:14,
    fontSize:"0.85rem", fontWeight:800,
    letterSpacing:2, color:color,
  }),
  phaseHeader: (color) => ({
    background:color, borderRadius:8,
    padding:"8px 14px", fontSize:"0.85rem",
    fontWeight:800, letterSpacing:2,
    marginBottom:8, marginTop:16,
    color:"#fff",
  }),
  invoiceCard: (status) => ({
    background:BRAND.gray50,
    border:"1px solid "+(status==="approved"?"#16a34a44":status==="rejected"?"#dc262644":BRAND.red+"44"),
    borderRadius:8, padding:"12px 14px", marginBottom:8,
    display:"flex", alignItems:"center", justifyContent:"space-between", gap:10,
    flexWrap:"wrap",
  }),
  statusBadge: (status) => ({
    display:"inline-block",
    background:status==="approved"?"#16a34a":status==="rejected"?"#dc2626":"#d97706",
    color:"#fff", borderRadius:20,
    padding:"3px 10px", fontSize:"0.75rem", fontWeight:700,
  }),
};

const FontStyle = () => (
  <style>{`
    * { box-sizing:border-box; color:inherit; }
    body { color:#111827; background:#f9fafb; }
    input, button, select, textarea { font-family:inherit; }
    input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
    input[type=number] { -moz-appearance:textfield; }
    ::-webkit-scrollbar { width:5px; }
    ::-webkit-scrollbar-thumb { background:#e5e7eb; border-radius:3px; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    .fi { animation:fadeIn .3s ease forwards; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    .pulse { animation:pulse 2s infinite; }
    button:hover { opacity:.82; }
    input:focus { border-color:#d3172e !important; box-shadow:0 0 0 3px #d3172e18; }
    button { color:inherit; }
  `}</style>
);

// LEADERBOARD
function Leaderboard({ participants, matches, invoices }) {
  const [activeTab, setActiveTab] = useState("tabla");

  const ranked = [...participants]
    .map(p => {
      const userInvoices = (invoices||[]).filter(inv => inv.participantId === p.id && inv.status === "approved");
      const invPts = userInvoices.reduce((sum, inv) => sum + calcInvoicePoints(inv.amount), 0);
      let gamePts = 0, exact = 0, correct = 0;
      matches.forEach(m => {
        const pred = p.predictions?.[m.id];
        if (!pred) return;
        const pts = calcPoints(pred.home, pred.away, m.realHome, m.realAway);
        if (pts === null) return;
        gamePts += pts;
        if (pts === 5) exact++;
        if (pts >= 3) correct++;
      });
      const {bonus: classPts} = calcClassificationBonus(p.predictions, matches);
      return {...p, total: gamePts + invPts + classPts, gamePts, exact, correct, invPts, classPts};
    })
    .sort((a,b) => b.total - a.total || b.exact - a.exact);

  const top20 = ranked.slice(0, 20);

  return (
    <div className="fi">
      <div style={{display:"flex", gap:6, marginBottom:16, flexWrap:"wrap"}}>
        {[["tabla","Clasificacion General"],["top20","Top 20"]].map(([t,l])=>(
          <button key={t} style={S.navBtn(activeTab===t)} onClick={()=>setActiveTab(t)}>{l}</button>
        ))}
      </div>

      {activeTab==="top20" && (
        <div style={{...S.card, padding:0, overflow:"hidden"}}>
          <div style={{background:BRAND.red, padding:"12px 18px"}}>
            <div style={{color:"#fff", fontWeight:800, fontSize:"1rem", letterSpacing:1}}>TOP 20 - MEJORES PARTICIPANTES</div>
          </div>
          {top20.length===0 && (
            <div style={{textAlign:"center", color:"#9ca3af", padding:30}}>Aun no hay participantes</div>
          )}
          {top20.map((p, i) => (
            <div key={p.id} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"10px 18px",
              background: i%2===0 ? "#fff" : BRAND.gray50,
              borderBottom:"1px solid "+BRAND.gray100,
            }}>
              <div style={{
                width:32, height:32, borderRadius:"50%",
                background: i===0?BRAND.red:i===1?"#9ca3af":i===2?"#d97706":BRAND.gray100,
                color: i<3?"#fff":BRAND.gray600,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:800, fontSize:"0.85rem", flexShrink:0,
              }}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700, fontSize:"0.95rem", color:BRAND.gray900}}>{p.name}</div>
                <div style={{fontSize:"0.72rem", color:"#9ca3af", marginTop:1}}>
                  {p.exact} exactos · {p.correct} acertados
                  {p.invPts > 0 && <span style={{color:BRAND.red}}> · +{p.invPts}pts facturas</span>}
                  {p.classPts > 0 && <span style={{color:"#7c3aed"}}> · +{p.classPts}pts clasificados</span>}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:"1.4rem", fontWeight:800, color: i===0?BRAND.red:BRAND.gray900}}>{p.total}</div>
                <div style={{fontSize:"0.65rem", color:"#9ca3af"}}>PTS</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab==="tabla" && (
        <>
          {ranked.length===0 && (
            <div style={{textAlign:"center",color:"#9ca3af",padding:40}}>
              Aun no hay participantes registrados
            </div>
          )}
          {ranked.map((p,i) => (
            <div key={p.id} style={S.leaderRow(i)}>
              <div style={{fontSize:"1.4rem", width:30, textAlign:"center"}}>
                {i===0?"🥇":i===1?"🥈":i===2?"🥉":
                  <span style={{color:"#9ca3af",fontSize:"0.85rem",fontWeight:700}}>#{i+1}</span>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:"1rem",color:BRAND.gray900}}>{p.name}</div>
                <div style={{color:"#9ca3af",fontSize:"0.75rem",marginTop:2,display:"flex",gap:10,flexWrap:"wrap"}}>
                  <span>{p.exact} exactos</span>
                  <span>{p.correct} acertados</span>
                  {p.invPts>0 && <span style={{color:BRAND.red}}>+{p.invPts}pts facturas</span>}
                  {p.classPts>0 && <span style={{color:"#7c3aed"}}>+{p.classPts}pts clasificados</span>}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:"1.8rem",fontWeight:800,
                  color:i===0?BRAND.red:i===1?"#6b7280":i===2?"#b45309":BRAND.gray900,
                  lineHeight:1}}>{p.total}</div>
                <div style={{color:"#9ca3af",fontSize:"0.7rem"}}>PUNTOS</div>
              </div>
            </div>
          ))}
          <div style={{...S.card,marginTop:20}}>
            <div style={S.sectionTitle}>Sistema de Puntos</div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:"0.75rem",color:BRAND.red,fontWeight:700,marginBottom:8,letterSpacing:1}}>PRONOSTICOS</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8}}>
                {[["5 pts","Resultado exacto","#16a34a"],["3 pts","Ganador correcto","#2563eb"],["0 pts","Resultado fallado","#dc2626"]].map(([pts,desc,color])=>(
                  <div key={pts} style={{background:BRAND.gray50,border:"1px solid "+color+"33",borderRadius:10,padding:"10px",textAlign:"center"}}>
                    <div style={{fontSize:"1.5rem",fontWeight:800,color}}>{pts}</div>
                    <div style={{color:"#6b7280",fontSize:"0.75rem",marginTop:2}}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:"0.75rem",color:BRAND.red,fontWeight:700,marginBottom:8,letterSpacing:1}}>FACTURAS (CAD)</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:8}}>
                {[["5 pts","$10-$50","#16a34a"],["10 pts","$51-$100","#2563eb"],["20 pts","$101-$200","#7c3aed"],["30 pts","+$200",BRAND.red]].map(([pts,range,color])=>(
                  <div key={pts} style={{background:BRAND.gray50,border:"1px solid "+color+"33",borderRadius:10,padding:"10px",textAlign:"center"}}>
                    <div style={{fontSize:"1.3rem",fontWeight:800,color}}>{pts}</div>
                    <div style={{color:"#6b7280",fontSize:"0.75rem",marginTop:2}}>{range}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// INVOICE FORM
function InvoiceForm({ currentUser, invoices, setInvoices }) {
  const [invoiceNum, setInvoiceNum] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const myInvoices = invoices.filter(inv=>inv.participantId===currentUser.id);
  const approvedPts = myInvoices.filter(inv=>inv.status==="approved")
    .reduce((sum,inv)=>sum+calcInvoicePoints(inv.amount),0);

  async function handleSubmit() {
    if (!invoiceNum.trim()) { alert("Ingresa el numero de factura"); return; }
    if (!amount || parseFloat(amount)<10) { alert("El monto minimo es $10 CAD"); return; }
    const alreadyExists = invoices.find(inv=>inv.invoiceNum===invoiceNum.trim());
    if (alreadyExists) { alert("Esta factura ya fue registrada"); return; }

    setSaving(true);
    try {
      const newInvoice = {
        id: Date.now(),
        participantId: currentUser.id,
        participantName: currentUser.name,
        invoiceNum: invoiceNum.trim(),
        amount: parseFloat(amount),
        points: calcInvoicePoints(amount),
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      const updated = [...invoices, newInvoice];
      await setDoc(INVOICES_DOC, {list: updated});
      setInvoices(updated);
      setInvoiceNum("");
      setAmount("");
      setSuccess(true);
      setTimeout(()=>setSuccess(false), 3000);
    } catch(e) {
      alert("Error: "+e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>Registrar Factura</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div>
          <label style={{fontSize:"0.75rem",color:"#d3172e",letterSpacing:2,display:"block",marginBottom:5}}>
            NUMERO DE FACTURA
          </label>
          <input style={S.input} placeholder="Ej: FAC-001234"
            value={invoiceNum} onChange={e=>setInvoiceNum(e.target.value)} />
        </div>
        <div>
          <label style={{fontSize:"0.75rem",color:"#d3172e",letterSpacing:2,display:"block",marginBottom:5}}>
            MONTO (CAD $)
          </label>
          <input style={S.input} type="number" min="10" placeholder="Ej: 150.00"
            value={amount} onChange={e=>setAmount(e.target.value)} />
        </div>
      </div>
      {amount && parseFloat(amount)>=10 && (
        <div style={{background:"#0d2215",border:"1px solid #27ae6044",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:"0.85rem"}}>
          Esta factura vale <strong style={{color:"#16a34a",fontSize:"1rem"}}>{calcInvoicePoints(amount)} puntos</strong> si es aprobada
        </div>
      )}
      {success && (
        <div style={{background:"#0d2215",border:"1px solid #27ae60",borderRadius:8,padding:"10px 14px",marginBottom:12,color:"#16a34a",fontSize:"0.85rem",fontWeight:700}}>
          Factura enviada! Pendiente de aprobacion por el administrador.
        </div>
      )}
      <button style={S.btn()} onClick={handleSubmit} disabled={saving}>
        {saving?"Enviando...":"Enviar Factura"}
      </button>

      {myInvoices.length>0 && (
        <div style={{marginTop:20}}>
          <div style={{fontSize:"0.8rem",color:"#d3172e",fontWeight:700,letterSpacing:1,marginBottom:10}}>
            MIS FACTURAS ({myInvoices.length}) — {approvedPts} puntos acumulados
          </div>
          {myInvoices.map(inv=>(
            <div key={inv.id} style={S.invoiceCard(inv.status)}>
              <div>
                <div style={{fontWeight:700,fontSize:"0.9rem"}}>{inv.invoiceNum}</div>
                <div style={{color:"#6b7280",fontSize:"0.78rem",marginTop:2}}>
                  ${inv.amount} CAD &nbsp;|&nbsp; {inv.points} pts potenciales
                </div>
              </div>
              <div style={S.statusBadge(inv.status)}>
                {inv.status==="approved"?"Aprobada":inv.status==="rejected"?"Rechazada":"Pendiente"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// PARTICIPANT FORM
const SUCURSALES = ["St-Hubert", "St-Laurent", "Brossard"];

function ParticipantForm({ participants, setParticipants, matches, adminUnlocked, invoices, setInvoices }) {
  const [step, setStep] = useState("login");
  const [isNew, setIsNew] = useState(false);
  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPin, setLoginPin] = useState("");
  // Register
  const [regNombre, setRegNombre] = useState("");
  const [regApellido, setRegApellido] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regTel, setRegTel] = useState("");
  const [regSucursal, setRegSucursal] = useState("");
  const [regPin, setRegPin] = useState("");
  const [regPin2, setRegPin2] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [preds, setPreds] = useState({});
  const [activeGroup, setActiveGroup] = useState("A");
  const [activePhase, setActivePhase] = useState("groups");
  const [activePh, setActivePh] = useState("round32");
  const [activeTab, setActiveTab] = useState("pronosticos");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const groupMatches = matches.filter(m=>m.phase==="groups");
  const elimMatches = matches.filter(m=>m.phase!=="groups");
  const phases = [...new Set(elimMatches.map(m=>m.phase))];
  const phaseLabels = {round32:"Octavos",quarters:"Cuartos",semis:"Semifinales",third:"3er Lugar",final:"Gran Final"};
  const phaseColors = {round32:"#c0392b",quarters:"#8e44ad",semis:"#e67e22",third:"#2980b9",final:"#d3172e"};

  const groupsLocked = isPhaseLocked("groups", adminUnlocked);

  function getLockMsg(phase) {
    const locked = isPhaseLocked(phase, adminUnlocked);
    if (!locked) {
      const d = LOCK_DATES[phase];
      if (d) {
        const diff = Math.ceil((d-new Date())/(1000*60*60*24));
        if (diff>0) return {locked:false, msg:"Abierto - se bloquea en "+diff+" dia"+(diff!==1?"s":"")};
      }
      return {locked:false, msg:"Abierto"};
    }
    return {locked:true, msg:"Bloqueado"};
  }

  function handleLogin() {
    setError("");
    if (!loginEmail.trim()) { setError("Ingresa tu correo"); return; }
    if (!loginPin.trim()||loginPin.length<4) { setError("PIN minimo 4 digitos"); return; }
    const existing = participants.find(p=>p.email&&p.email.toLowerCase()===loginEmail.trim().toLowerCase());
    if (!existing) { setError("Correo no registrado. Crea una cuenta nueva."); return; }
    if (existing.pin!==loginPin) { setError("PIN incorrecto"); return; }
    setCurrentUser(existing);
    setPreds(existing.predictions||{});
    setStep("form");
  }

  async function handleRegister() {
    setError("");
    if (!regNombre.trim()) { setError("Ingresa tu nombre"); return; }
    if (!regApellido.trim()) { setError("Ingresa tu apellido"); return; }
    if (!regEmail.trim()||!regEmail.includes("@")) { setError("Ingresa un correo valido"); return; }
    if (!regTel.trim()) { setError("Ingresa tu telefono"); return; }
    if (!regSucursal) { setError("Selecciona una sucursal"); return; }
    if (!regPin.trim()||regPin.length<4) { setError("PIN minimo 4 digitos"); return; }
    if (regPin!==regPin2) { setError("Los PINs no coinciden"); return; }
    const exists = participants.find(p=>p.email&&p.email.toLowerCase()===regEmail.trim().toLowerCase());
    if (exists) { setError("Este correo ya esta registrado. Inicia sesion."); return; }
    setSaving(true);
    try {
      const newUser = {
        id: Date.now(),
        nombre: regNombre.trim(),
        apellido: regApellido.trim(),
        name: regNombre.trim()+" "+regApellido.trim(),
        email: regEmail.trim().toLowerCase(),
        telefono: regTel.trim(),
        sucursal: regSucursal,
        pin: regPin,
        predictions: {},
        createdAt: new Date().toISOString(),
      };
      const newParticipants = [...participants, newUser];
      await setDoc(PARTICIPANTS_DOC, {list: newParticipants});
      setParticipants(newParticipants);
      setCurrentUser(newUser);
      setPreds({});
      setStep("form");
    } catch(e) {
      setError("Error al registrar: "+e.message);
    } finally {
      setSaving(false);
    }
  }

  function setPred(matchId, side, val) {
    const v = val===""?null:Math.max(0,parseInt(val)||0);
    setPreds(prev=>({...prev, [matchId]:{...(prev[matchId]||{}), [side]:v}}));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updatedUser = {...currentUser, predictions:preds};
      const newParticipants = [...participants.filter(p=>p.id!==currentUser.id), updatedUser];
      await setDoc(PARTICIPANTS_DOC, {list: newParticipants});
      setParticipants(newParticipants);
      setStep("done");
    } catch(e) {
      alert("Error al guardar: "+e.message);
    } finally {
      setSaving(false);
    }
  }

  function renderMatchRow(m, locked=false) {
    const pred = preds[m.id]||{};
    const pts = calcPoints(pred.home, pred.away, m.realHome, m.realAway);
    return (
      <div key={m.id} style={{...S.matchRow, opacity:m.home==="Por definir"?.55:1}}>
        <div style={{textAlign:"right",fontSize:"0.85rem",fontWeight:600}}>{m.home}</div>
        <input type="number" min="0" max="99" placeholder="-"
          style={{...S.scoreInput, background:locked?"#f9fafb":"#f3f4f6", cursor:locked?"not-allowed":"text"}}
          value={pred.home??""} disabled={locked}
          onChange={e=>!locked&&setPred(m.id,"home",e.target.value)} />
        <div style={{textAlign:"center",color:"#9ca3af",fontSize:"0.68rem",fontWeight:700}}>VS</div>
        <input type="number" min="0" max="99" placeholder="-"
          style={{...S.scoreInput, background:locked?"#f9fafb":"#f3f4f6", cursor:locked?"not-allowed":"text"}}
          value={pred.away??""} disabled={locked}
          onChange={e=>!locked&&setPred(m.id,"away",e.target.value)} />
        <div style={{textAlign:"left",fontSize:"0.85rem",fontWeight:600}}>{m.away}</div>
        {pts!==null && <div style={{...S.badge(pts),marginLeft:6}}>{pts}pts</div>}
      </div>
    );
  }

  const selectStyle = {...S.input, appearance:"none", WebkitAppearance:"none", cursor:"pointer"};

  if (step==="login") return (
    <div className="fi" style={{maxWidth:460,margin:"0 auto"}}>
      <div style={S.card}>
        <div style={{display:"flex",borderBottom:"2px solid "+BRAND.gray100,marginBottom:20}}>
          {[["login","Ya tengo cuenta"],["register","Registrarme"]].map(([t,l])=>(
            <button key={t} onClick={()=>{setIsNew(t==="register");setError("");}}
              style={{flex:1,padding:"10px",border:"none",background:"transparent",
                fontWeight:700,fontSize:"0.85rem",cursor:"pointer",
                color:(!isNew&&t==="login")||(isNew&&t==="register")?BRAND.red:"#9ca3af",
                borderBottom:"2px solid "+((!isNew&&t==="login")||(isNew&&t==="register")?BRAND.red:"transparent"),
                marginBottom:"-2px",
              }}>{l}</button>
          ))}
        </div>

        {!isNew && (
          <>
            <div style={S.sectionTitle}>Iniciar Sesion</div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:5,fontWeight:700}}>CORREO ELECTRONICO</label>
              <input style={S.input} type="email" placeholder="tu@correo.com"
                value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:5,fontWeight:700}}>PIN</label>
              <input style={S.input} type="password" placeholder="****"
                value={loginPin} onChange={e=>setLoginPin(e.target.value.replace(/\D/g,""))}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
            </div>
            {error && <div style={{color:"#dc2626",marginBottom:12,fontSize:"0.85rem",background:"#fef2f2",padding:"8px 12px",borderRadius:6}}>{error}</div>}
            <button style={{...S.btn(),width:"100%"}} onClick={handleLogin}>Entrar</button>
            <div style={{marginTop:12,textAlign:"center",color:"#9ca3af",fontSize:"0.78rem"}}>
              {participants.length} participante{participants.length!==1?"s":""} registrado{participants.length!==1?"s":""}
            </div>
          </>
        )}

        {isNew && (
          <>
            <div style={S.sectionTitle}>Crear Cuenta</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:4,fontWeight:700}}>NOMBRE</label>
                <input style={S.input} placeholder="Juan" value={regNombre} onChange={e=>setRegNombre(e.target.value)} />
              </div>
              <div>
                <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:4,fontWeight:700}}>APELLIDO</label>
                <input style={S.input} placeholder="Perez" value={regApellido} onChange={e=>setRegApellido(e.target.value)} />
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:4,fontWeight:700}}>CORREO ELECTRONICO</label>
              <input style={S.input} type="email" placeholder="tu@correo.com" value={regEmail} onChange={e=>setRegEmail(e.target.value)} />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:4,fontWeight:700}}>TELEFONO</label>
                <input style={S.input} placeholder="514-000-0000" value={regTel} onChange={e=>setRegTel(e.target.value)} />
              </div>
              <div>
                <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:4,fontWeight:700}}>SUCURSAL</label>
                <select style={selectStyle} value={regSucursal} onChange={e=>setRegSucursal(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {SUCURSALES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div>
                <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:4,fontWeight:700}}>PIN (min. 4 dig.)</label>
                <input style={S.input} type="password" placeholder="****" value={regPin} onChange={e=>setRegPin(e.target.value.replace(/\D/g,""))} />
              </div>
              <div>
                <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:4,fontWeight:700}}>CONFIRMAR PIN</label>
                <input style={S.input} type="password" placeholder="****" value={regPin2} onChange={e=>setRegPin2(e.target.value.replace(/\D/g,""))} />
              </div>
            </div>
            {error && <div style={{color:"#dc2626",marginBottom:12,fontSize:"0.85rem",background:"#fef2f2",padding:"8px 12px",borderRadius:6}}>{error}</div>}
            <button style={{...S.btn(),width:"100%"}} onClick={handleRegister} disabled={saving}>
              {saving?"Registrando...":"Crear Cuenta y Participar"}
            </button>
          </>
        )}
      </div>
    </div>
  );

  if (step==="done") return (
    <div className="fi" style={{maxWidth:440,margin:"0 auto",textAlign:"center"}}>
      <div style={S.card}>
        <div style={{fontSize:"3rem",marginBottom:10}}>OK</div>
        <div style={{fontSize:"1.2rem",fontWeight:800,color:"#d3172e",marginBottom:8}}>Guardado!</div>
        <div style={{color:"#6b7280",marginBottom:16}}>Hola <strong style={{color:"#111827"}}>{currentUser?.name}</strong></div>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
          <button style={S.btn()} onClick={()=>setStep("form")}>Editar Pronosticos</button>
          <button style={S.btn("#6b7280",true)} onClick={()=>{setStep("login");setName("");setPin("");}}>Cambiar Usuario</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fi">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <span style={{color:"#d3172e",fontWeight:800}}>{currentUser?.name}</span>
        <div style={{display:"flex",gap:8}}>
          <button style={{...S.btn("#27ae60"),fontSize:"0.8rem",padding:"6px 14px"}} onClick={handleSave} disabled={saving}>
            {saving?"Guardando...":"Guardar Todo"}
          </button>
          <button style={{...S.btn("#6b7280",true),fontSize:"0.8rem",padding:"6px 12px"}} onClick={()=>{setStep("login");setName("");setPin("");}}>Salir</button>
        </div>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[["pronosticos","Mis Pronosticos"],["tablas","Mis Tablas"],["facturas","Mis Facturas"]].map(([t,l])=>(
          <button key={t} style={S.navBtn(activeTab===t)} onClick={()=>setActiveTab(t)}>{l}</button>
        ))}
      </div>

      {activeTab==="facturas" && (
        <InvoiceForm currentUser={currentUser} invoices={invoices} setInvoices={setInvoices} />
      )}

      {activeTab==="tablas" && (
        <div className="fi">
          <div style={{...S.card,padding:"10px 14px",marginBottom:14,background:"#eff6ff",border:"1px solid #bfdbfe"}}>
            <div style={{fontSize:"0.8rem",color:"#1d4ed8",fontWeight:600}}>
              Tablas de posiciones segun tus pronosticos de marcadores
            </div>
          </div>
          {Object.keys(GROUPS).map(grp => {
            // Calculate W/D/L/GF/GA/Pts per team for this group
            const teams = GROUPS[grp];
            const stats = {};
            teams.forEach(t => { stats[t]={team:t,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}; });
            matches.filter(m=>m.phase==="groups"&&m.group===grp).forEach(m=>{
              const pred=preds[m.id];
              if(!pred||pred.home===null||pred.away===null) return;
              const h=Number(pred.home),a=Number(pred.away);
              if(isNaN(h)||isNaN(a)) return;
              if(!stats[m.home]||!stats[m.away]) return;
              stats[m.home].pj++; stats[m.away].pj++;
              stats[m.home].gf+=h; stats[m.home].gc+=a;
              stats[m.away].gf+=a; stats[m.away].gc+=h;
              if(h>a){stats[m.home].g++;stats[m.home].pts+=3;stats[m.away].p++;}
              else if(h<a){stats[m.away].g++;stats[m.away].pts+=3;stats[m.home].p++;}
              else{stats[m.home].e++;stats[m.away].e++;stats[m.home].pts++;stats[m.away].pts++;}
            });
            const table = Object.values(stats).sort((a,b)=>b.pts-a.pts||(b.gf-b.gc)-(a.gf-a.gc)||b.gf-a.gf);
            const hasData = table.some(s=>s.pj>0);
            return (
              <div key={grp} style={{...S.card,padding:0,overflow:"hidden",marginBottom:12}}>
                <div style={{background:GROUP_COLORS[grp],padding:"8px 14px"}}>
                  <div style={{color:"#fff",fontWeight:800,fontSize:"0.85rem",letterSpacing:1}}>GRUPO {grp}</div>
                </div>
                {!hasData ? (
                  <div style={{padding:"14px",color:"#9ca3af",fontSize:"0.8rem",textAlign:"center"}}>
                    Aun no has ingresado pronosticos para este grupo
                  </div>
                ) : (
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.78rem"}}>
                      <thead>
                        <tr style={{background:BRAND.gray50,borderBottom:"2px solid "+BRAND.gray200}}>
                          {["Pos","Equipo","PJ","G","E","P","GF","GC","GD","Pts"].map(h=>(
                            <th key={h} style={{padding:"6px 8px",textAlign:h==="Equipo"?"left":"center",color:BRAND.gray600,fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.map((s,i)=>{
                          const gd=s.gf-s.gc;
                          const rowColor=i===0?"#f0fdf4":i===1?"#f0fdf4":i===2?"#fffbeb":"#fff";
                          const posColor=i<2?BRAND.red:i===2?"#d97706":BRAND.gray400;
                          return (
                            <tr key={s.team} style={{borderBottom:"1px solid "+BRAND.gray100,background:rowColor}}>
                              <td style={{padding:"7px 8px",textAlign:"center",fontWeight:800,color:posColor}}>{i+1}</td>
                              <td style={{padding:"7px 8px",fontWeight:700,color:BRAND.gray900,whiteSpace:"nowrap"}}>
                                <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:i<2?"#16a34a":i===2?"#d97706":"#e5e7eb",marginRight:6,verticalAlign:"middle"}}></span>
                                {s.team}
                              </td>
                              <td style={{padding:"7px 8px",textAlign:"center",color:BRAND.gray600}}>{s.pj}</td>
                              <td style={{padding:"7px 8px",textAlign:"center",color:"#16a34a",fontWeight:600}}>{s.g}</td>
                              <td style={{padding:"7px 8px",textAlign:"center",color:BRAND.gray600}}>{s.e}</td>
                              <td style={{padding:"7px 8px",textAlign:"center",color:"#dc2626"}}>{s.p}</td>
                              <td style={{padding:"7px 8px",textAlign:"center",color:BRAND.gray600}}>{s.gf}</td>
                              <td style={{padding:"7px 8px",textAlign:"center",color:BRAND.gray600}}>{s.gc}</td>
                              <td style={{padding:"7px 8px",textAlign:"center",fontWeight:700,color:gd>0?"#16a34a":gd<0?"#dc2626":BRAND.gray600}}>{gd>0?"+"+gd:gd}</td>
                              <td style={{padding:"7px 8px",textAlign:"center",fontWeight:800,fontSize:"0.9rem",color:BRAND.red}}>{s.pts}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div style={{padding:"5px 12px",fontSize:"0.7rem",color:"#9ca3af",borderTop:"1px solid "+BRAND.gray100}}>
                      Verde = clasificado · Amarillo = posible mejor 3ro
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab==="pronosticos" && (
        <>
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
            {["groups","elim"].map(ph=>(
              <button key={ph} style={S.navBtn(activePhase===ph)} onClick={()=>setActivePhase(ph)}>
                {ph==="groups"?"Fase de Grupos":"Eliminatorias"}
              </button>
            ))}
          </div>

          {activePhase==="groups" && (
            <>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
                {Object.keys(GROUPS).map(g=>(
                  <button key={g} style={{
                    ...S.navBtn(activeGroup===g),
                    background:activeGroup===g?GROUP_COLORS[g]:"transparent",
                    borderColor:GROUP_COLORS[g], color:activeGroup===g?"#fff":GROUP_COLORS[g],
                    padding:"4px 10px",fontSize:"0.75rem",
                  }} onClick={()=>setActiveGroup(g)}>Grp {g}</button>
                ))}
              </div>
              {(()=>{const lk=getLockMsg("groups"); return(
                <div style={{background:lk.locked?"#fef2f2":"#f0fdf4",border:"1px solid "+(lk.locked?"#dc262688":"#16a34a66"),borderRadius:7,padding:"7px 12px",marginBottom:10,fontSize:"0.8rem",color:lk.locked?"#e74c3c":"#2ecc71"}}>
                  {lk.locked?"Pronosticos de grupos cerrados":lk.msg}
                </div>
              );})()}
              <div style={S.groupHeader(GROUP_COLORS[activeGroup])}>GRUPO {activeGroup}</div>
              {groupMatches.filter(m=>m.group===activeGroup).map(m=>renderMatchRow(m,groupsLocked))}
              {!groupsLocked && (
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}>
                  <button style={{...S.btn("#27ae60"),fontSize:"0.8rem"}} onClick={handleSave} disabled={saving}>
                    {saving?"Guardando...":"Guardar"}
                  </button>
                </div>
              )}
            </>
          )}

          {activePhase==="elim" && (
            <>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
                {phases.map(ph=>(
                  <button key={ph} style={{
                    ...S.navBtn(activePh===ph),
                    background:activePh===ph?phaseColors[ph]:"transparent",
                    borderColor:phaseColors[ph]+"88", color:activePh===ph?"#fff":phaseColors[ph],
                    fontSize:"0.75rem",padding:"4px 10px",
                  }} onClick={()=>setActivePh(ph)}>{phaseLabels[ph]}</button>
                ))}
              </div>
              {(()=>{const lk=getLockMsg(activePh); return(
                <div style={{background:lk.locked?"#fef2f2":"#f0fdf4",border:"1px solid "+(lk.locked?"#dc262688":"#16a34a66"),borderRadius:7,padding:"7px 12px",marginBottom:10,fontSize:"0.8rem",color:lk.locked?"#e74c3c":"#2ecc71"}}>
                  {lk.locked?"Cerrado":lk.msg}
                </div>
              );})()}
              {(()=>{const phaseLocked=isPhaseLocked(activePh,adminUnlocked); return(
                <>
                  {elimMatches.filter(m=>m.phase===activePh).map(m=>renderMatchRow(m,phaseLocked))}
                  {!phaseLocked && (
                    <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}>
                      <button style={{...S.btn("#27ae60"),fontSize:"0.8rem"}} onClick={handleSave} disabled={saving}>
                        {saving?"Guardando...":"Guardar"}
                      </button>
                    </div>
                  )}
                </>
              );})()}
            </>
          )}
        </>
      )}
    </div>
  );
}

// FIXTURE VIEW
function FixtureView({ matches }) {
  const [activeGroup, setActiveGroup] = useState("A");
  const [activePhase, setActivePhase] = useState("groups");
  const phaseColors = {round32:"#c0392b",quarters:"#8e44ad",semis:"#e67e22",third:"#2980b9",final:"#d3172e"};
  const phaseLabels = {round32:"Octavos de Final",quarters:"Cuartos de Final",semis:"Semifinales",third:"Tercer Lugar",final:"Gran Final"};
  const groupMatches = matches.filter(m=>m.phase==="groups");
  const elimMatches = matches.filter(m=>m.phase!=="groups");
  const phases = [...new Set(elimMatches.map(m=>m.phase))];

  function renderMatch(m) {
    const hasResult = m.realHome!==null&&m.realAway!==null;
    return (
      <div key={m.id} style={{...S.matchRow,gridTemplateColumns:"1fr auto auto auto 1fr",opacity:m.home==="Por definir"?.5:1}}>
        <div style={{textAlign:"right",fontWeight:600,fontSize:"0.85rem"}}>{m.home}</div>
        <div style={{background:hasResult?"#f0fdf4":"#f3f4f6",border:"1px solid "+(hasResult?"#16a34a66":"#d1d5db"),borderRadius:6,padding:"3px 8px",fontSize:"1rem",fontWeight:800,color:hasResult?"#27ae60":"#9ca3af",minWidth:32,textAlign:"center"}}>
          {hasResult?m.realHome:"-"}
        </div>
        <div style={{color:"#9ca3af",fontWeight:700,fontSize:"0.68rem",padding:"0 3px"}}>VS</div>
        <div style={{background:hasResult?"#f0fdf4":"#f3f4f6",border:"1px solid "+(hasResult?"#16a34a66":"#d1d5db"),borderRadius:6,padding:"3px 8px",fontSize:"1rem",fontWeight:800,color:hasResult?"#27ae60":"#9ca3af",minWidth:32,textAlign:"center"}}>
          {hasResult?m.realAway:"-"}
        </div>
        <div style={{textAlign:"left",fontWeight:600,fontSize:"0.85rem"}}>{m.away}</div>
      </div>
    );
  }

  return (
    <div className="fi">
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {["groups","elim"].map(ph=>(
          <button key={ph} style={S.navBtn(activePhase===ph)} onClick={()=>setActivePhase(ph)}>
            {ph==="groups"?"Grupos":"Eliminatorias"}
          </button>
        ))}
      </div>
      {activePhase==="groups" && (
        <>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
            {Object.keys(GROUPS).map(g=>(
              <button key={g} style={{...S.navBtn(activeGroup===g),background:activeGroup===g?GROUP_COLORS[g]:"transparent",borderColor:GROUP_COLORS[g],color:activeGroup===g?"#fff":GROUP_COLORS[g],padding:"4px 10px",fontSize:"0.75rem"}} onClick={()=>setActiveGroup(g)}>Grp {g}</button>
            ))}
          </div>
          <div style={S.groupHeader(GROUP_COLORS[activeGroup])}>GRUPO {activeGroup}</div>
          {groupMatches.filter(m=>m.group===activeGroup).map(m=>(
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <span style={{color:"#9ca3af",fontSize:"0.72rem",minWidth:38}}>{m.date}</span>
              {renderMatch(m)}
            </div>
          ))}
        </>
      )}
      {activePhase==="elim" && (
        <>
          {phases.map(ph=>(
            <div key={ph}>
              <div style={S.phaseHeader(phaseColors[ph])}>{phaseLabels[ph]}</div>
              {elimMatches.filter(m=>m.phase===ph).map(m=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{color:"#9ca3af",fontSize:"0.72rem",minWidth:38}}>{m.date}</span>
                  {renderMatch(m)}
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ADMIN PANEL
function AdminPanel({ matches, setMatches, participants, setParticipants, adminUnlocked, setAdminUnlocked, invoices, setInvoices }) {
  const [authed, setAuthed] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [activeGroup, setActiveGroup] = useState("A");
  const [activePhase, setActivePhase] = useState("groups");
  const [activePh, setActivePh] = useState("round32");
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("results");
  const ADMIN = "2026";

  const phaseColors = {round32:"#c0392b",quarters:"#8e44ad",semis:"#e67e22",third:"#2980b9",final:"#d3172e"};
  const phaseLabels = {round32:"Octavos de Final",quarters:"Cuartos de Final",semis:"Semifinales",third:"Tercer Lugar",final:"Gran Final"};
  const groupMatches = matches.filter(m=>m.phase==="groups");
  const elimMatches = matches.filter(m=>m.phase!=="groups");
  const phases = [...new Set(elimMatches.map(m=>m.phase))];
  const pendingInvoices = invoices.filter(inv=>inv.status==="pending");

  function setResult(matchId, side, val) {
    const v = val===""?null:Math.max(0,parseInt(val)||0);
    setMatches(prev=>prev.map(m=>m.id===matchId?{...m,[side==="home"?"realHome":"realAway"]:v}:m));
  }

  function setTeamName(matchId, side, val) {
    setMatches(prev=>prev.map(m=>m.id===matchId?{...m,[side==="home"?"home":"away"]:val}:m));
  }

  async function handleSave() {
    try {
      await setDoc(MATCHES_DOC, {list: matches});
      setSaved(true);
      setTimeout(()=>setSaved(false),2000);
    } catch(e) { alert("Error: "+e.message); }
  }

  async function toggleUnlock(phase) {
    const updated = {...adminUnlocked, [phase]:!adminUnlocked[phase]};
    setAdminUnlocked(updated);
    await setDoc(SETTINGS_DOC, {adminUnlocked: updated});
  }

  async function handleInvoice(invoiceId, action) {
    const updated = invoices.map(inv=>
      inv.id===invoiceId ? {...inv, status:action, reviewedAt:new Date().toISOString()} : inv
    );
    await setDoc(INVOICES_DOC, {list: updated});
    setInvoices(updated);
  }

  function removeParticipant(id) {
    if (!window.confirm("Eliminar este participante?")) return;
    const updated = participants.filter(p=>p.id!==id);
    setParticipants(updated);
    setDoc(PARTICIPANTS_DOC, {list: updated});
  }

  if (!authed) return (
    <div style={{maxWidth:360,margin:"0 auto"}}>
      <div style={S.card}>
        <div style={S.sectionTitle}>Panel de Administrador</div>
        <input style={{...S.input,marginBottom:14}} type="password" placeholder="PIN administrador"
          value={pinInput} onChange={e=>setPinInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&(pinInput===ADMIN?setAuthed(true):alert("PIN incorrecto"))} />
        <button style={S.btn()} onClick={()=>pinInput===ADMIN?setAuthed(true):alert("PIN incorrecto")}>
          Entrar como Admin
        </button>
      </div>
    </div>
  );

  return (
    <div className="fi">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[["results","Resultados"],["invoices","Facturas"+(pendingInvoices.length>0?" ("+pendingInvoices.length+")":"")],["teams","Equipos"],["locks","Bloqueos"],["users","Participantes"]].map(([t,l])=>(
            <button key={t} style={{...S.navBtn(activeTab===t),background:t==="invoices"&&pendingInvoices.length>0&&activeTab!==t?"#e67e2222":undefined}} onClick={()=>setActiveTab(t)}>{l}</button>
          ))}
        </div>
        <button style={{...S.btn(saved?"#27ae60":"#d3172e"),fontSize:"0.8rem"}} onClick={handleSave}>
          {saved?"Guardado!":"Guardar Resultados"}
        </button>
      </div>

      {activeTab==="invoices" && (
        <div>
          <div style={S.sectionTitle}>Facturas Pendientes de Aprobacion</div>
          {pendingInvoices.length===0 && (
            <div style={{color:"#9ca3af",padding:20,textAlign:"center"}}>No hay facturas pendientes</div>
          )}
          {invoices.map(inv=>(
            <div key={inv.id} style={S.invoiceCard(inv.status)}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:"0.9rem"}}>{inv.participantName}</div>
                <div style={{color:"#6b7280",fontSize:"0.78rem",marginTop:2}}>
                  Factura: <strong style={{color:"#111827"}}>{inv.invoiceNum}</strong>
                  &nbsp;|&nbsp; Monto: <strong style={{color:"#d3172e"}}>${inv.amount} CAD</strong>
                  &nbsp;|&nbsp; Pts: <strong style={{color:"#16a34a"}}>{inv.points}</strong>
                </div>
                <div style={{fontSize:"0.72rem",color:"#9ca3af",marginTop:2}}>
                  {new Date(inv.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <div style={S.statusBadge(inv.status)}>
                  {inv.status==="approved"?"Aprobada":inv.status==="rejected"?"Rechazada":"Pendiente"}
                </div>
                {inv.status==="pending" && (
                  <>
                    <button style={{...S.btn("#27ae60"),fontSize:"0.78rem",padding:"5px 12px"}}
                      onClick={()=>handleInvoice(inv.id,"approved")}>Aprobar</button>
                    <button style={{...S.btn("#c0392b",true),fontSize:"0.78rem",padding:"5px 12px"}}
                      onClick={()=>handleInvoice(inv.id,"rejected")}>Rechazar</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab==="results" && (
        <>
          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
            {["groups","elim"].map(ph=>(
              <button key={ph} style={S.navBtn(activePhase===ph)} onClick={()=>setActivePhase(ph)}>
                {ph==="groups"?"Grupos":"Eliminatorias"}
              </button>
            ))}
          </div>
          {activePhase==="groups" && (
            <>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
                {Object.keys(GROUPS).map(g=>(
                  <button key={g} style={{...S.navBtn(activeGroup===g),background:activeGroup===g?GROUP_COLORS[g]:"transparent",borderColor:GROUP_COLORS[g],color:activeGroup===g?"#fff":GROUP_COLORS[g],padding:"4px 10px",fontSize:"0.75rem"}} onClick={()=>setActiveGroup(g)}>Grp {g}</button>
                ))}
              </div>
              <div style={S.groupHeader(GROUP_COLORS[activeGroup])}>GRUPO {activeGroup}</div>
              {groupMatches.filter(m=>m.group===activeGroup).map(m=>(
                <div key={m.id} style={{display:"grid",gridTemplateColumns:"38px 1fr 46px 12px 46px 1fr 24px",gap:5,alignItems:"center",background:"#f9fafb",border:"1px solid #1e2d4a",borderRadius:8,padding:"6px 10px",marginBottom:5}}>
                  <span style={{color:"#9ca3af",fontSize:"0.7rem"}}>{m.date}</span>
                  <div style={{textAlign:"right",fontWeight:600,fontSize:"0.82rem"}}>{m.home}</div>
                  <input type="number" min="0" max="99" placeholder="-" style={S.scoreInput}
                    value={m.realHome??""} onChange={e=>setResult(m.id,"home",e.target.value)} />
                  <span style={{color:"#9ca3af",fontSize:"0.68rem",textAlign:"center"}}>VS</span>
                  <input type="number" min="0" max="99" placeholder="-" style={S.scoreInput}
                    value={m.realAway??""} onChange={e=>setResult(m.id,"away",e.target.value)} />
                  <div style={{fontWeight:600,fontSize:"0.82rem"}}>{m.away}</div>
                  <span style={{fontSize:"0.8rem",color:m.realHome!==null?"#27ae60":"#9ca3af"}}>
                    {m.realHome!==null?"OK":"..."}
                  </span>
                </div>
              ))}
            </>
          )}
          {activePhase==="elim" && (
            <>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
                {phases.map(ph=>(
                  <button key={ph} style={{...S.navBtn(activePh===ph),background:activePh===ph?phaseColors[ph]:"transparent",borderColor:phaseColors[ph]+"88",color:activePh===ph?"#fff":phaseColors[ph],fontSize:"0.75rem",padding:"4px 10px"}} onClick={()=>setActivePh(ph)}>{phaseLabels[ph]}</button>
                ))}
              </div>
              <div style={S.phaseHeader(phaseColors[activePh])}>{phaseLabels[activePh]}</div>
              {elimMatches.filter(m=>m.phase===activePh).map(m=>(
                <div key={m.id} style={{display:"grid",gridTemplateColumns:"38px 1fr 46px 12px 46px 1fr 24px",gap:5,alignItems:"center",background:"#f9fafb",border:"1px solid #1e2d4a",borderRadius:8,padding:"6px 10px",marginBottom:5}}>
                  <span style={{color:"#9ca3af",fontSize:"0.7rem"}}>{m.date}</span>
                  <div style={{textAlign:"right",fontWeight:600,fontSize:"0.82rem",color:"#6b7280"}}>{m.home}</div>
                  <input type="number" min="0" max="99" placeholder="-" style={S.scoreInput}
                    value={m.realHome??""} onChange={e=>setResult(m.id,"home",e.target.value)} />
                  <span style={{color:"#9ca3af",fontSize:"0.68rem",textAlign:"center"}}>VS</span>
                  <input type="number" min="0" max="99" placeholder="-" style={S.scoreInput}
                    value={m.realAway??""} onChange={e=>setResult(m.id,"away",e.target.value)} />
                  <div style={{fontWeight:600,fontSize:"0.82rem",color:"#6b7280"}}>{m.away}</div>
                  <span style={{fontSize:"0.8rem",color:m.realHome!==null?"#27ae60":"#9ca3af"}}>
                    {m.realHome!==null?"OK":"..."}
                  </span>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {activeTab==="teams" && (
        <div>
          <p style={{color:"#6b7280",marginBottom:14,fontSize:"0.85rem"}}>Actualiza los equipos eliminatorias.</p>
          {phases.map(ph=>(
            <div key={ph}>
              <div style={S.phaseHeader(phaseColors[ph])}>{phaseLabels[ph]}</div>
              {elimMatches.filter(m=>m.phase===ph).map((m)=>(
                <div key={m.id} style={{display:"grid",gridTemplateColumns:"1fr 30px 1fr",gap:6,alignItems:"center",marginBottom:7}}>
                  <input style={{...S.input,textAlign:"right",marginBottom:0}} value={m.home}
                    onChange={e=>setTeamName(m.id,"home",e.target.value)} />
                  <div style={{textAlign:"center",color:"#9ca3af",fontWeight:700}}>VS</div>
                  <input style={{...S.input,marginBottom:0}} value={m.away}
                    onChange={e=>setTeamName(m.id,"away",e.target.value)} />
                </div>
              ))}
            </div>
          ))}
          <button style={{...S.btn(),marginTop:14}} onClick={handleSave}>Guardar Equipos</button>
        </div>
      )}

      {activeTab==="locks" && (
        <div>
          <p style={{color:"#6b7280",marginBottom:14,fontSize:"0.85rem"}}>Desbloquea una fase si hubo un error legitimo.</p>
          {[
            {phase:"groups",label:"Fase de Grupos",lockDate:"10 Jun 2026",color:"#1F618D"},
            {phase:"round32",label:"Octavos de Final",lockDate:"1 Jul 2026",color:"#c0392b"},
            {phase:"quarters",label:"Cuartos de Final",lockDate:"3 Jul 2026",color:"#8e44ad"},
            {phase:"semis",label:"Semifinales",lockDate:"14 Jul 2026",color:"#e67e22"},
            {phase:"third",label:"Tercer Lugar",lockDate:"17 Jul 2026",color:"#2980b9"},
            {phase:"final",label:"Gran Final",lockDate:"18 Jul 2026",color:"#d3172e"},
          ].map(({phase,label,lockDate,color})=>{
            const autoLocked=isPhaseLocked(phase,{});
            const manUnlocked=!!adminUnlocked[phase];
            const currentlyLocked=autoLocked&&!manUnlocked;
            return (
              <div key={phase} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f9fafb",border:"1px solid "+color+"44",borderRadius:10,padding:"12px 16px",marginBottom:8,flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontWeight:700,fontSize:"0.95rem"}}>{label}</div>
                  <div style={{fontSize:"0.75rem",color:"#9ca3af",marginTop:2}}>Bloqueo: {lockDate}</div>
                  <div style={{fontSize:"0.8rem",marginTop:3,color:currentlyLocked?"#e74c3c":"#2ecc71"}}>
                    {currentlyLocked?"Bloqueado":autoLocked?"Desbloqueado por admin":"Abierto"}
                  </div>
                </div>
                {autoLocked && (
                  <button style={{...S.btn(manUnlocked?"#27ae60":"#c0392b",true),fontSize:"0.78rem",padding:"6px 12px"}}
                    onClick={()=>toggleUnlock(phase)}>
                    {manUnlocked?"Volver a Bloquear":"Desbloquear"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab==="users" && (
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <div style={{...S.sectionTitle,marginBottom:0,borderBottom:"none"}}>{participants.length} Participantes</div>
            <button style={{...S.btn("#16a34a"),fontSize:"0.8rem",padding:"7px 14px"}} onClick={()=>{
              const ranked = [...participants].map(p=>{
                const userInv=(invoices||[]).filter(inv=>inv.participantId===p.id&&inv.status==="approved");
                const invPts=userInv.reduce((sum,inv)=>sum+calcInvoicePoints(inv.amount),0);
                let gamePts=0;
                matches.forEach(m=>{const pred=p.predictions?.[m.id];if(!pred)return;const pts=calcPoints(pred.home,pred.away,m.realHome,m.realAway);if(pts!==null)gamePts+=pts;});
                const {bonus:classPts}=calcClassificationBonus(p.predictions,matches);
                return {...p,_total:gamePts+invPts+classPts,_invPts:invPts,_classPts:classPts};
              }).sort((a,b)=>b._total-a._total);
              const headers = ["Posicion","Nombre","Apellido","Correo","Telefono","Sucursal","Puntos Pronosticos","Puntos Clasificados","Puntos Facturas","Total Puntos","Facturas Registradas","Fecha Registro"];
              const rows = ranked.map((p,i)=>[
                i+1,
                p.nombre||p.name||"",
                p.apellido||"",
                p.email||"",
                p.telefono||"",
                p.sucursal||"",
                p._total-p._invPts-p._classPts,
                p._classPts||0,
                p._invPts,
                p._total,
                (invoices||[]).filter(inv=>inv.participantId===p.id).length,
                p.createdAt?new Date(p.createdAt).toLocaleDateString():"",
              ]);
              const csv = [headers,...rows].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\n");
              const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href=url; a.download="participantes-mundial2026.csv"; a.click();
              URL.revokeObjectURL(url);
            }}>
              Exportar a Excel (CSV)
            </button>
          </div>
          {participants.length===0 && <div style={{color:"#9ca3af",padding:16}}>Sin participantes</div>}
          {[...participants].map(p=>{
            const userInv=(invoices||[]).filter(inv=>inv.participantId===p.id&&inv.status==="approved");
            const invPts=userInv.reduce((sum,inv)=>sum+calcInvoicePoints(inv.amount),0);
            const totalInv=(invoices||[]).filter(inv=>inv.participantId===p.id).length;
            let gamePts=0,exact=0,correct=0;
            matches.forEach(m=>{const pred=p.predictions?.[m.id];if(!pred)return;const pts=calcPoints(pred.home,pred.away,m.realHome,m.realAway);if(pts===null)return;gamePts+=pts;if(pts===5)exact++;if(pts>=3)correct++;});
            const {bonus:classPts}=calcClassificationBonus(p.predictions,matches);
            return {...p,_total:gamePts+invPts+classPts,_invPts:invPts,_classPts:classPts,_exact:exact,_correct:correct,_totalInv:totalInv};
          }).sort((a,b)=>b._total-a._total).map((p,i)=>(
              <div key={p.id} style={{...S.leaderRow(i),justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{color:"#9ca3af",fontWeight:700,minWidth:24}}>#{i+1}</span>
                  <div>
                    <div style={{fontWeight:700,color:BRAND.gray900}}>{p.name}</div>
                    <div style={{fontSize:"0.72rem",color:"#9ca3af"}}>
                      {p.email && <span>{p.email} &nbsp;|&nbsp; </span>}
                      {p.sucursal && <span style={{color:BRAND.red,fontWeight:600}}>{p.sucursal} &nbsp;|&nbsp; </span>}
                      {Object.keys(p.predictions||{}).length} pronosticos
                      &nbsp;|&nbsp; {p._totalInv} facturas
                      {p._invPts>0 && <span style={{color:BRAND.red}}> | +{p._invPts}pts facturas</span>}
                      {p._classPts>0 && <span style={{color:"#7c3aed"}}> | +{p._classPts}pts clasificados</span>}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"1.3rem",fontWeight:800,color:BRAND.red}}>{p._total}</div>
                    <div style={{fontSize:"0.68rem",color:"#9ca3af"}}>pts</div>
                  </div>
                  <button onClick={()=>removeParticipant(p.id)}
                    style={{background:"transparent",border:"1px solid #dc262644",color:"#dc2626",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:"0.78rem"}}>
                    X
                  </button>
                </div>
              </div>
          ))}
        </div>
      )}
    </div>
  );
}

// MAIN APP
export default function App() {
  const [view, setView] = useState("leaderboard");
  const [matches, setMatches] = useState(INITIAL_MATCHES);
  const [participants, setParticipants] = useState([]);
  const [adminUnlocked, setAdminUnlocked] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubP = onSnapshot(PARTICIPANTS_DOC, snap => {
      if (snap.exists()) setParticipants(snap.data().list || []);
    });
    const unsubM = onSnapshot(MATCHES_DOC, snap => {
      if (snap.exists()) setMatches(snap.data().list || INITIAL_MATCHES);
    });
    const unsubS = onSnapshot(SETTINGS_DOC, snap => {
      if (snap.exists()) setAdminUnlocked(snap.data().adminUnlocked || {});
    });
    const unsubI = onSnapshot(INVOICES_DOC, snap => {
      if (snap.exists()) setInvoices(snap.data().list || []);
      setLoading(false);
    });
    setTimeout(() => setLoading(false), 3000);
    return () => { unsubP(); unsubM(); unsubS(); unsubI(); };
  }, []);

  const tabs = [
    {id:"leaderboard", label:"Clasificacion"},
    {id:"form", label:"Mis Pronosticos"},
    {id:"fixture", label:"Fixture"},
    {id:"admin", label:"Admin"},
  ];

  const totalMatches = matches.filter(m=>m.realHome!==null).length;
  const pendingInv = invoices.filter(i=>i.status==="pending").length;

  if (loading) return (
    <div style={{...S.app,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <FontStyle />
      <div style={{textAlign:"center"}}>
        <img src="https://www.nuevaweb.saborlatino.ca/wp-content/uploads/2025/04/Logo-Sabor-Latino_.jpg"
          alt="Sabor Latino" style={{height:60,marginBottom:16,opacity:.8}} />
        <div style={{fontSize:"2rem",marginBottom:8,color:BRAND.red}} className="pulse">...</div>
        <div style={{color:BRAND.gray400,fontSize:"0.85rem",letterSpacing:3}}>CARGANDO...</div>
      </div>
    </div>
  );

  return (
    <div style={S.app}>
      <FontStyle />
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logo}>
            <img
              src="https://www.nuevaweb.saborlatino.ca/wp-content/uploads/2025/04/Logo-Sabor-Latino_.jpg"
              alt="Sabor Latino"
              style={{height:44, width:"auto", objectFit:"contain", borderRadius:4}}
              onError={e=>{e.target.style.display="none";}}
            />
            <div>
              <div style={{fontSize:"0.65rem",color:BRAND.red,fontWeight:800,letterSpacing:2,textTransform:"uppercase"}}>Concurso</div>
              <div style={{fontSize:"1rem",fontWeight:800,color:BRAND.gray900,letterSpacing:1}}>Mundial 2026</div>
            </div>
          </div>
          <nav style={S.nav}>
            {tabs.map(t=>(
              <button key={t.id} style={S.navBtn(view===t.id)} onClick={()=>setView(t.id)}>
                {t.label}
                {t.id==="admin"&&pendingInv>0 && (
                  <span style={{background:BRAND.red,color:"#fff",borderRadius:"50%",padding:"1px 6px",fontSize:"0.7rem",marginLeft:5}}>{pendingInv}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div style={{background:BRAND.red,padding:"4px 16px",textAlign:"center",fontSize:"0.7rem",color:"rgba(255,255,255,0.85)",letterSpacing:1}}>
          {participants.length} PARTICIPANTES &nbsp;|&nbsp; {totalMatches} PARTIDOS &nbsp;|&nbsp; 11 JUN - 19 JUL 2026
        </div>
      </header>

      <main style={S.main}>
        {view==="leaderboard" && <Leaderboard participants={participants} matches={matches} invoices={invoices} />}
        {view==="form" && <ParticipantForm participants={participants} setParticipants={setParticipants} matches={matches} adminUnlocked={adminUnlocked} invoices={invoices} setInvoices={setInvoices} />}
        {view==="fixture" && <FixtureView matches={matches} />}
        {view==="admin" && <AdminPanel matches={matches} setMatches={setMatches} participants={participants} setParticipants={setParticipants} adminUnlocked={adminUnlocked} setAdminUnlocked={setAdminUnlocked} invoices={invoices} setInvoices={setInvoices} />}
      </main>
    </div>
  );
}
