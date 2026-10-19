/* =========================================================================
   core.js — constants, utilities, UI helpers, API client, sync engine and
   data model for the Cyber Crime PS, Kochi City Duty Management System.
   (Files share one global scope: core.js → report.js → pages.js → main.js)
   ========================================================================= */
"use strict";

const CFG = window.APP_CONFIG || {};
const HAS_API = !!(CFG.API_URL && !/PASTE_/.test(CFG.API_URL));
const HAS_GOOGLE_AUTH = !!(CFG.GOOGLE_CLIENT_ID && !/PASTE_/.test(CFG.GOOGLE_CLIENT_ID));
var DEMO = !HAS_API;
function checkDemo(){ DEMO = !!window.FORCE_DEMO || !HAS_API; return DEMO; }
const APP_VERSION = "4.0";

/* ------------------------------------------------------------------ ranks */
const RANKS = ["ACP","Inspector","SSI","SI","ASI","Head Constable","Constable","W/Constable","Driver","Home Guard","PRD","IP","SI Tele","SCPO","HC Tele","CPO","PC Tele","PC DVR","AR CPO"];
const RANK_COLORS = {
  "ACP":"#7C3AED","Inspector":"#1E40AF","IP":"#1E40AF","SSI":"#1D4ED8","SI":"#0D9488","SI Tele":"#0891B2",
  "ASI":"#16A34A","Head Constable":"#CA8A04","SCPO":"#CA8A04","HC Tele":"#EA580C",
  "Constable":"#4F46E5","W/Constable":"#DB2777","Driver":"#92400E","Home Guard":"#64748B","PRD":"#475569",
  "CPO":"#4F46E5","PC Tele":"#DB2777","PC DVR":"#92400E","AR CPO":"#BE185D"
};
// Grade designations
const GRADE_MAP = { "ASI(G)":"Head Constable", "SI(G)":"ASI" };
const RANK_LABELS = {
  "Inspector":"Inspector (प्रभारी नि.)",
  "SSI":"SSI (वरिष्ठ उ.नि.)",
  "SI":"SI (उ.नि.)",
  "ASI":"ASI (स.उ.नि.)",
  "Head Constable":"Head Constable (हे.का.)",
  "Constable":"Constable (आरक्षी)",
  "W/Constable":"W/Constable (म.आरक्षी)",
  "Driver":"Driver (चालक)",
  "Home Guard":"Home Guard (एच.जी.)",
  "PRD":"PRD (पीआरडी)"
};
const RANK_OPTIONS = [
  {value:"Inspector",label:"Inspector / प्रभारी निरीक्षक"},
  {value:"SSI",label:"SSI / वरिष्ठ उप-निरीक्षक"},
  {value:"SI",label:"SI / उप-निरीक्षक"},
  {value:"ASI",label:"ASI / सहायक उप-निरीक्षक"},
  {value:"Head Constable",label:"Head Constable / मुख्य आरक्षी"},
  {value:"Constable",label:"Constable / आरक्षी"},
  {value:"W/Constable",label:"W/Constable / महिला आरक्षी"},
  {value:"Driver",label:"Driver / चालक आरक्षी"},
  {value:"Home Guard",label:"Home Guard / होमगार्ड"},
  {value:"PRD",label:"PRD / प्रांतीय रक्षक दल"},
  {value:"ACP",label:"ACP / सहायक पुलिस आयुक्त"}
];
function baseRank(r){ return GRADE_MAP[r] || r; }
function displayRank(r){ return RANK_LABELS[r] || r; }
function rankColor(r){ return RANK_COLORS[baseRank(r)] || "#666"; }
function hexToRgba(hex,a){ hex=(hex||"#666666").replace("#",""); const n=parseInt(hex,16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
function pillStyle(r){ const c=rankColor(r); return `background:${hexToRgba(c,.12)};color:${c};border-color:${hexToRgba(c,.32)};`; }
function rankPill(r){ return `<span class="rank-pill" style="${pillStyle(r)}">${esc(displayRank(r))}</span>`; }

/* ------------------------------------------------------------ duty types */
const DUTY_CATEGORIES = [
  {key:"sho",label:"SHO / थाना प्रभारी"},
  {key:"day_officer",label:"Day Officer / दिवस अधिकारी"},
  {key:"night_officer",label:"Night Officer / रात्रि अधिकारी"},
  {key:"head_moharrir",label:"Head Moharrir / मुख्य मुहर्रिर"},
  {key:"gd_writer",label:"GD Writer / जीडी लेखक"},
  {key:"crime_inv",label:"Case Investigation / विवेचना"},
  {key:"day_sentry",label:"Day Sentry / दिवस संतरी"},
  {key:"night_sentry",label:"Night Sentry / रात्रि संतरी"},
  {key:"hawalat_guard",label:"Hawalat Guard / हवालात पहरा"},
  {key:"dial_112",label:"Dial 112 / PRV ड्यूटी"},
  {key:"cheetah_mobile",label:"Cheetah Mobile / बीट गश्त"},
  {key:"pink_booth",label:"Pink Booth / महिला हेल्प डेस्क"},
  {key:"parokar_court",label:"Court / पैरोकार ड्यूटी"},
  {key:"saman_warrant",label:"Saman & Warrant / सम्मन-वारंट"},
  {key:"petition_enq",label:"Petition Enquiry / शिकायती जांच"},
  {key:"law_and_order",label:"Law & Order / शांति व्यवस्था"},
  {key:"driver",label:"Driver / सरकारी वाहन चालक"},
  {key:"course",label:"Course / ट्रेनिंग"},
  {key:"other_duty",label:"Other Duty / अन्य ड्यूटी"}
];
const FIXED_DUTY_LABELS = DUTY_CATEGORIES.map(c=>c.label);

// Off duty / leave / rest — in reporting order, with default attendance codes.
const OFF_DUTY_CATEGORIES = [
  {key:"weekly_off",label:"Weekly Off (साप्ताहिक अवकाश)",code:"W/OFF"},
  {key:"casual_leave",label:"Casual Leave (आकस्मिक अवकाश)",code:"CL"},
  {key:"earned_leave",label:"Earned Leave (उपार्जित अवकाश)",code:"EL"},
  {key:"medical_leave",label:"Medical Leave (चिकित्सा अवकाश)",code:"ML"},
  {key:"night_rest",label:"Night Duty Rest (रात्रि विश्राम)",code:"NR"},
  {key:"day_off",label:"Day Off (डे-ऑफ)",code:"D/OFF"},
  {key:"compensatory_off",label:"Compensatory Off (सी-ऑफ)",code:"COFF"},
  {key:"commuted_leave",label:"Commuted Leave",code:"CML"},
  {key:"half_pay_leave",label:"Half Pay Leave",code:"HPL"}
];
const OFF_DUTY_TYPES = OFF_DUTY_CATEGORIES.map(c=>c.label);
// The leave codes that get their own total column in the attendance register.
const LEAVE_TOTAL_CODES = ["W/OFF","CL","EL","ML","D/OFF","COFF"];

const LEGACY_OFF_LABELS = ["CL","D/O","BH","CML","Night Duty Rest"];
const LEGACY_DUTY_LABELS = ["Night Officer/Watch","VVIP Duty","Subdivision Check","Technical Assistance"];
const TIPS_VERSION = "police-365-v1";

const PERSON_STATUS = {
  active:{label:"Active",tag:"green"},
  transferred:{label:"Transferred",tag:"blue"},
  retired:{label:"Retired",tag:"grey"},
  removed:{label:"Removed",tag:"red"}
};

const DEFAULT_SETTINGS = {
  stationName:"Police Station Malihabad",
  stationCity:"District Lucknow (North)",
  reportShort:"PS MALIHABAD",
  expectedStrength:52,
  presentCode:"P",
  attendanceCodes:{},              // off-duty label -> code override
  permissions:{ editorsManagePersonnel:true, editorsReorderDuties:true },
  saveReportsToDrive:true,
  seniorDutiesFirst:true,
  editLockHour:14           // non-admins can edit a date's duty chart only until 2 PM of that date
};

function defaultPersonnel(){
  const raw = [
    ["p1","Inspector Ajay Kumar","Inspector","SHO / प्रभारी निरीक्षक"],
    ["p2","SSI Rakesh Singh","SSI","वरिष्ठ उप-निरीक्षक"],
    ["p3","SI Ramesh Chandra","SI","चौकी प्रभारी मलिहाबाद"],
    ["p4","SI Vijay Shankar","SI","चौकी प्रभारी रहीमाबाद"],
    ["p5","SI Dinesh Pratap","SI","विवेचक (IO)"],
    ["p6","SI Alok Kumar","SI","बीट अधिकारी"],
    ["p7","ASI Ram Prasad","ASI","हेड मुहर्रिर (कार्यालय)"],
    ["p8","HC Satish Kumar","Head Constable","जीडी लेखक"],
    ["p9","HC Manoj Tiwari","Head Constable","हवालात गार्ड"],
    ["p10","HC Anil Yadav","Head Constable","चीता मोबाइल"],
    ["p11","HC Suresh Pandey","Head Constable","समन/वारंट तामीला"],
    ["p12","CP Dharmendra Verma","Constable","डायल 112"],
    ["p13","CP Kuldeep Singh","Constable","संतरी पहरा"],
    ["p14","CP Amit Kumar","Constable","बीट आरक्षी"],
    ["p15","CP Vikas Yadav","Constable","विवेचना सहायक"],
    ["p16","CP Sandeep Kumar","Constable","कोर्ट पैरोकार"],
    ["p17","W/CP Pooja Sharma","W/Constable","महिला हेल्प डेस्क"],
    ["p18","W/CP Sunita Devi","W/Constable","पिंक बूथ"],
    ["p19","DVR CP Harishankar","Driver","चालक सरकारी जीप"],
    ["p20","HG Ramu Pal","Home Guard","थाना संतरी सहयोग"]
  ];
  return raw.map(([id,name,rank,remarks])=>({id,name,rank,attached:false,status:"active",phone:"",penNo:"",remarks:remarks||"",statusDate:""}));
}

function defaultCore(){
  return {
    dutyOrder:[
      "sho","day_officer","night_officer","head_moharrir","gd_writer",
      "crime_inv","day_sentry","night_sentry","hawalat_guard",
      "dial_112","cheetah_mobile","pink_booth","parokar_court",
      "saman_warrant","petition_enq","law_and_order","driver","other_duty"
    ],
    strengthTable:{
      columns:[
        {key:"sho",group:"SHO / Inspr",sub:""},
        {key:"ssi",group:"SSI",sub:""},
        {key:"si",group:"SI",sub:""},
        {key:"asi",group:"ASI",sub:""},
        {key:"hc",group:"Head Const.",sub:""},
        {key:"cp",group:"Constable",sub:""},
        {key:"wcp",group:"W/Constable",sub:""},
        {key:"dvr",group:"Driver",sub:""},
        {key:"hg",group:"Home Guard",sub:""}
      ],
      values:{
        sanctioned:{sho:1,ssi:1,si:8,asi:2,hc:14,cp:32,wcp:6,dvr:2,hg:10},
        existing:  {sho:1,ssi:1,si:7,asi:2,hc:12,cp:28,wcp:5,dvr:2,hg:8},
        attached:  {sho:0,ssi:0,si:0,asi:0,hc:1,cp:2,wcp:0,dvr:0,hg:0},
        vacancy:   {sho:0,ssi:0,si:1,asi:0,hc:2,cp:4,wcp:1,dvr:0,hg:2}
      },
      dataFixVersion:3
    },
    personnel: defaultPersonnel(),
    dutyTypes:[
      {name:"Pink Booth / Mahila Desk",category:"duty"},
      {name:"Dial 112 / PRV Duty",category:"duty"},
      {name:"Cheetah Mobile / Patrolling",category:"duty"},
      {name:"Court / Parokar Duty",category:"duty"},
      {name:"VIP / Mela Duty",category:"duty"},
      {name:"Saman & Warrant Tameela",category:"duty"}
    ],
    paradeOverrides:{},
    paradeMeta:{},
    usedTipIndices:[],
    tipsVersion:TIPS_VERSION,
    tips:(window.CYBER_TIPS_365||[]).slice(),
    settings:clone(DEFAULT_SETTINGS),
    meta:{rosterOrdered:true, createdAt:new Date().toISOString()}
  };
}
const CORE_KEYS = ["dutyOrder","strengthTable","personnel","dutyTypes","paradeOverrides","paradeMeta","usedTipIndices","tipsVersion","tips","settings","meta"];

/* ------------------------------------------------------------ utilities */
const $ = (sel,root=document)=>root.querySelector(sel);
const $$ = (sel,root=document)=>[...root.querySelectorAll(sel)];
function esc(s){ return String(s===undefined||s===null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
function pad(n){ return n<10?"0"+n:""+n; }
function dateKey(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function dateFromKey(k){ const [y,m,d]=k.split("-").map(Number); return new Date(y,m-1,d); }
function dateDisplay(d){ return pad(d.getDate())+"."+pad(d.getMonth()+1)+"."+d.getFullYear(); }
function dateDash(d){ return pad(d.getDate())+"-"+pad(d.getMonth()+1)+"-"+d.getFullYear(); }
function dowName(d){ return d.toLocaleDateString("en-GB",{weekday:"long"}); }
function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function snapToFriday(d){ return addDays(d,(5-d.getDay()+7)%7); }
function today(){ const n=new Date(); return new Date(n.getFullYear(),n.getMonth(),n.getDate()); }
function uid(){ return "id"+Math.random().toString(36).slice(2,10); }
function clone(o){ return o===undefined?undefined:JSON.parse(JSON.stringify(o)); }
function debounce(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
function timeNow(){ const n=new Date(); return pad(n.getHours())+":"+pad(n.getMinutes())+":"+pad(n.getSeconds()); }
function stampNow(){ return dateDash(new Date())+" "+timeNow(); }
function getPath(obj,path){ return path.split("/").reduce((o,k)=>(o===undefined||o===null)?undefined:o[k],obj); }
function setPath(obj,path,value){
  const parts=path.split("/"); let o=obj;
  for(let i=0;i<parts.length-1;i++){ if(!o[parts[i]]||typeof o[parts[i]]!=="object") o[parts[i]]={}; o=o[parts[i]]; }
  const last=parts[parts.length-1];
  if(value===undefined||value===null) delete o[last]; else o[last]=value;
}
function strVal(v){ if(v===undefined||v===null) return ""; if(typeof v==="object"){ try{return JSON.stringify(v);}catch(e){return String(v);} } return String(v); }
function initials(name){ return String(name||"?").split(/[\s.@]+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("")||"?"; }
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
function fileSafe(s){ return String(s).replace(/[\\/:*?"<>|]/g,"_"); }

/* ------------------------------------------------------------------ icons */
const ICONS = {
  dashboard:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  clipboard:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/>',
  flag:'<path d="M4 22V4a1 1 0 0 1 1-1h12l-2.5 4.5L17 12H5"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  list:'<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  logs:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  database:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
  chevL:'<path d="m15 18-6-6 6-6"/>', chevR:'<path d="m9 18 6-6-6-6"/>', chevU:'<path d="m18 15-6-6-6 6"/>', chevD:'<path d="m6 9 6 6 6-6"/>',
  grip:'<circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', x:'<path d="M18 6 6 18M6 6l12 12"/>', check:'<path d="M20 6 9 17l-5-5"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash:'<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  printer:'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  alert:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  cloud:'<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>',
  cloudOff:'<path d="m2 2 20 20M5.8 5.8A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.3-.2M21.5 16.6A4.5 4.5 0 0 0 17.5 10h-1.8A7 7 0 0 0 9.4 5"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  userPlus:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  userX:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 8 5 5M22 8l-5 5"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  bolt:'<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  sort:'<path d="m3 16 4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16"/>',
  restore:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  coffee:'<path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
  bulb:'<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
  activity:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  table:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  swap:'<path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
  eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  key:'<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>'
};
function ic(name,extra){ return `<svg class="i${extra?" "+extra:""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]||""}</svg>`; }

/* ------------------------------------------------------------ UI helpers */
function toast(msg,type="info",ms=4200){
  const box=$("#toasts"); if(!box) return;
  const t=document.createElement("div");
  t.className="toast "+type;
  const icon={error:"alert",success:"check",warn:"alert",info:"info"}[type]||"info";
  t.innerHTML=ic(icon)+`<div>${esc(msg)}</div>`;
  box.appendChild(t);
  setTimeout(()=>{ t.style.transition="opacity .3s"; t.style.opacity="0"; setTimeout(()=>t.remove(),320); },ms);
}

function openModal({title,body,actions,wide,onOpen,dismissable=true}){
  const root=$("#modalRoot");
  const back=document.createElement("div");
  back.className="modal-back";
  back.innerHTML=`<div class="modal${wide?" wide":""}" role="dialog" aria-modal="true">
    <div class="modal-head"><h3>${esc(title)}</h3>${dismissable?`<button class="icon-only" data-x aria-label="Close">${ic("x")}</button>`:""}</div>
    <div class="modal-body">${body||""}</div>
    ${actions&&actions.length?`<div class="modal-foot"></div>`:""}
  </div>`;
  root.appendChild(back);
  const close=()=>{ back.remove(); document.removeEventListener("keydown",onKey); };
  function onKey(e){ if(e.key==="Escape"&&dismissable) close(); }
  document.addEventListener("keydown",onKey);
  if(dismissable){
    back.addEventListener("mousedown",e=>{ if(e.target===back) close(); });
    const x=$("[data-x]",back); if(x) x.onclick=close;
  }
  const foot=$(".modal-foot",back);
  (actions||[]).forEach(a=>{
    const b=document.createElement("button");
    b.type="button"; b.className="btn "+(a.cls||"");
    b.innerHTML=(a.icon?ic(a.icon):"")+esc(a.label);
    b.onclick=()=>{ if(a.onClick){ const r=a.onClick(close,back); if(r!==false&&!a.keepOpen) {} } else close(); };
    foot.appendChild(b);
  });
  if(onOpen) onOpen(back,close);
  const first=$("input,select,textarea",back); if(first) setTimeout(()=>first.focus(),30);
  return {el:back,close};
}

function confirmBox({title="Please confirm",message,confirmText="Confirm",danger=false,requireText=null}){
  return new Promise(resolve=>{
    let done=false;
    const m=openModal({
      title,
      body:`<p>${message}</p>${requireText?`<div class="field" style="margin-top:12px"><label>Type <span class="kbd">${esc(requireText)}</span> to continue</label><input class="input" id="cfTxt" autocomplete="off"></div>`:""}`,
      actions:[
        {label:"Cancel",onClick:(close)=>{ done=true; close(); resolve(false); }},
        {label:confirmText,cls:danger?"danger solid":"primary",onClick:(close,el)=>{
          if(requireText && $("#cfTxt",el).value.trim().toUpperCase()!==requireText.toUpperCase()){ toast(`Type ${requireText} to confirm.`,"warn"); return false; }
          done=true; close(); resolve(true);
        }}
      ]
    });
    const obs=new MutationObserver(()=>{ if(!document.body.contains(m.el)){ obs.disconnect(); if(!done) resolve(false); } });
    obs.observe($("#modalRoot"),{childList:true});
  });
}

function promptBox({title,label,value="",placeholder="",confirmText="Save",extra=""}){
  return new Promise(resolve=>{
    let done=false;
    const m=openModal({
      title,
      body:`<div class="field"><label>${esc(label)}</label><input class="input" id="pbTxt" value="${esc(value)}" placeholder="${esc(placeholder)}"></div>${extra}`,
      actions:[
        {label:"Cancel",onClick:(close)=>{ done=true; close(); resolve(null); }},
        {label:confirmText,cls:"primary",onClick:(close,el)=>{ done=true; const v=$("#pbTxt",el).value.trim(); const ex={}; $$("[data-extra]",el).forEach(x=>ex[x.dataset.extra]=x.value); close(); resolve(extra?{value:v,extra:ex}:v); }}
      ],
      onOpen:(el,close)=>{ $("#pbTxt",el).addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); $(".modal-foot .btn.primary",el).click(); } }); }
    });
    const obs=new MutationObserver(()=>{ if(!document.body.contains(m.el)){ obs.disconnect(); if(!done) resolve(null); } });
    obs.observe($("#modalRoot"),{childList:true});
  });
}

function downloadBlob(blob,filename){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
function blobToBase64(blob){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(",")[1]||""); r.onerror=rej; r.readAsDataURL(blob); });
}

/* ------------------------------------------------------------ session & API */
const LS_SESSION="cyberps.session.v1", LS_CACHE="cyberps.cache.v1";
let SESSION=null;           // {token, user}
let CLIENT_IP="";
function loadSession(){ try{ SESSION=JSON.parse(lsGet(LS_SESSION)||"null"); }catch(e){ SESSION=null; } return SESSION; }
function saveSession(s){ SESSION=s; lsSet(LS_SESSION,JSON.stringify(s)); }
function clearSession(){ SESSION=null; lsDel(LS_SESSION); }
const USER=()=> (SESSION&&SESSION.user)||{role:"viewer",name:"",email:""};

function isAuthError(e){ return e && (e.code==="AUTH_EXPIRED"||e.code==="AUTH_REQUIRED"); }
function isNetworkError(e){ return e && (e.code==="NETWORK"||e.code==="BUSY"||e.code==="TIMEOUT"); }

async function api(action,payload){
  const client={ua:navigator.userAgent,ip:CLIENT_IP,emailHint:(SESSION&&SESSION.user&&SESSION.user.email)||""};
  if(DEMO){
    try{ return await window.LocalBackend.call(action,payload||{},SESSION&&SESSION.token,client); }
    catch(e){ const er=new Error(e.message); er.code=e.code||"SERVER_ERROR"; throw er; }
  }
  let res;
  const ctrl=("AbortController" in window)?new AbortController():null;
  const timer=ctrl?setTimeout(()=>ctrl.abort(),60000):null;
  try{
    res=await fetch(CFG.API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,session:SESSION&&SESSION.token,payload:payload||{},client}),redirect:"follow",cache:"no-store",signal:ctrl?ctrl.signal:undefined});
  }catch(e){
    const er=new Error(e&&e.name==="AbortError"?"The Google server took too long to respond.":"Network error — cannot reach the Google server."); er.code="NETWORK"; throw er;
  }finally{ if(timer) clearTimeout(timer); }
  if(!res.ok){
    let msg="Server responded with HTTP "+res.status;
    if(res.status===403){
      msg="Google Apps Script (403 Forbidden): Google Apps Script में 'Who has access' को 'Anyone' सेट करके New Deployment बनाएं।";
    }
    const er=new Error(msg); er.code="NETWORK"; throw er;
  }
  let json;
  try{ json=await res.json(); }
  catch(e){ const er=new Error("Unexpected reply from the server. Check the Web App is deployed with access \"Anyone\"."); er.code="SERVER_ERROR"; throw er; }
  if(!json.ok){ const er=new Error(json.error||"Server error"); er.code=json.code||"SERVER_ERROR"; throw er; }
  return json.data;
}

/* ------------------------------------------------------------ error log */
const ErrQ={items:[],seen:{},timer:null};
function reportError(module,operation,error,stack,status){
  const msg=String(error&&error.message||error||"Unknown error").slice(0,600);
  const sig=module+"|"+operation+"|"+msg;
  const now=Date.now();
  if(ErrQ.seen[sig] && now-ErrQ.seen[sig]<60000) return;
  ErrQ.seen[sig]=now;
  ErrQ.items.push({time:now,module,operation,error:msg,stack:String(stack||(error&&error.stack)||"").slice(0,1200),status:status||"FAILED"});
  clearTimeout(ErrQ.timer);
  ErrQ.timer=setTimeout(flushErrors,2500);
}
async function flushErrors(){
  if(!ErrQ.items.length||!SESSION) return;
  const batch=ErrQ.items.splice(0,30);
  try{ await api("logs.error",{entries:batch}); }
  catch(e){ if(isNetworkError(e)) ErrQ.items.unshift(...batch.slice(0,20)); }
}
window.addEventListener("error",e=>{ reportError("Browser","Script error",e.message+" @ "+(e.filename||"").split("/").pop()+":"+e.lineno,e.error&&e.error.stack); });
window.addEventListener("unhandledrejection",e=>{ const r=e.reason||{}; if(r.code&&r.code!=="SERVER_ERROR") return; reportError("Browser","Unhandled promise",r.message||String(r),r.stack); });

/* ------------------------------------------------------------ data state */
let S=null;                 // all app data (core keys + records + attendance + version)
let LOADED_YEARS=new Set();
let SERVER_INFO={lastModifiedBy:"",lastModifiedAt:""};

const ROLE_LEVEL={admin:3,editor:2,viewer:1};
function roleAtLeast(r){ return (ROLE_LEVEL[USER().role]||0)>=(ROLE_LEVEL[r]||99); }
const canEdit=()=>roleAtLeast("editor");
const canAdmin=()=>roleAtLeast("admin");
function perms(){ return (S&&S.settings&&S.settings.permissions)||{}; }
const canManagePersonnel=()=>canAdmin()||(canEdit()&&!!perms().editorsManagePersonnel);
const canReorderDuties=()=>canAdmin()||(canEdit()&&!!perms().editorsReorderDuties);
function settings(){ return (S&&S.settings)||DEFAULT_SETTINGS; }

function ensureRecord(key){
  if(!S.records[key]) S.records[key]={assignments:{},messageIndex:null};
  if(!S.records[key].assignments) S.records[key].assignments={};
  return S.records[key];
}
function peekAssignment(key,pid){ const r=S.records[key]; return (r&&r.assignments&&r.assignments[pid])||null; }
function dutyOf(key,pid){ const a=peekAssignment(key,pid); return a?(a.duty||"").trim():""; }

// Custom duty types (category "duty") take part in the priority order using the key "c:<name>".
function customDutyKey(name){ return "c:"+String(name||"").trim().toLowerCase(); }
function customDutyCategories(src){
  return ((src||S||{}).dutyTypes||[]).filter(d=>d&&d.name&&d.category!=="off").map(d=>({key:customDutyKey(d.name),label:d.name,custom:true}));
}
function orderedDutyCategories(){
  const all=DUTY_CATEGORIES.concat(customDutyCategories());
  const byKey={}; all.forEach(c=>byKey[c.key]=c);
  const order=(S&&Array.isArray(S.dutyOrder))?S.dutyOrder:[];
  const out=order.map(k=>byKey[k]).filter((c,i,a)=>c&&a.indexOf(c)===i);
  all.forEach(c=>{ if(!out.includes(c)) out.push(c); });
  return out;
}
// Add / remove a custom duty type in the saved priority order (new types go to the end).
function addCustomToDutyOrder(name){
  const k=customDutyKey(name);
  if(!Array.isArray(S.dutyOrder)) S.dutyOrder=[];
  if(!S.dutyOrder.includes(k)){ S.dutyOrder.push(k); if(canReorderDuties()) markDirty("dutyOrder"); }
}
function removeCustomFromDutyOrder(name){
  const k=customDutyKey(name);
  if(Array.isArray(S.dutyOrder)&&S.dutyOrder.includes(k)){ S.dutyOrder=S.dutyOrder.filter(x=>x!==k); if(canReorderDuties()) markDirty("dutyOrder"); }
}
function isOffDuty(name){
  const n=(name||"").trim().toLowerCase(); if(!n) return false;
  if(OFF_DUTY_TYPES.some(o=>o.toLowerCase()===n)) return true;
  return !!(S&&S.dutyTypes&&S.dutyTypes.some(d=>d.category==="off"&&d.name.toLowerCase()===n));
}
function allOffLabels(){ return OFF_DUTY_TYPES.concat((S.dutyTypes||[]).filter(d=>d.category==="off").map(d=>d.name)); }
function defaultCodeFor(label){
  const cat=OFF_DUTY_CATEGORIES.find(c=>c.label.toLowerCase()===String(label).toLowerCase());
  if(cat) return cat.code;
  const clean=String(label).trim();
  if(clean.length<=5) return clean.toUpperCase();
  return clean.split(/[\s/]+/).filter(Boolean).map(w=>w[0]).join("").toUpperCase().slice(0,5);
}
function codeForOffLabel(label){
  const map=settings().attendanceCodes||{};
  const k=Object.keys(map).find(x=>x.toLowerCase()===String(label).toLowerCase());
  return (k&&map[k])?map[k]:defaultCodeFor(label);
}
function presentCode(){ return settings().presentCode||"P"; }
function attendanceCodeForDuty(duty){
  const d=(duty||"").trim(); if(!d) return "";
  if(!isOffDuty(d)) return presentCode();
  return codeForOffLabel(d);
}
function codeClass(code){
  const c=String(code||"").toUpperCase();
  if(!c) return "";
  if(c===presentCode().toUpperCase()) return "code-P";
  const m={"CL":"code-CL","D/OFF":"code-DOFF","CML":"code-CML","ML":"code-ML","HPL":"code-HPL","EL":"code-EL","COFF":"code-COFF"};
  return m[c]||"code-X";
}

function personById(id){ return (S.personnel||[]).find(p=>p.id===id); }
function isActive(p){ return !p.status||p.status==="active"; }
function activePersonnel(){ return (S.personnel||[]).filter(isActive); }
function rosterIndex(id){ const i=(S.personnel||[]).findIndex(p=>p.id===id); return i<0?9999:i; }
function sortByRank(list){ return list.slice().sort((a,b)=>RANKS.indexOf(baseRank(a.rank))-RANKS.indexOf(baseRank(b.rank))||a.name.localeCompare(b.name)); }

/* ------------------------------------------------------------ migration */
// Brings any stored data (including data imported from the old single-file
// duty chart) up to the current structure. Returns the list of top-level
// keys (and record dates) that changed so they can be saved back.
function migrateState(st){
  const before={}; CORE_KEYS.forEach(k=>before[k]=JSON.stringify(st[k]));
  const changedRecords=new Set();
  const def=defaultCore();
  if(!st.records) st.records={};
  if(!st.attendance) st.attendance={};
  if(!st.usedTipIndices) st.usedTipIndices=[];
  if(!st.paradeOverrides) st.paradeOverrides={};
  if(!st.paradeMeta) st.paradeMeta={};
  if(!st.meta) st.meta={};

  // settings
  st.settings=Object.assign(clone(DEFAULT_SETTINGS),st.settings||{});
  st.settings.permissions=Object.assign(clone(DEFAULT_SETTINGS.permissions),(st.settings.permissions)||{});
  if(!st.settings.attendanceCodes) st.settings.attendanceCodes={};

  // records: legacy labels
  Object.keys(st.records).forEach(k=>{
    const r=st.records[k]; if(!r||!r.assignments) return;
    Object.values(r.assignments).forEach(a=>{
      if(!a||!a.duty) return;
      const t=a.duty.trim().toLowerCase();
      if(t==="asst. writer"){ a.duty="ASW"; changedRecords.add(k); }
      if(t==="sub division check rest"&&a.duty!=="Sub Division Check Rest"){ a.duty="Sub Division Check Rest"; changedRecords.add(k); }
      if(t==="echo women rest"&&a.duty!=="Echo Women Rest"){ a.duty="Echo Women Rest"; changedRecords.add(k); }
    });
  });

  // strength table
  if(!st.strengthTable||!st.strengthTable.columns||!st.strengthTable.values){ st.strengthTable=clone(def.strengthTable); }
  else{
    const cols=st.strengthTable.columns, vals=st.strengthTable.values;
    const ensureCol=(key,group,sub,after)=>{ if(cols.some(c=>c.key===key)) return; const i=cols.findIndex(c=>c.key===after); const nc={key,group,sub}; if(i<0) cols.push(nc); else cols.splice(i+1,0,nc); Object.keys(vals).forEach(r=>vals[r][key]=0); };
    ensureCol("scpo_scpo","SCPO","SCPO","asi"); ensureCol("cpo_gasi","CPO","GASI","cpo_gsi");
    if(!(st.strengthTable.dataFixVersion>=3)){
      if(!st.strengthTable.dataFixVersion) st.strengthTable.values=clone(def.strengthTable.values);
      cols.forEach(c=>{ if(c.key==="acp") c.group="ACP"; if(c.key==="dvr_cpo") c.group="PC DVR"; });
      st.strengthTable.dataFixVersion=3;
    }
  }

  // personnel
  if(!Array.isArray(st.personnel)) st.personnel=def.personnel;
  st.personnel.forEach(p=>{
    if(p.rank==="DySP") p.rank="ACP"; if(p.rank==="DVR CPO") p.rank="PC DVR";
    if(!p.status) p.status="active";
    ["phone","penNo","remarks","statusDate"].forEach(f=>{ if(p[f]===undefined) p[f]=""; });
    p.attached=!!p.attached;
  });
  if(!st.meta.rosterOrdered){ st.personnel=sortByRank(st.personnel); st.meta.rosterOrdered=true; }

  // duty types
  if(!st.dutyTypes) st.dutyTypes=[];
  st.dutyTypes=st.dutyTypes.map(d=>typeof d==="string"?{name:d,category:"duty"}:d)
    .filter(d=>d&&d.name&&!FIXED_DUTY_LABELS.concat(OFF_DUTY_TYPES).some(f=>f.toLowerCase()===d.name.toLowerCase()));
  const used=new Set();
  Object.values(st.records).forEach(r=>{ if(r&&r.assignments) Object.values(r.assignments).forEach(a=>{ if(a&&a.duty) used.add(a.duty); }); });
  const known2=l=>FIXED_DUTY_LABELS.concat(OFF_DUTY_TYPES).concat(st.dutyTypes.map(d=>d.name)).some(x=>x.toLowerCase()===l.toLowerCase());
  LEGACY_OFF_LABELS.forEach(l=>{ if(used.has(l)&&!known2(l)) st.dutyTypes.push({name:l,category:"off"}); });
  LEGACY_DUTY_LABELS.forEach(l=>{ if(used.has(l)&&!known2(l)) st.dutyTypes.push({name:l,category:"duty"}); });
  used.forEach(l=>{ if(!known2(l)) st.dutyTypes.push({name:l,category:/rest|leave|off/i.test(l)?"off":"duty"}); });

  // duty priority order (standard + custom duty types)
  const allDuty=DUTY_CATEGORIES.concat(customDutyCategories(st));
  const known=new Set(allDuty.map(c=>c.key));
  if(!Array.isArray(st.dutyOrder)||!st.dutyOrder.length) st.dutyOrder=def.dutyOrder.slice();
  st.dutyOrder=st.dutyOrder.filter((k,i,a)=>known.has(k)&&a.indexOf(k)===i);
  allDuty.forEach(c=>{ if(!st.dutyOrder.includes(c.key)) st.dutyOrder.push(c.key); });

  // tips
  if(!st.tips||!st.tips.length){ st.tips=def.tips; st.tipsVersion=TIPS_VERSION; }
  else if(st.tipsVersion!==TIPS_VERSION){ st.tips=def.tips; st.usedTipIndices=[]; st.tipsVersion=TIPS_VERSION; }

  const changed=CORE_KEYS.filter(k=>JSON.stringify(st[k])!==before[k]);
  return {changed,changedRecords:[...changedRecords]};
}

/* ------------------------------------------------------------ sync engine */
const Sync={dirty:new Set(),audit:[],activity:[],failed:[],inflight:false,again:false,timer:null,retryTimer:null,
  status:"idle",lastSaved:null,lastError:"",retryDelay:4000,pendingRefresh:false};

/* Duty-chart edit lock: earlier dates, and today's chart after the lock hour
   (default 12:00 noon), can be changed only by an Administrator. */
function lockHour(){ const h=Number(settings().editLockHour); return isFinite(h)&&h>=0&&h<=24?h:12; }
function isDateLocked(key){
  if(canAdmin()) return false;
  const t=dateKey(new Date());
  if(key<t) return true;
  if(key===t&&new Date().getHours()>=lockHour()) return true;
  return false;
}
function lockMessage(key){
  const t=dateKey(new Date());
  return key<t?"Duty charts of previous days can be changed only by an Administrator."
    :`Today's duty chart can be changed only until ${pad(lockHour())}:00. After that, only an Administrator can change it.`;
}
function markDirty(path){
  if(!canEdit()){ toast("You have view-only access.","warn"); return false; }
  const m=/^records\/(\d{4}-\d{2}-\d{2})/.exec(path);
  if(m&&isDateLocked(m[1])){ toast("🔒 "+lockMessage(m[1]),"warn",6000); return false; }
  Sync.dirty.add(path);
  scheduleFlush();
  saveCacheSoon();
  return true;
}
function audit(module,action,record,oldValue,newValue){
  Sync.audit.push({time:Date.now(),module,action,record:strVal(record),oldValue:strVal(oldValue).slice(0,500),newValue:strVal(newValue).slice(0,500)});
  scheduleFlush(); saveCacheSoon();
}
function logEvent(module,action,record,detail){
  Sync.activity.push({time:Date.now(),module,action,record:strVal(record),oldValue:"",newValue:strVal(detail||"")});
  scheduleFlush(1500);
}
function scheduleFlush(ms=900){ clearTimeout(Sync.timer); Sync.timer=setTimeout(flush,ms); setSyncStatus(Sync.status==="offline"?"offline":"saving"); }

function compressPaths(paths){
  const sorted=paths.slice().sort((a,b)=>a.length-b.length);
  const out=[];
  sorted.forEach(p=>{ if(!out.some(q=>p===q||p.startsWith(q+"/"))) out.push(p); });
  return out;
}

async function flush(){
  if(Sync.inflight){ Sync.again=true; return; }
  if(!Sync.dirty.size&&!Sync.audit.length&&!Sync.activity.length){ setSyncStatus("saved"); return; }
  if(!SESSION){ setSyncStatus("offline"); return; }
  Sync.inflight=true; setSyncStatus("saving");
  const paths=compressPaths([...Sync.dirty]); Sync.dirty.clear();
  const audits=Sync.audit.splice(0); const acts=Sync.activity.splice(0);
  let requeued=false;
  const requeue=(list)=>{ list.forEach(p=>Sync.dirty.add(p)); Sync.audit.unshift(...audits); Sync.activity.unshift(...acts); requeued=true; };
  try{
    try{
      if(paths.length||audits.length){
        const changes=paths.map(p=>({path:p,value:clone(getPath(S,p))??null}));
        const r=await api("data.save",{baseVersion:S.version,changes,audit:audits});
        if(r.prevVersion!==S.version) Sync.pendingRefresh=true;
        S.version=r.version;
      }
    }catch(e){
      if(e.code!=="FORBIDDEN"&&e.code!=="BAD_REQUEST") throw e;
      // The server refused something in this batch. Never throw the whole
      // batch away: save every change on its own, so only the refused item
      // is lost and every other duty entry still reaches Google Drive.
      const res=await saveOneByOne(paths,audits,requeue);
      recordFailures(res.failed);
    }
    if(acts.length) await api("logs.activity",{entries:acts});
    Sync.lastSaved=new Date(); Sync.lastError=""; Sync.retryDelay=4000;
    setSyncStatus("saved");
  }catch(e){
    if(!requeued) requeue(paths);
    Sync.lastError=e.message;
    if(isAuthError(e)){ setSyncStatus("offline"); onAuthLost(e); }
    else{
      setSyncStatus("offline");
      if(e.code!=="NETWORK") reportError("Google Drive","Save",e);
      clearTimeout(Sync.retryTimer);
      Sync.retryTimer=setTimeout(flush,Sync.retryDelay);
      Sync.retryDelay=Math.min(Sync.retryDelay*2,60000);
    }
  }finally{
    Sync.inflight=false;
    saveCacheSoon();
    if(Sync.again){ Sync.again=false; scheduleFlush(250); }
    else if(Sync.pendingRefresh&&!Sync.dirty.size){ Sync.pendingRefresh=false; refreshFromServer(true); }
  }
}

/* Saves each path separately; returns the ones the server refused.
   A network error part-way re-queues everything not yet saved. */
async function saveOneByOne(paths,audits,requeue){
  const failed=[];
  for(let i=0;i<paths.length;i++){
    const p=paths[i];
    try{
      const r=await api("data.save",{baseVersion:S.version,changes:[{path:p,value:clone(getPath(S,p))??null}],audit:[]});
      if(r.prevVersion!==S.version) Sync.pendingRefresh=true;
      S.version=r.version;
    }catch(e){
      if(e.code==="FORBIDDEN"||e.code==="BAD_REQUEST"){ failed.push({path:p,msg:e.message,time:new Date()}); continue; }
      requeue(paths.slice(i)); throw e;
    }
  }
  if(audits.length){ try{ await api("data.save",{changes:[],audit:audits}); }catch(e){} }
  return {failed};
}

function pathLabel(p){
  const parts=p.split("/");
  if(parts[0]==="records"&&parts[1]){
    const d=dateDisplay(dateFromKey(parts[1]));
    if(parts[2]==="assignments"&&parts[3]){ const per=personById(parts[3]); return `Duty chart ${d} · ${per?displayRank(per.rank)+" "+per.name:parts[3]}`; }
    return "Duty chart "+d;
  }
  const names={paradeMeta:"Friday Parade heading / reasons",paradeOverrides:"Friday Parade",attendance:"Attendance register",personnel:"Personnel roster",dutyOrder:"Duty priority order",dutyTypes:"Duty types",strengthTable:"Strength table",settings:"Settings",tips:"Cyber tips"};
  return (names[parts[0]]||parts[0])+(parts[1]&&parts[0]!=="records"?" ("+parts[1]+")":"");
}
function recordFailures(failed){
  if(!failed.length) return;
  const fresh=failed.map(f=>Object.assign(f,{label:pathLabel(f.path)}));
  Sync.failed=(Sync.failed||[]).filter(o=>!fresh.some(f=>f.path===o.path)).concat(fresh).slice(-30);
  failed.forEach(f=>reportError("Sync","Save refused: "+f.label,f.msg));
  Sync.pendingRefresh=true;
  toast(`${failed.length} change(s) were NOT saved to Google Drive — see the red notice at the top.`,"error",12000);
}

function setSyncStatus(st){
  if(st==="saving"&&Sync.status!=="saving") Sync.savingSince=Date.now();
  if(st!=="saving") Sync.savingSince=0;
  Sync.status=st;
  const pill=$("#syncPill"); if(!pill) return;
  pill.className="sync-pill";
  let label;
  if(DEMO&&st!=="saving"){ pill.classList.add("demo"); label="Demo · saved in this browser"; }
  else if(st==="saving"){ pill.classList.add("saving"); label="Saving…"; }
  else if(st==="offline"){ pill.classList.add("offline"); label=`Offline · ${Sync.dirty.size+Sync.audit.length} pending · Retry`; }
  else label="Saved to Drive"+(Sync.lastSaved?" "+pad(Sync.lastSaved.getHours())+":"+pad(Sync.lastSaved.getMinutes())+":"+pad(Sync.lastSaved.getSeconds()):"");
  pill.innerHTML=`<span class="dot"></span><span class="lbl">${esc(label)}</span>`;
  pill.title=st==="offline"?("Changes are kept on this device and will be sent automatically. "+(Sync.lastError||"")):"All changes are stored in Google Drive";
  renderBanner();
}

/* local cache — keeps unsent changes safe across reloads / connection loss */
const saveCacheSoon=debounce(saveCache,500);
function saveCache(){
  if(!S||!SESSION) return;
  const payload={email:USER().email,at:Date.now(),version:S.version,state:S,
    dirty:[...Sync.dirty],audit:Sync.audit,activity:Sync.activity};
  if(!lsSet(LS_CACHE,JSON.stringify(payload))){
    // too big for the browser: keep at least the unsent changes
    const small={email:payload.email,at:payload.at,version:S.version,dirty:payload.dirty,
      dirtyValues:payload.dirty.map(p=>[p,getPath(S,p)]),audit:payload.audit,activity:payload.activity};
    lsSet(LS_CACHE,JSON.stringify(small));
  }
}
function readCache(){ try{ return JSON.parse(lsGet(LS_CACHE)||"null"); }catch(e){ return null; } }

/* applies a bootstrap snapshot from the server, keeping any unsent local edits */
function applySnapshot(data,{keepLocal=true}={}){
  const keep=keepLocal&&S?[...Sync.dirty].map(p=>[p,clone(getPath(S,p))]):[];
  const core=data.core||{};
  const fresh=!Object.keys(core).length;
  const st=fresh?defaultCore():clone(core);
  // keep already-loaded records of years this snapshot does not cover
  const covered=new Set((data.loadedYears||[]).map(Number));
  const carry={};
  if(S&&keepLocal&&covered.size){
    Object.keys(S.records||{}).forEach(k=>{ if(!covered.has(Number(k.slice(0,4)))) carry[k]=S.records[k]; });
  }
  st.records=Object.assign(carry,data.records||{});
  st.attendance=data.attendance||{};
  st.version=data.version;
  S=st;
  (data.loadedYears||[]).forEach(y=>LOADED_YEARS.add(Number(y)));
  SERVER_INFO={lastModifiedBy:data.lastModifiedBy||"",lastModifiedAt:data.lastModifiedAt||""};
  const mig=migrateState(S);
  keep.forEach(([p,v])=>setPath(S,p,v));
  if(canEdit()){
    if(fresh&&canAdmin()){ CORE_KEYS.forEach(k=>Sync.dirty.add(k)); audit("System","Initialise database","Default roster & settings","","30 officers"); }
    else{
      mig.changed.forEach(k=>{
        // don't send sections that only gained an empty default (older servers may not know them)
        const v=S[k]; if(v&&typeof v==="object"&&!Array.isArray(v)&&!Object.keys(v).length) return;
        if(!["personnel","dutyOrder","settings","meta"].includes(k)||canAdmin()) Sync.dirty.add(k);
      });
      mig.changedRecords.forEach(k=>{ if(!isDateLocked(k)) Sync.dirty.add("records/"+k); });
    }
    if(Sync.dirty.size) scheduleFlush(1500);
  }
  return {fresh};
}

async function ensureYears(years){
  if(DEMO) return;
  const need=[...new Set(years.map(Number))].filter(y=>!LOADED_YEARS.has(y));
  for(const y of need){
    try{
      const r=await api("data.getYear",{year:y});
      const keep=[...Sync.dirty].filter(p=>p.startsWith("records/"+y)).map(p=>[p,clone(getPath(S,p))]);
      Object.assign(S.records,r.records||{});
      keep.forEach(([p,v])=>setPath(S,p,v));
      LOADED_YEARS.add(y);
    }catch(e){ if(isAuthError(e)) onAuthLost(e); else toast("Could not load "+y+" records: "+e.message,"error"); throw e; }
  }
}

let refreshing=false;
async function refreshFromServer(silent){
  if(refreshing) return; refreshing=true;
  try{
    const data=await api("data.bootstrap",{years:[...LOADED_YEARS]});
    const who=data.lastModifiedBy;
    applySnapshot(data,{keepLocal:true});
    if(typeof rerenderSafely==="function") rerenderSafely();
    if(!silent) toast("Data reloaded from Google Drive.","success");
    else if(who&&who!==USER().name) toast("Updated with changes made by "+who+".","info");
  }catch(e){ if(isAuthError(e)) onAuthLost(e); else if(!silent) toast("Refresh failed: "+e.message,"error"); }
  finally{ refreshing=false; }
}
