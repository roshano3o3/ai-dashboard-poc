"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  PieChart, Pie, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  StoryStrip, ExecutiveBrief, SpotlightCard,
  SectionHeader, KpiGrid, CopilotChips,
} from "./DashboardPolish";
import ExportButton from "./ExportButton";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || "";
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const COLORS = ["#818CF8","#34D399","#FB923C","#F472B6","#38BDF8","#A78BFA","#FBBF24","#4ADE80"];
const GLOW   = ["rgba(129,140,248,0.6)","rgba(52,211,153,0.6)","rgba(251,146,60,0.6)","rgba(244,114,182,0.6)","rgba(56,189,248,0.6)","rgba(167,139,250,0.6)","rgba(251,191,36,0.6)","rgba(74,222,128,0.6)"];

type UniversalRow  = { id?: string; user_id?: string; dataset_name: string; column_names: string[] | null; row_data: Record<string,any> | null; created_at?: string; };
type KPI           = { id: string; title: string; value: string|number; subtitle?: string; icon: string; color: string; };
type ChartSpec     = { id: string; type: "pie"|"bar"|"line"|"donut"; title: string; subtitle: string; data: {name:string;value:number}[]; insight: string; detailedInsight: string; };
type Insight       = { icon: string; title: string; text: string; details: string; recommendation?: string; };
type DashboardResult = { kpis: KPI[]; charts: ChartSpec[]; insights: Insight[]; findings: string[]; summary: string; executive?: { takeaway:string; risk:string; action:string; confidence:"Low"|"Medium"|"High" }; };
type ChatMessage   = { role: "user"|"assistant"; content: string; time: string; };
type FilterState   = { [columnName: string]: string };
type Toast         = { id: string; message: string; kind: "info"|"success"|"warning"|"error" };

function isNil(v:any){ return v===null||v===undefined; }
function toNum(v:any): number|null { if(isNil(v)) return null; const n=typeof v==="number"?v:parseFloat(String(v)); return Number.isFinite(n)?n:null; }
function safeLabel(s:any,max=20){ const str=String(s??"").trim(); if(!str) return "Unknown"; return str.length>max?str.slice(0,max-1)+"…":str; }
function uid(){ return Math.random().toString(16).slice(2)+Date.now().toString(16); }
function pct(part:number,total:number){ if(!total) return "0%"; return `${((part/total)*100).toFixed(1)}%`; }

const STARS = Array.from({length:80},(_,i)=>({
  size: i%11===0?3.5:i%5===0?2.5:i%3===0?1.5:1,
  top:  `${(i*13.7)%100}%`,
  left: `${(i*17.3+9)%100}%`,
  opacity: 0.08+(i%7)*0.06,
  blur: i%13===0?2:0,
}));

export default function DashboardPage() {
  const router = useRouter();
  const [loading,         setLoading]         = useState(true);
  const [fatalError,      setFatalError]       = useState("");
  const [userEmail,       setUserEmail]        = useState("");
  const [userId,          setUserId]           = useState("");
  const [showDashboard,   setShowDashboard]    = useState(true);
  const [dashboardData,   setDashboardData]    = useState<DashboardResult|null>(null);
  const [allData,         setAllData]          = useState<UniversalRow[]>([]);
  const [selectedDataset, setSelectedDataset]  = useState("");
  const [availableDatasets, setAvailableDatasets] = useState<string[]>([]);
  const [filters,         setFilters]          = useState<FilterState>({});
  const [availableFilters,setAvailableFilters] = useState<{[column:string]:string[]}>({});
  const [lastUpdate,      setLastUpdate]       = useState(new Date());
  const [chartTypes,      setChartTypes]       = useState<{[id:string]:"pie"|"bar"|"line"|"donut"}>({});
  const datasetCache = useRef(new Map<string,{data:UniversalRow[];filters:{[col:string]:string[]}}>());
  const [toasts,          setToasts]           = useState<Toast[]>([]);
  const GUIDED_KEY="rk_guided_done_v1";
  const [guidedMode,      setGuidedMode]       = useState(false);
  const [collapse,        setCollapse]         = useState({quickStart:false,filters:true,kpis:false,viz:false});
  const WELCOME_KEY="rk_welcome_dismissed_v1";
  const [showWelcome,     setShowWelcome]      = useState(false);
  const [chatOpen,        setChatOpen]         = useState(false);
  const [messages,        setMessages]         = useState<ChatMessage[]>([]);
  const [input,           setInput]            = useState("");
  const [chatLoading,     setChatLoading]      = useState(false);
  const messagesEndRef = useRef<HTMLDivElement|null>(null);
  const [datasetPanelOpen,setDatasetPanelOpen] = useState(false);
  const [hoveredDs,       setHoveredDs]        = useState<string|null>(null);

  const pushToast = useCallback((message:string, kind:Toast["kind"]="info")=>{
    const id=uid(); setToasts(p=>[...p,{id,message,kind}]);
    window.setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3200);
  },[]);

  useEffect(()=>{ if(!chatOpen) return; messagesEndRef.current?.scrollIntoView({behavior:"smooth"}); },[chatOpen,messages]);

  useEffect(()=>{
    if(typeof window==="undefined") return;
    try {
      const done=window.localStorage.getItem(GUIDED_KEY);
      const first=!done;
      setGuidedMode(first);
      if(first){ setChatOpen(false); setCollapse(p=>({...p,filters:true,kpis:true,viz:true,quickStart:false})); }
      else     { setChatOpen(true);  setCollapse(p=>({...p,filters:false,kpis:false,viz:false,quickStart:true})); }
    } catch {}
  },[]);

  useEffect(()=>{
    if(typeof window==="undefined") return;
    try { const d=window.localStorage.getItem(WELCOME_KEY); if(!d) setShowWelcome(true); } catch {}
  },[]);

  const dismissWelcome = ()=>{ setShowWelcome(false); try{window.localStorage.setItem(WELCOME_KEY,"1");}catch{} };

  const extractFilters = useCallback((data:UniversalRow[])=>{
    const fo:{[col:string]:Set<string>}={};
    for(const row of data){ const rd=row.row_data||{}; for(const col in rd){ const val=rd[col]; if(isNil(val)) continue; if(!fo[col]) fo[col]=new Set(); if(fo[col].size<50) fo[col].add(String(val)); } }
    const result:{[col:string]:string[]}={};
    for(const col in fo){ const vals=Array.from(fo[col]); if(vals.length>=2&&vals.length<=20){ const allNum=vals.every(v=>!isNaN(parseFloat(v))); if(!allNum) result[col]=vals.sort(); } }
    return result;
  },[]);

  const applyFilters = useCallback((data:UniversalRow[], fs:FilterState):UniversalRow[]=>{
    if(!Object.keys(fs).length) return data;
    return data.filter(row=>{ const rd=row.row_data||{}; for(const col in fs){ const fv=fs[col]; if(fv==="All") continue; if(String(rd[col]??"")!==fv) return false; } return true; });
  },[]);

  const generateDashboard = useMemo(()=>{
    return (data:UniversalRow[], fs:FilterState):DashboardResult=>{
      const filtered=applyFilters(data,fs);
      const totalRecords=filtered.length;
      const colSet=new Set<string>();
      for(const row of filtered){ const cols=row.column_names||[]; for(const c of cols) colSet.add(String(c)); }
      const columns=Array.from(colSet);
      type CP={name:string;totalCount:number;numericCount:number;numericSum:number;numericMax:number;numericMin:number;uniques:Map<string,number>};
      const profiles:CP[]=columns.map(name=>({name,totalCount:0,numericCount:0,numericSum:0,numericMax:Number.NEGATIVE_INFINITY,numericMin:Number.POSITIVE_INFINITY,uniques:new Map()}));
      const pi=new Map<string,CP>(); profiles.forEach(p=>pi.set(p.name,p));
      for(const row of filtered){ const rd=row.row_data||{}; for(const col of columns){ const v=rd[col]; if(isNil(v)) continue; const prof=pi.get(col)!; prof.totalCount++; const n=toNum(v); if(n!==null){prof.numericCount++;prof.numericSum+=n;if(n>prof.numericMax)prof.numericMax=n;if(n<prof.numericMin)prof.numericMin=n;} if(prof.uniques.size<200){const key=safeLabel(v,60);prof.uniques.set(key,(prof.uniques.get(key)||0)+1);} } }
      const ca=profiles.map(p=>{ const uCount=p.uniques.size; const isNum=p.numericCount>0&&p.numericCount/Math.max(1,p.totalCount)>0.9; const isCat=!isNum&&uCount>=2&&uCount<=12; return{...p,uniqueCount:uCount,isNumeric:isNum,isCategorical:isCat}; });
      const kpis:KPI[]=[{id:"total",title:"Total Records",value:totalRecords,icon:"📊",color:"#818CF8"},{id:"columns",title:"Data Fields",value:columns.length,icon:"🧾",color:"#34D399"}];
      const numCols=ca.filter(c=>c.isNumeric&&c.numericCount>=5).sort((a,b)=>b.numericCount-a.numericCount);
      numCols.slice(0,2).forEach(c=>{ const avg=c.numericCount>0?c.numericSum/c.numericCount:NaN; kpis.push({id:`avg-${c.name}`,title:`Avg ${c.name}`,value:Number.isFinite(avg)?avg.toFixed(2):"—",subtitle:Number.isFinite(c.numericMin)&&Number.isFinite(c.numericMax)?`Range: ${c.numericMin.toFixed(1)} - ${c.numericMax.toFixed(1)}`:undefined,icon:"📈",color:"#FB923C"}); });
      const charts:ChartSpec[]=[];
      const catCols=ca.filter(c=>c.isCategorical&&c.uniqueCount>=2).slice(0,4);
      for(const c of catCols){ const entries=Array.from(c.uniques.entries()).map(([name,value])=>({name:safeLabel(name,22),value})).sort((a,b)=>b.value-a.value).slice(0,10); if(entries.length>=2){ const top=entries[0]; const tp=((top.value/Math.max(1,c.totalCount))*100).toFixed(1); charts.push({id:`chart-${c.name}`,type:"donut",title:`${c.name} Distribution`,subtitle:`${c.uniqueCount} categories analyzed`,data:entries,insight:`${top.name} leads with ${top.value} (${tp}%)`,detailedInsight:`${top.name} is leading at ${tp}%. Validate across filters.`}); } }
      const confidence:"Low"|"Medium"|"High"=totalRecords<50?"Low":totalRecords<200?"Medium":"High";
      const takeaway=charts.length>0?`${charts[0].title}: "${charts[0].data[0]?.name}" is the leading segment.`:`Dataset has ${totalRecords} rows across ${columns.length} fields.`;
      const rp:string[]=[]; if(totalRecords<50) rp.push(`Small sample size (${totalRecords} rows).`); if(Object.keys(fs).length>0) rp.push(`Filters applied (${Object.keys(fs).length}).`);
      const risk=rp.length?rp.join(" "):"No obvious anomaly detected.";
      const action=confidence==="Low"?"Collect more rows (target 50–200) then re-check stability.":"Use filters to validate whether the leading segment holds across subsets.";
      return{kpis,charts,insights:[{icon:"📊",title:"Data Overview",text:`Showing ${totalRecords} records across ${columns.length} fields.`,details:`This dataset includes ${totalRecords} rows and ${columns.length} detected fields.`,recommendation:confidence==="Low"?"Upload more data.":"Good data volume."}],findings:charts[0]?.data?.[0]?[`${charts[0].data[0].name} is dominant in ${charts[0].title}.`]:[],summary:`${totalRecords} records analyzed with ${charts.length} visualization(s)`,executive:{takeaway,risk,action,confidence}};
    };
  },[applyFilters]);

  const fetchData = useCallback(async()=>{
    if(!supabase||!userId) return;
    try {
      const {data:records,error:dbErr}=await supabase.from("universal_data").select("*").eq("user_id",userId).order("created_at",{ascending:false});
      if(dbErr){console.error("Fetch error:",dbErr);return;}
      const rows=(records||[]) as UniversalRow[];
      if(!rows.length){setShowDashboard(false);setAllData([]);return;}
      setAllData(rows); setLastUpdate(new Date());
      const datasets=Array.from(new Set(rows.map(r=>r.dataset_name))).filter(Boolean);
      setAvailableDatasets(datasets);
      if(selectedDataset){ const dr=rows.filter(r=>r.dataset_name===selectedDataset); const df=extractFilters(dr); datasetCache.current.set(selectedDataset,{data:dr,filters:df}); setAvailableFilters(df); setDashboardData(generateDashboard(dr,filters)); }
    } catch(e:any){console.error("Realtime fetch error:",e);}
  },[userId,selectedDataset,filters,extractFilters,generateDashboard]);

  useEffect(()=>{
    (async()=>{
      try{
        setLoading(true);
        if(!supabase){setFatalError("Missing Supabase env");setLoading(false);return;}
        const{data,error}=await supabase.auth.getUser();
        if(error){setFatalError(`Auth error: ${error.message}`);setLoading(false);return;}
        const user=data.user as User|null;
        if(!user){router.push("/auth");return;}
        setUserEmail(user.email||""); setUserId(user.id);
        const{data:records,error:dbErr}=await supabase.from("universal_data").select("*").eq("user_id",user.id).order("created_at",{ascending:false});
        if(dbErr){setFatalError(`DB error: ${dbErr.message}`);setLoading(false);return;}
        const rows=(records||[]) as UniversalRow[];
        if(!rows.length){
          setShowDashboard(false);
          setMessages([{role:"assistant",content:"👋 Welcome! Upload your first dataset to get started.",time:new Date().toLocaleTimeString()}]);
          pushToast('Welcome! Click "Upload" to begin.',"info");
          setLoading(false);return;
        }
        setAllData(rows);
        const datasets=Array.from(new Set(rows.map(r=>r.dataset_name))).filter(Boolean);
        setAvailableDatasets(datasets);
        const latest=rows[0].dataset_name;
        setSelectedDataset(latest);
        const dr=rows.filter(r=>r.dataset_name===latest);
        const df=extractFilters(dr);
        datasetCache.current.set(latest,{data:dr,filters:df});
        setAvailableFilters(df);
        const result=generateDashboard(dr,{});
        setDashboardData(result);
        setMessages([{role:"assistant",content:`🎉 Dashboard ready for "${latest}". Real-time updates enabled!`,time:new Date().toLocaleTimeString()}]);
        pushToast(`Dashboard ready: ${latest}`,"success");
        setLoading(false);
      }catch(e:any){setFatalError(e?.message||"Unknown error");setLoading(false);}
    })();
  },[router,pushToast,extractFilters,generateDashboard]);

  useEffect(()=>{ if(!userId) return; const iv=setInterval(()=>fetchData(),30000); return()=>clearInterval(iv); },[userId,fetchData]);

  const switchDataset=useCallback((ds:string)=>{
    setSelectedDataset(ds); setFilters({}); setChartTypes({}); setDatasetPanelOpen(false);
    let dr:UniversalRow[]; let df:{[col:string]:string[]};
    if(datasetCache.current.has(ds)){const c=datasetCache.current.get(ds)!;dr=c.data;df=c.filters;}
    else{dr=allData.filter(r=>r.dataset_name===ds);df=extractFilters(dr);datasetCache.current.set(ds,{data:dr,filters:df});}
    setAvailableFilters(df); setDashboardData(generateDashboard(dr,{}));
    setMessages(p=>[...p,{role:"assistant",content:`✅ Switched to "${ds}".`,time:new Date().toLocaleTimeString()}]);
    pushToast(`Switched: ${ds}`,"info");
  },[allData,extractFilters,generateDashboard,pushToast]);

  const handleFilterChange=useCallback((column:string,value:string)=>{
    const next={...filters}; if(value==="All") delete next[column]; else next[column]=value;
    setFilters(next);
    const dr=allData.filter(r=>r.dataset_name===selectedDataset);
    setDashboardData(generateDashboard(dr,next));
    pushToast(`Filter: ${column} = ${value}`,"info");
  },[filters,allData,selectedDataset,generateDashboard,pushToast]);

  const clearAllFilters=useCallback(()=>{
    setFilters({}); const dr=allData.filter(r=>r.dataset_name===selectedDataset);
    setDashboardData(generateDashboard(dr,{})); pushToast("Filters cleared","info");
  },[allData,selectedDataset,generateDashboard,pushToast]);

  const handleLogout=async()=>{ if(!supabase) return; await supabase.auth.signOut(); router.push("/auth"); };

  const callAI=async(q:string)=>{
    if(!GROQ_API_KEY) return "⚠️ GROQ key missing.";
    try{
      let ctx="";
      if(selectedDataset&&dashboardData&&allData.length>0){ const dr=allData.filter(r=>r.dataset_name===selectedDataset); const sd=dr.slice(0,10).map(r=>r.row_data); ctx=`\nDATASET: "${selectedDataset}"\nTotal: ${dr.length}\nSAMPLE: ${JSON.stringify(sd,null,2)}\n`; }
      const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${GROQ_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:"llama-3.3-70b-versatile",messages:[{role:"system",content:`You are a data analyst.\n\n${ctx}`},{role:"user",content:q}],max_tokens:700,temperature:0.7})});
      if(!res.ok) return "⚠️ AI unavailable.";
      const d=await res.json(); return d.choices?.[0]?.message?.content||"No response.";
    }catch(e){console.error(e);return "⚠️ Error.";}
  };

  const handleSend=async()=>{
    if(!input.trim()||chatLoading) return;
    const q=input.trim(); setInput(""); setChatLoading(true);
    setMessages(p=>[...p,{role:"user",content:q,time:new Date().toLocaleTimeString()}]);
    const ai=await callAI(q);
    setMessages(p=>[...p,{role:"assistant",content:ai,time:new Date().toLocaleTimeString()}]);
    setChatLoading(false);
  };

  const toggleGuided=()=>{
    setGuidedMode(prev=>{
      const next=!prev;
      try{if(typeof window!=="undefined"){if(!next)window.localStorage.setItem(GUIDED_KEY,"1");else window.localStorage.removeItem(GUIDED_KEY);}}catch{}
      if(next){setChatOpen(false);setCollapse(p=>({...p,filters:true,kpis:true,viz:true,quickStart:false}));pushToast("Guided Mode enabled","info");}
      else{setChatOpen(true);setCollapse(p=>({...p,filters:false,kpis:false,viz:false,quickStart:true}));pushToast("Pro Mode enabled","success");}
      return next;
    });
  };

  const selRows=allData.filter(r=>r.dataset_name===selectedDataset);
  const selFiltered=applyFilters(selRows,filters);

  const Section=({title,right,isCollapsed,onToggle,children}:{title:string;right?:React.ReactNode;isCollapsed:boolean;onToggle:()=>void;children:React.ReactNode})=>(
    <section style={C.section}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <button onClick={onToggle} style={{display:"flex",alignItems:"center",gap:10,border:"none",background:"transparent",color:"#fff",cursor:"pointer",padding:0}}>
          <span style={{fontSize:13,opacity:0.6,fontFamily:"monospace"}}>{isCollapsed?"▸":"▾"}</span>
          <span style={{fontSize:14,fontWeight:800,color:"rgba(255,255,255,0.92)",letterSpacing:0.2}}>{title}</span>
        </button>
        <div style={{display:"flex",alignItems:"center",gap:10}}>{right}</div>
      </div>
      {!isCollapsed&&<div style={{marginTop:14}}>{children}</div>}
    </section>
  );

  // ─── LOADING ──────────────────────────────────────────────────────────────
  if(loading) return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:72,height:72,borderRadius:22,background:"linear-gradient(135deg,#818CF8,#F472B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:950,color:"#fff",margin:"0 auto 20px",boxShadow:"0 0 40px rgba(129,140,248,0.5)"}}>R&K</div>
        <div style={{fontSize:20,fontWeight:800,color:"rgba(255,255,255,0.9)"}}>Preparing your universe…</div>
        <div style={{marginTop:8,fontSize:13,color:"rgba(255,255,255,0.4)"}}>Connecting to data</div>
      </div>
    </div>
  );

  if(fatalError) return(
    <div style={{minHeight:"100vh",padding:32,background:BG,color:"#fff"}}>
      <h2>⚠️ Error</h2>
      <pre style={{background:"rgba(239,68,68,0.1)",padding:16,borderRadius:12,color:"#FCA5A5",border:"1px solid rgba(239,68,68,0.25)"}}>{fatalError}</pre>
    </div>
  );

  if(!showDashboard||!allData.length) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:BG,padding:24,position:"relative",overflow:"hidden"}}>
      {STARS.map((s,i)=><div key={i} style={{position:"fixed",width:s.size,height:s.size,borderRadius:"50%",background:"#fff",top:s.top,left:s.left,opacity:s.opacity,filter:s.blur?`blur(${s.blur}px)`:"none",pointerEvents:"none"}}/>)}
      <div style={{position:"relative",zIndex:1,maxWidth:580,width:"100%",background:"rgba(10,14,30,0.90)",border:"1px solid rgba(129,140,248,0.22)",borderRadius:28,padding:52,boxShadow:"0 0 80px rgba(129,140,248,0.18),0 24px 60px rgba(0,0,0,0.55)",textAlign:"center"}}>
        <div style={{width:90,height:90,borderRadius:24,background:"linear-gradient(135deg,#818CF8 0%,#F472B6 100%)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 28px",fontSize:34,fontWeight:950,color:"#fff",boxShadow:"0 0 48px rgba(129,140,248,0.55)"}}>R&K</div>
        <div style={{fontSize:28,fontWeight:950,color:"#fff",letterSpacing:-0.5,marginBottom:12}}>Welcome to R&K Analytics</div>
        <div style={{fontSize:15,color:"rgba(255,255,255,0.55)",marginBottom:40}}>AI-Powered Business Intelligence Platform</div>
        <button onClick={()=>router.push("/upload")} style={{padding:"16px 36px",borderRadius:16,border:"none",background:"linear-gradient(135deg,#818CF8 0%,#F472B6 100%)",color:"#fff",fontSize:15,fontWeight:950,cursor:"pointer",boxShadow:"0 0 32px rgba(129,140,248,0.45)",marginBottom:24}}>⬆️ Upload Your First Dataset</button>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          {[{l:"📈 Analytics",p:"/analytics"},{l:"📋 Tables",p:"/data"},{l:"🚪 Logout",p:null}].map(({l,p})=>(
            <button key={l} onClick={()=>p?router.push(p):handleLogout()} style={{padding:"12px 18px",borderRadius:14,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.80)",fontSize:13,fontWeight:800,cursor:"pointer"}}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── MAIN DASHBOARD ───────────────────────────────────────────────────────
  return(
    <div style={{minHeight:"100vh",background:BG,color:"#E2E8F0",fontFamily:"'DM Sans', 'Inter', system-ui, sans-serif",position:"relative",overflow:"hidden"}}>

      {/* ── STARFIELD ── */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
        {STARS.map((s,i)=>(
          <div key={i} style={{position:"absolute",width:s.size,height:s.size,borderRadius:"50%",background:"rgba(255,255,255,0.9)",top:s.top,left:s.left,opacity:s.opacity,filter:s.blur?`blur(${s.blur}px)`:"none"}}/>
        ))}
        <div style={{position:"absolute",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(129,140,248,0.07) 0%,transparent 70%)",top:"-20%",left:"-10%",pointerEvents:"none"}}/>
        <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(244,114,182,0.06) 0%,transparent 70%)",bottom:"0%",right:"5%",pointerEvents:"none"}}/>
      </div>

      {/* ── TOPBAR ── */}
      <header style={C.topbar}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={C.logo}>R&K</div>
          <div>
            <div style={{fontSize:14,fontWeight:900,color:"#fff",letterSpacing:-0.2}}>R&K Analytics</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.40)",marginTop:1}}>{userEmail}</div>
          </div>
        </div>

        {/* Center nav */}
        <div style={{display:"flex",gap:4,justifyContent:"center"}}>
          {([
            {label:"Dashboard",icon:"📊",onClick:()=>{}},
            {label:"Analytics",icon:"📈",onClick:()=>router.push("/analytics")},
            {label:"Tables",   icon:"📋",onClick:()=>router.push("/data")},
            {label:"Upload",   icon:"⬆️",onClick:()=>router.push("/upload")},
            {label:"Templates",icon:"🎨",onClick:()=>router.push("/templates")},
            {label:"Branding", icon:"⚙️",onClick:()=>router.push("/branding")},
          ] as const).map(({label,icon,onClick})=>(
            <button key={label} onClick={onClick} style={C.navBtn}>
              <span style={{fontSize:18}}>{icon}</span>
              <span style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.65)",letterSpacing:0.3}}>{label}</span>
            </button>
          ))}
        </div>

        {/* Right — Export + actions */}
        <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end"}}>
          {/* ✅ EXPORT BUTTON — added here */}
          <ExportButton
            selectedDataset={selectedDataset}
            allData={allData}
            dashboardData={dashboardData}
            onMessage={(msg)=>pushToast(msg,"info")}
          />
          <button onClick={()=>setShowWelcome(true)} style={C.pill}>✨ Welcome</button>
          <button onClick={toggleGuided} style={guidedMode?{...C.pill,borderColor:"rgba(251,191,36,0.4)",color:"#FCD34D"}:{...C.pill,borderColor:"rgba(52,211,153,0.4)",color:"#6EE7B7"}}>
            {guidedMode?"Guided":"Pro Mode"}
          </button>
          <button onClick={handleLogout} style={{...C.pill,borderColor:"rgba(248,113,113,0.35)",color:"#FCA5A5"}}>Logout</button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{display:"flex",height:"calc(100vh - 72px)",position:"relative",zIndex:1}}>
        <main style={{flex:1,overflowY:"auto",padding:"18px 20px 60px",display:"flex",flexDirection:"column",gap:14}}>

          <StoryStrip records={selFiltered.length} fields={dashboardData?.kpis?.find(k=>k.id==="columns")?.value as number} dataset={selectedDataset} executive={dashboardData?.executive} updatedAtText={lastUpdate.toLocaleTimeString()}/>

          {/* ╔══════════════════════════════════════════════╗
              ║  🌌  COSMIC DATASET COMMAND CENTER          ║
              ╚══════════════════════════════════════════════╝ */}
          <div style={C.datasetHub}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={C.activeOrb}>
                  <span style={{fontSize:22}}>🗂️</span>
                  <div style={C.orbGlow}/>
                </div>
                <div>
                  <div style={{fontSize:10,fontWeight:900,color:"rgba(129,140,248,0.70)",textTransform:"uppercase",letterSpacing:1.2,marginBottom:3}}>Active Dataset</div>
                  <div style={{fontSize:17,fontWeight:900,color:"#fff",letterSpacing:-0.3}}>{selectedDataset||"None"}</div>
                </div>
              </div>

              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <div style={C.liveBadge}>
                  <span style={C.liveDot}/>
                  <span style={{fontSize:10,fontWeight:900,letterSpacing:0.8}}>LIVE</span>
                  <span style={{fontSize:10,color:"rgba(52,211,153,0.60)"}}>· {lastUpdate.toLocaleTimeString()}</span>
                </div>
                <div style={C.statOrb}>
                  <span style={{fontSize:20,fontWeight:950,color:"#fff",lineHeight:1}}>{selFiltered.length}</span>
                  <span style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:900,textTransform:"uppercase",letterSpacing:0.6}}>records</span>
                </div>
                <button onClick={()=>setDatasetPanelOpen(p=>!p)} style={C.datasetCountBtn}>
                  <span style={{fontSize:24,fontWeight:950,color:"#818CF8",lineHeight:1}}>{availableDatasets.length}</span>
                  <span style={{fontSize:9,color:"rgba(129,140,248,0.70)",fontWeight:900,textTransform:"uppercase",letterSpacing:0.6}}>datasets</span>
                  <span style={{fontSize:11,color:"rgba(129,140,248,0.50)",marginTop:1}}>{datasetPanelOpen?"▲":"▼"}</span>
                </button>
              </div>
            </div>

            {datasetPanelOpen&&(
              <div style={{marginTop:16,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:8}}>
                {availableDatasets.map((ds,i)=>{
                  const dsRows=allData.filter(r=>r.dataset_name===ds);
                  const isActive=ds===selectedDataset;
                  const col=COLORS[i%COLORS.length];
                  const glow=GLOW[i%GLOW.length];
                  return(
                    <button key={ds} onClick={()=>switchDataset(ds)} onMouseEnter={()=>setHoveredDs(ds)} onMouseLeave={()=>setHoveredDs(null)}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:14,border:`1px solid ${isActive?col+"66":"rgba(255,255,255,0.07)"}`,background:isActive?`linear-gradient(135deg,${col}18,${col}08)`:hoveredDs===ds?"rgba(255,255,255,0.04)":"transparent",cursor:"pointer",textAlign:"left",boxShadow:isActive?`0 0 18px ${glow}26,inset 0 1px 0 rgba(255,255,255,0.06)`:"none",transition:"all 0.2s"}}>
                      <div style={{width:34,height:34,borderRadius:10,background:`${col}22`,border:`1px solid ${col}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>📁</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:900,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ds}</div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:2,fontWeight:700}}>{dsRows.length} records</div>
                      </div>
                      {isActive&&<div style={{width:7,height:7,borderRadius:"50%",background:col,boxShadow:`0 0 8px ${glow}`,flexShrink:0}}/>}
                    </button>
                  );
                })}
                <button onClick={()=>router.push("/upload")} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,padding:"12px 14px",borderRadius:14,border:"1px dashed rgba(255,255,255,0.13)",background:"transparent",cursor:"pointer",color:"rgba(255,255,255,0.40)",transition:"all 0.2s"}}>
                  <span style={{fontSize:22}}>＋</span>
                  <span style={{fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:0.6}}>Add Dataset</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Start */}
          <Section title="⚡ Quick Start" isCollapsed={collapse.quickStart} onToggle={()=>setCollapse(p=>({...p,quickStart:!p.quickStart}))}
            right={<div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"rgba(255,255,255,0.40)",fontWeight:800}}><span style={{width:6,height:6,borderRadius:"50%",background:"#34D399",display:"inline-block",boxShadow:"0 0 6px rgba(52,211,153,0.7)"}}/>Updated {lastUpdate.toLocaleTimeString()}</div>}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {[
                {n:"1) Choose a dataset",t:"Use the dataset command center above. See all available datasets at a glance.",btnLabel:"Got it",btnFn:()=>pushToast("Dataset switcher is above.","info"),primary:false},
                {n:"2) Optional: Apply filters",t:"Filter to focus your insights (region, category, status…).",btnLabel:"Open Filters",btnFn:()=>{setCollapse(p=>({...p,filters:false}));pushToast("Filters expanded","info");},primary:false},
                {n:"3) Ask the AI Copilot",t:'Ask: "What are the key insights?" or "Forecast next period."',btnLabel:"Open AI",btnFn:()=>{setChatOpen(true);pushToast("AI Assistant opened","success");if(guidedMode)setInput("What are the key insights from this dataset?");},primary:true},
              ].map(({n,t,btnLabel,btnFn,primary})=>(
                <div key={n} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:14}}>
                  <div style={{fontSize:12,fontWeight:900,color:"rgba(255,255,255,0.90)"}}>{n}</div>
                  <div style={{marginTop:7,fontSize:12,lineHeight:1.5,color:"rgba(255,255,255,0.50)",fontWeight:600}}>{t}</div>
                  <button style={primary?C.btnPrimary:C.btnGhost} onClick={btnFn}>{btnLabel}</button>
                </div>
              ))}
            </div>
          </Section>

          {/* Filters */}
          {!!Object.keys(availableFilters).length&&(
            <Section title={`🎛️ Filters${Object.keys(filters).length?` (${Object.keys(filters).length} active)`:""}`} isCollapsed={collapse.filters&&guidedMode} onToggle={()=>setCollapse(p=>({...p,filters:!p.filters}))}
              right={Object.keys(filters).length>0?<button onClick={clearAllFilters} style={{padding:"6px 12px",borderRadius:9,border:"1px solid rgba(248,113,113,0.30)",background:"rgba(248,113,113,0.10)",color:"#FCA5A5",cursor:"pointer",fontSize:11,fontWeight:900}}>Clear All</button>:<span style={{fontSize:11,color:"rgba(255,255,255,0.35)",fontWeight:700}}>Tip: start with 1 filter</span>}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
                {Object.keys(availableFilters).map(col=>(
                  <div key={col}>
                    <div style={{fontSize:10,fontWeight:900,color:"rgba(129,140,248,0.70)",marginBottom:6,textTransform:"uppercase",letterSpacing:0.8}}>{col}</div>
                    <select value={filters[col]||"All"} onChange={e=>handleFilterChange(col,e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid rgba(255,255,255,0.10)",background:"rgba(255,255,255,0.05)",color:"#fff",fontWeight:700,outline:"none",cursor:"pointer",fontSize:13}}>
                      <option value="All" style={{color:"#0B1220",background:"#fff"}}>All</option>
                      {availableFilters[col].map(val=><option key={val} value={val} style={{color:"#0B1220",background:"#fff"}}>{val}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Main content ── */}
          {showDashboard&&dashboardData&&(
            <>
              <SectionHeader title="Executive Brief" subtitle="Takeaway, risk, and next action (boardroom ready)"/>
              <ExecutiveBrief executive={dashboardData.executive}/>
              <CopilotChips onPick={q=>{setChatOpen(true);setInput(q);pushToast("Prompt loaded in AI","success");}}/>
              <SectionHeader title="Key Metrics" subtitle="Top KPIs computed from your dataset" right={<span style={{fontSize:11,color:"rgba(255,255,255,0.35)",fontWeight:700}}>Auto-selected</span>}/>
              <KpiGrid kpis={dashboardData.kpis.slice(0,4)}/>

              {dashboardData.charts?.[0]&&(
                <SpotlightCard title="Spotlight" subtitle={dashboardData.charts[0].subtitle} badge="Auto-selected #1 chart">
                  <div style={{height:300,borderRadius:12,background:"rgba(255,255,255,0.02)",position:"relative",padding:8}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dashboardData.charts[0].data} cx="50%" cy="50%" innerRadius={88} outerRadius={132} paddingAngle={2} dataKey="value">
                          {dashboardData.charts[0].data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                        </Pie>
                        <Tooltip contentStyle={{background:"rgba(10,14,30,0.98)",border:"1px solid rgba(129,140,248,0.25)",borderRadius:12,color:"#fff",fontSize:13,fontWeight:800}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </SpotlightCard>
              )}

              {/* Visualizations */}
              <Section title="📊 Visualizations" isCollapsed={collapse.viz&&guidedMode} onToggle={()=>setCollapse(p=>({...p,viz:!p.viz}))}
                right={<span style={{fontSize:11,color:"rgba(255,255,255,0.35)",fontWeight:700}}>Switch type: 🍩 📊 📈 🥧</span>}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
                  {dashboardData.charts.map((chart,ci)=>{
                    const ct=chartTypes[chart.id]||chart.type;
                    const total=chart.data.reduce((a,b)=>a+b.value,0);
                    const sorted=[...chart.data].sort((a,b)=>b.value-a.value);
                    const top=sorted[0];
                    const top3=sorted.slice(0,3);
                    const accentCol=COLORS[ci%COLORS.length];
                    const accentGlow=GLOW[ci%GLOW.length];
                    return(
                      <div key={chart.id} style={{background:"rgba(10,14,30,0.80)",border:`1px solid rgba(255,255,255,0.07)`,borderRadius:18,padding:18,boxShadow:`0 0 0 1px rgba(255,255,255,0.03) inset`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                          <div>
                            <div style={{fontSize:14,fontWeight:900,color:"#fff",letterSpacing:-0.2}}>{chart.title}</div>
                            <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:3}}>{chart.subtitle}</div>
                          </div>
                          <div style={{display:"flex",gap:5}}>
                            {([{t:"donut",i:"🍩"},{t:"bar",i:"📊"},{t:"line",i:"📈"},{t:"pie",i:"🥧"}] as const).map(({t,i})=>(
                              <button key={t} onClick={()=>setChartTypes(p=>({...p,[chart.id]:t}))} style={{padding:"5px 9px",borderRadius:8,border:`1px solid ${ct===t?accentCol+"55":"rgba(255,255,255,0.09)"}`,background:ct===t?`${accentCol}18`:"transparent",cursor:"pointer",fontSize:12,color:ct===t?accentCol:"rgba(255,255,255,0.45)",fontWeight:900,transition:"all 0.15s"}}>{i}</button>
                            ))}
                          </div>
                        </div>

                        <div style={{margin:"8px 0",padding:"9px 13px",borderRadius:10,background:`${accentCol}10`,borderLeft:`3px solid ${accentCol}`,color:"rgba(255,255,255,0.85)",fontSize:12,fontWeight:700,lineHeight:1.4}}>
                          🔍 {chart.insight}
                        </div>

                        <div style={{height:260,borderRadius:12,background:"rgba(255,255,255,0.02)",position:"relative",padding:6}}>
                          <ResponsiveContainer width="100%" height="100%">
                            {ct==="donut"||ct==="pie"?(
                              <PieChart>
                                <Pie data={sorted} cx="50%" cy="50%" innerRadius={ct==="donut"?70:0} outerRadius={105} paddingAngle={2} dataKey="value" label={({percent})=>percent>0.08?`${(percent*100).toFixed(0)}%`:""} labelLine={false}>
                                  {sorted.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                                </Pie>
                                <Tooltip contentStyle={{background:"rgba(10,14,30,0.98)",border:`1px solid ${accentCol}33`,borderRadius:12,color:"#fff",fontSize:12,fontWeight:800}} formatter={(v:any,n:any)=>[`${v} (${pct(v,total)})`,n]}/>
                              </PieChart>
                            ):ct==="line"?(
                              <LineChart data={sorted}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                                <XAxis dataKey="name" tick={{fontSize:10,fill:"rgba(255,255,255,0.45)"}} axisLine={{stroke:"rgba(255,255,255,0.06)"}} tickLine={false}/>
                                <YAxis tick={{fontSize:10,fill:"rgba(255,255,255,0.45)"}} axisLine={false} tickLine={false}/>
                                <Tooltip contentStyle={{background:"rgba(10,14,30,0.98)",border:`1px solid ${accentCol}33`,borderRadius:12,color:"#fff",fontSize:12,fontWeight:800}} formatter={(v:any)=>[`${v} (${pct(v,total)})`]}/>
                                <Line type="monotone" dataKey="value" stroke={accentCol} strokeWidth={2.5} dot={{r:4,fill:accentCol,strokeWidth:2,stroke:"rgba(10,14,30,0.8)"}} activeDot={{r:6,boxShadow:`0 0 10px ${accentGlow}`}}/>
                              </LineChart>
                            ):(
                              <BarChart data={sorted} barSize={28}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                                <XAxis dataKey="name" tick={{fontSize:10,fill:"rgba(255,255,255,0.45)"}} axisLine={{stroke:"rgba(255,255,255,0.06)"}} tickLine={false}/>
                                <YAxis tick={{fontSize:10,fill:"rgba(255,255,255,0.45)"}} axisLine={false} tickLine={false}/>
                                <Tooltip contentStyle={{background:"rgba(10,14,30,0.98)",border:`1px solid ${accentCol}33`,borderRadius:12,color:"#fff",fontSize:12,fontWeight:800}} formatter={(v:any)=>[`${v} (${pct(v,total)})`]} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
                                <Bar dataKey="value" radius={[8,8,0,0]}>
                                  {sorted.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                                </Bar>
                              </BarChart>
                            )}
                          </ResponsiveContainer>
                          {(ct==="donut"||ct==="pie")&&top&&(
                            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",flexDirection:"column",gap:3}}>
                              <div style={{fontSize:10,color:"rgba(255,255,255,0.50)",fontWeight:900,textTransform:"uppercase",letterSpacing:0.6}}>Top</div>
                              <div style={{fontSize:14,fontWeight:950,color:"#fff"}}>{safeLabel(top.name,16)}</div>
                              <div style={{fontSize:12,fontWeight:800,color:accentCol}}>{pct(top.value,total)}</div>
                            </div>
                          )}
                        </div>

                        <div style={{display:"flex",flexWrap:"wrap",gap:"5px 10px",marginTop:10,padding:"9px 11px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)"}}>
                          {sorted.slice(0,6).map((item,i)=>(
                            <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
                              <div style={{width:9,height:9,borderRadius:2.5,background:COLORS[i%COLORS.length],flexShrink:0}}/>
                              <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.70)"}}>{safeLabel(item.name,12)}</span>
                              <span style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>{pct(item.value,total)}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{marginTop:12}}>
                          <div style={{fontSize:10,fontWeight:900,color:"rgba(255,255,255,0.30)",letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>TOP 3</div>
                          {top3.map((item,i)=>{
                            const medals=["🥇","🥈","🥉"];
                            const w=sorted[0].value>0?(item.value/sorted[0].value)*100:0;
                            return(
                              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                                <span style={{fontSize:15,width:20,flexShrink:0}}>{medals[i]}</span>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                                    <span style={{fontSize:11,fontWeight:800,color:"rgba(255,255,255,0.80)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"62%"}}>{safeLabel(item.name,15)}</span>
                                    <span style={{fontSize:11,fontWeight:800,color:COLORS[i%COLORS.length]}}>{item.value} · {pct(item.value,total)}</span>
                                  </div>
                                  <div style={{height:3,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                                    <div style={{height:"100%",width:`${w}%`,borderRadius:999,background:COLORS[i%COLORS.length],transition:"width 0.8s ease"}}/>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            </>
          )}
        </main>

        {/* ── CHAT SIDEBAR ── */}
        <aside style={chatOpen ? C.chatOpen : C.chatClosed}>
          {!chatOpen && (
            <button onClick={()=>setChatOpen(true)} style={{
              position:"absolute", right:0, top:"50%", transform:"translateY(-50%)",
              width:48, display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", gap:6, padding:"18px 0",
              background:"linear-gradient(180deg,rgba(129,140,248,0.18),rgba(244,114,182,0.12))",
              border:"none", borderLeft:"1px solid rgba(129,140,248,0.25)",
              borderRadius:"14px 0 0 14px", cursor:"pointer", zIndex:10,
              boxShadow:"-4px 0 20px rgba(129,140,248,0.15)",
            }}>
              <span style={{fontSize:20}}>💬</span>
              <span style={{fontSize:9,fontWeight:900,color:"rgba(129,140,248,0.90)",letterSpacing:1,textTransform:"uppercase",writingMode:"vertical-rl",transform:"rotate(180deg)"}}>AI Chat</span>
            </button>
          )}

          {chatOpen && (
          <div style={C.chatHead}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:18,fontWeight:950,color:"#fff",letterSpacing:-0.3}}>🤖 AI Assistant</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.50)",marginTop:4,fontWeight:600}}>Ask questions about your data</div>
            </div>
            <button onClick={()=>setChatOpen(false)} style={{width:42,height:42,borderRadius:12,border:"1px solid rgba(129,140,248,0.25)",background:"rgba(129,140,248,0.12)",color:"#fff",cursor:"pointer",fontSize:18,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
          </div>
          )}
          {chatOpen&&(
            <>
              <div style={{flex:1,overflowY:"auto",padding:20}}>
                {!messages.length?(
                  <div style={{padding:20,borderRadius:16,background:"rgba(129,140,248,0.06)",border:"1px solid rgba(129,140,248,0.14)",display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{fontSize:15,fontWeight:900,color:"rgba(255,255,255,0.85)"}}>💡 Try asking:</div>
                    {["What are the key insights?","Show me top performers","What risks should I watch?"].map(q=>(
                      <button key={q} onClick={()=>setInput(q)} style={{padding:"13px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.80)",fontWeight:700,cursor:"pointer",fontSize:13,textAlign:"left"}}>{q}</button>
                    ))}
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:16}}>
                    {messages.map((m,idx)=>(
                      <div key={idx} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                        <div style={{maxWidth:"88%",padding:"15px 18px",borderRadius:16,background:m.role==="user"?"linear-gradient(135deg,#818CF8,#F472B6)":"rgba(255,255,255,0.06)",boxShadow:m.role==="user"?"0 4px 16px rgba(129,140,248,0.30)":"none"}}>
                          <div style={{whiteSpace:"pre-wrap",fontSize:14,color:"#fff",lineHeight:1.65,fontWeight:600}}>{m.content}</div>
                          <div style={{marginTop:8,fontSize:11,color:"rgba(255,255,255,0.40)",fontWeight:700}}>{m.time}</div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef}/>
                  </div>
                )}
              </div>
              <div style={{padding:16,borderTop:"1px solid rgba(255,255,255,0.06)",background:"rgba(10,14,30,0.60)",display:"flex",gap:10}}>
                <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();handleSend();}}} placeholder="Ask about your data…" style={{flex:1,padding:"13px 16px",borderRadius:13,border:"1px solid rgba(129,140,248,0.20)",background:"rgba(255,255,255,0.05)",color:"#fff",outline:"none",fontWeight:700,fontSize:14}}/>
                <button onClick={handleSend} disabled={!input.trim()||chatLoading} style={{padding:"13px 22px",borderRadius:13,border:"none",cursor:"pointer",fontWeight:950,color:"#fff",background:"linear-gradient(135deg,#818CF8,#F472B6)",fontSize:14,opacity:!input.trim()||chatLoading?0.45:1,boxShadow:"0 4px 16px rgba(129,140,248,0.35)"}}>
                  {chatLoading?"…":"Send"}
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ── WELCOME MODAL ── */}
      {showWelcome&&(
        <div style={{position:"fixed",inset:0,zIndex:99999,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}>
          <div style={{width:"min(900px,96vw)",borderRadius:24,border:"1px solid rgba(129,140,248,0.22)",background:"radial-gradient(ellipse 800px 400px at 20% 0%,rgba(129,140,248,0.18),transparent 60%),rgba(10,14,30,0.97)",boxShadow:"0 0 80px rgba(129,140,248,0.20),0 30px 90px rgba(0,0,0,0.60)",padding:24}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
              <div>
                <div style={{fontSize:22,fontWeight:950,color:"#fff",letterSpacing:-0.5}}>Welcome to R&K Analytics 🌌</div>
                <div style={{marginTop:6,fontSize:14,color:"rgba(255,255,255,0.55)",fontWeight:600}}>Your AI-powered business intelligence cockpit</div>
              </div>
              <button onClick={dismissWelcome} style={{width:42,height:42,borderRadius:12,border:"1px solid rgba(255,255,255,0.10)",background:"rgba(255,255,255,0.05)",color:"#fff",cursor:"pointer",fontWeight:950,fontSize:15}}>✕</button>
            </div>
            <div style={{marginTop:16,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {[{title:"1) Start with Spotlight",text:"Your top insight is already selected. Use Filters to validate it."},{title:"2) Ask the Copilot",text:"Use quick prompts or ask anything in the AI panel on the right."},{title:"3) Export + Share",text:"Use the Export button (top right) for PDF/Excel/CSV reports."}].map(({title,text})=>(
                <div key={title} style={{borderRadius:16,padding:14,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.03)"}}>
                  <div style={{fontSize:13,fontWeight:900,color:"#fff"}}>{title}</div>
                  <div style={{marginTop:8,fontSize:12,lineHeight:1.5,color:"rgba(255,255,255,0.55)"}}>{text}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:16,display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
              <button onClick={()=>{setChatOpen(true);setInput("Give me a board-ready executive summary of this dataset.");dismissWelcome();pushToast("AI prompt loaded","success");}} style={C.btnPrimary}>🚀 Generate Executive Summary</button>
              <button onClick={()=>{setCollapse(p=>({...p,filters:false}));dismissWelcome();pushToast("Filters opened","info");}} style={C.btnGhost}>🎛️ Open Filters</button>
              <button onClick={dismissWelcome} style={C.btnGhost}>✅ Got it</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOASTS ── */}
      <div style={{position:"fixed",right:16,bottom:16,display:"flex",flexDirection:"column",gap:8,zIndex:200}}>
        {toasts.map(t=>(
          <div key={t.id} style={{minWidth:240,padding:"11px 14px",borderRadius:12,background:"rgba(10,14,30,0.85)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.08)",borderLeft:`4px solid ${t.kind==="success"?"#34D399":t.kind==="error"?"#F87171":"#818CF8"}`,color:"#fff",fontWeight:800,fontSize:13,boxShadow:"0 8px 24px rgba(0,0,0,0.35)"}}>{t.message}</div>
        ))}
      </div>
    </div>
  );
}

const BG=`
  radial-gradient(ellipse 1600px 800px at 15% -5%, rgba(88,80,236,0.22) 0%, transparent 55%),
  radial-gradient(ellipse 900px 700px at 88% 95%, rgba(167,139,250,0.14) 0%, transparent 50%),
  radial-gradient(ellipse 700px 400px at 60% 50%, rgba(56,189,248,0.06) 0%, transparent 55%),
  #060A18
`.replace(/\s+/g," ").trim();

const C: Record<string, React.CSSProperties> = {
  topbar: { position:"sticky",top:0,zIndex:50,padding:"12px 20px",display:"grid",gridTemplateColumns:"240px 1fr 360px",alignItems:"center",gap:16,background:"rgba(6,10,24,0.85)",backdropFilter:"blur(24px)",borderBottom:"1px solid rgba(129,140,248,0.13)",boxShadow:"0 1px 0 rgba(129,140,248,0.07)" },
  logo: { width:44,height:44,borderRadius:14,background:"linear-gradient(135deg,#818CF8 0%,#F472B6 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:950,color:"#fff",boxShadow:"0 0 24px rgba(129,140,248,0.45)",letterSpacing:-0.5 },
  navBtn: { display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"7px 12px",borderRadius:11,border:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.03)",cursor:"pointer",transition:"all 0.15s" },
  pill: { padding:"8px 13px",borderRadius:10,border:"1px solid rgba(255,255,255,0.10)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.70)",cursor:"pointer",fontSize:12,fontWeight:800 },
  datasetHub: { background:"linear-gradient(135deg,rgba(10,14,30,0.92) 0%,rgba(20,16,56,0.88) 100%)",border:"1px solid rgba(129,140,248,0.18)",borderRadius:20,padding:18,boxShadow:"0 0 40px rgba(129,140,248,0.08),inset 0 1px 0 rgba(255,255,255,0.05)" },
  activeOrb: { width:52,height:52,borderRadius:16,background:"rgba(129,140,248,0.15)",border:"1px solid rgba(129,140,248,0.28)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",boxShadow:"0 0 20px rgba(129,140,248,0.18)" },
  orbGlow: { position:"absolute",inset:-1,borderRadius:16,background:"radial-gradient(circle at 30% 30%,rgba(129,140,248,0.25),transparent 60%)",pointerEvents:"none" },
  liveBadge: { display:"flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:999,background:"rgba(52,211,153,0.10)",border:"1px solid rgba(52,211,153,0.22)",color:"#6EE7B7",fontSize:10,fontWeight:900,letterSpacing:0.5 },
  liveDot: { width:6,height:6,borderRadius:"50%",background:"#34D399",boxShadow:"0 0 7px rgba(52,211,153,0.80)",display:"inline-block" },
  statOrb: { display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"9px 16px",borderRadius:14,background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.18)",minWidth:64,gap:2 },
  datasetCountBtn: { display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"9px 16px",borderRadius:14,background:"rgba(129,140,248,0.12)",border:"1px solid rgba(129,140,248,0.30)",cursor:"pointer",minWidth:72,gap:1,boxShadow:"0 0 14px rgba(129,140,248,0.12)",transition:"all 0.2s" },
  section: { background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:16,backdropFilter:"blur(6px)" },
  btnPrimary: { padding:"11px 16px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#818CF8 0%,#F472B6 100%)",color:"#fff",cursor:"pointer",fontWeight:950,fontSize:13,boxShadow:"0 4px 14px rgba(129,140,248,0.35)" },
  btnGhost:   { padding:"11px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.10)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.75)",cursor:"pointer",fontWeight:800,fontSize:13 },
  chatOpen:   { width:560,background:"linear-gradient(180deg,rgba(6,10,24,0.99) 0%,rgba(12,16,36,0.99) 100%)",borderLeft:"1px solid rgba(129,140,248,0.16)",display:"flex",flexDirection:"column",transition:"all 0.35s ease",boxShadow:"-12px 0 40px rgba(0,0,0,0.45)",flexShrink:0 },
  chatClosed: { width:0,background:"transparent",border:"none",display:"flex",flexDirection:"column",transition:"all 0.35s ease",position:"relative",overflow:"visible",flexShrink:0 },
  chatHead:   { padding:"18px 18px 16px",borderBottom:"1px solid rgba(129,140,248,0.12)",background:"linear-gradient(135deg,rgba(129,140,248,0.12) 0%,rgba(244,114,182,0.07) 100%)",display:"flex",alignItems:"flex-start",gap:12 },
};