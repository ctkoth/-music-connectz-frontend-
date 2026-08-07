// Google Play listing screenshots, taken from the real built app.
//
// Play wants 2–8 phone screenshots; these are 1080×1920 (9:16), which is the
// size the console accepts without resampling. The API is stubbed with
// representative data so the shots show a populated app rather than empty
// states — every pixel is the actual UI, only the data is fixture.
import { chromium } from "playwright";
import http from "http"; import fs from "fs"; import path from "path";

const ROOT = "/workspace/-music-connectz-frontend-/dist";
const OUT  = "/workspace/-music-connectz-frontend-/playkit/screenshots";
const MIME = {".html":"text/html",".js":"text/javascript",".css":"text/css",
              ".png":"image/png",".webp":"image/webp",".jpg":"image/jpeg",
              ".svg":"image/svg+xml",".ico":"image/x-icon"};
const srv = http.createServer((q,r)=>{
  let p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
  if(!fs.existsSync(p)||fs.statSync(p).isDirectory()) p = path.join(ROOT,"index.html");
  r.writeHead(200,{"Content-Type":MIME[path.extname(p)]||"application/octet-stream"});
  fs.createReadStream(p).pipe(r);
});
await new Promise(r=>srv.listen(4700,r));

const now = new Date().toISOString();
const ME = {id:1,username:"K-Oth",email:"k@musicconnectz.net",tier:"statz",
  membership:{tier:"statz"},personas:[{name:"Independent Artist",skills:[]}],
  nationalities:[],birthday:"1990-01-01"};

const post = (id,author,title,desc,genre,media,rating,up,down) => ({
  id,author,mine:author==="K-Oth",title,description:desc,genre,media,
  age_sec:3600*id,visibility:"public",score:{},items:[],created_at:now,
  rating,up,down,vibe:up-down,collab_count:id===1?2:0,shares:id,joins:0,
  rate_unlock_sec:30,comment_unlock_sec:60,links:[],skills_used:[]});

const POSTS = [
  post(1,"K-Oth","Midnight Take","Rain on the roof, kept the pocket. Cover + lyrics attached.",
       "Trap",{audio:"/x/a.mp3",video:"",image:"/icons/postz.png",text:"Rain on the roof…"},9,42,1),
  post(2,"Nova","Second Verse — need a hook","Beat's done. Looking for a topline.",
       "R&B",{audio:"/x/a.mp3",video:"",image:"",text:""},8,31,2),
  post(3,"Sable","Cover art for the EP","Neon, but warmer than the last one.",
       "Alternative",{audio:"",video:"",image:"/icons/imagez.png",text:""},9,58,0),
];
const DEALS = [{id:7,title:"Midnight — topline",currency:"spinaz",status:"funded",
  stake_spinaz:50,gates:{},description:"You take the hook, I keep the beat.",
  media_type:"audio",media_url:"/x/a.mp3",image_url:"/icons/collabz.png",lyrics:"Rain on the roof…",
  items:[],split_mode:"rating",split_snapshot:{},rating_keys:{},rating_min_raters:3,
  source_post:{id:1,title:"Midnight Take",author:"K-Oth",open_in:"social:post",url:"/p/1"},
  initiator:"K-Oth",mine:true,participants:[{username:"K-Oth",worth_cents:6000,receives_cents:6000,funded:true},
  {username:"Nova",worth_cents:4000,receives_cents:4000,funded:true}],
  held_cents:0,held_spinaz:100,created_at:now,i_am_participant:true,i_am_payer:true}];
const BATTLES = [{id:3,title:"Best 16 bars — Trap",mode:"open",status:"open",
  host:"K-Oth",mine:true,entry_spinaz:100,pot_spinaz:900,entries_count:9,
  item_key:"battle:3",rating:null,gates:{},created_at:now,entries:[],
  description:"One take, no punch-ins.",can_enter:true}];
const OCC_SPEC = {tier:"statz",can_execute:true,
  execute_note:"OCC runs your code in a sandbox — a fresh container per run, no network.",
  execute:{configured:true,allowed:true,tier:"statz",required_tier:"statz",
    cost:{resource:"energy",per_second:1},per_run_seconds:120,per_day_seconds:1800,
    seconds_used_today:120,seconds_left_today:1680,max_cost_per_run:120,energy:940,
    languages:["python","javascript","rust","cpp"],billing_note:"Charged for the seconds it ran."},
  tabs:[{key:"workz",icon:"workz.png",name:"WorkZ",emoji:"🧾",desc:"What you gave OCC and what it gave back.",needs:"free",allowed:true},
        {key:"gitz",icon:"gitz.png",name:"GitZ",emoji:"🔀",desc:"Branches, commits and pushes.",needs:"statz",allowed:true},
        {key:"gamez",icon:"gamez.png",name:"GameZ",emoji:"🎮",desc:"Games you built here, by genre.",needs:"premium",allowed:true},
        {key:"filez",icon:"filez.png",name:"FileZ",emoji:"📁",desc:"Files and uploads.",needs:"free",allowed:true},
        {key:"energy",icon:"energy.png",name:"Energy",emoji:"⚡",desc:"How you earned and spent it.",needs:"free",allowed:true},
        {key:"facez",icon:"facez.png",name:"FaceZ",emoji:"🙄",desc:"Faces for AI images and video.",needs:"free",allowed:true}],
  toggles:[{key:"automation",name:"AutomationZ",emoji:"🤖",needs:"statz",desc:"Performs tasks with no confirmation."},
           {key:"suggestionz",name:"SuggestionZ",emoji:"💭",needs:"premium",desc:"Explains what, why and how first."}],
  languages:[{key:"python",name:"Python"},{key:"rust",name:"Rust"},{key:"cpp",name:"C++ (Unreal)"}],
  languages_locked:[],game_genres:[],image_exports:["png","ico"],export_routes:{},
  undo_window_seconds:1800};
const TASKS = {tasks:[
  {id:1,title:"Rebuild the release page",kind:"edit",status:"running",progress:64,eta_seconds:40,
   what:"",why:"",how:"",detail:"",automated:false,git:null,undoable:false,undo_deadline:null,
   undo_window_seconds:1800,run_seconds:0,started_at:now,finished_at:null,created_at:now,updated_at:now},
  {id:2,title:"Commit and push",kind:"git",status:"done",progress:100,eta_seconds:0,
   what:"",why:"",how:"",detail:"exit 0 · 3s",automated:true,git:{repo:"music-connectz",branch:"main",ref:"a1b2c3d"},
   undoable:true,undo_deadline:new Date(Date.now()+9e5).toISOString(),undo_window_seconds:1800,
   run_seconds:3,started_at:now,finished_at:now,created_at:now,updated_at:now}],open:1,undo_window_seconds:1800};
const WORKS = {works:[{id:5,tab:"console",task_id:2,input_text:"write me a hook about rain",
  input_items:[],title:"Hook idea",description:"Rain on the roof, keep the pocket.",
  media_type:"document",media_url:"",image_url:"",lyrics:"",items:[],genre:"",skills_used:[],
  skill_cost_cents:40,shared:false,post_id:null,item_key:null,rating:null,post_url:"",
  share_cost:{resource:"energy",amount:40},share_gain:{},export_route:"document",open_in:"writez",
  send_to:[{key:"postz",label:"Share to PostZ",tab:"social",target:"social-compose",needs_share:false,done:false,note:""},
           {key:"collabz",label:"Take it into CollabZ",tab:"collabz",target:"",needs_share:true,done:false,note:""}],
  created_at:now,updated_at:now}],shared:0,export_routes:{}};

const b = await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
// A real phone viewport (360×640 CSS px at 3×) so the MOBILE layout renders and
// the output is exactly 1080×1920 — the size Play accepts without resampling.
const page = await b.newPage({viewport:{width:360,height:640},deviceScaleFactor:3,
                              isMobile:true,hasTouch:true});
await page.route("**/admin.musicconnectz.net/**", async (route)=>{
  const u = route.request().url();
  const json=(o)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(o)});
  if(u.includes("/occ/spec/")) return json(OCC_SPEC);
  if(u.includes("/occ/settings/")) return json({automation:true,suggestionz:true,pinned_tabs:[],
    automation_allowed:true,suggestionz_allowed:true,pin_limit:null,tier:"statz"});
  if(u.includes("/occ/taskz/")) return json(TASKS);
  if(u.includes("/occ/workz/")) return json(WORKS);
  if(u.includes("/economy/postz/")) return json({posts:POSTS,sort:"hot"});
  if(u.includes("/economy/collab/")) return json({deals:DEALS});
  if(u.includes("/economy/battlez/")) return json({battles:BATTLES});
  if(u.includes("/economy/wallet")) return json({energy:940,spinaz:12400,promptz:63,money_cents:4250});
  if(u.includes("/economy/earn/")) return json({ways:[
    {key:"rating",label:"Rate a member, face or post",gain:1,resource:"energy",available:true,reason:"",
     note:"Your first rating of each thing pays.",cap:"50 a day",tab:"social",target:"social-rate"},
    {key:"referral",label:"Refer someone",gain:300,resource:"spinaz",available:true,reason:"",
     note:"They start with 100 too.",cap:"",tab:"profilez",target:"referral-code"},
    {key:"share",label:"Share another member's post",gain:5,resource:"energy",available:true,reason:"",
     note:"Once per post.",cap:"20 a day",tab:"social",target:"social-feed"}]});
  if(u.includes("/auth/me")) return json(ME);
  if(u.includes("/limits")) return json({char_limit:1e9,tier:"statz",unlimited:true});
  return json({results:[],items:[],posts:[],deals:[],battles:[],conversations:[],inbox:[],sent:[]});
});
await page.addInitScript(()=>{localStorage.setItem("mcz_access","x");localStorage.setItem("mcz_refresh","x");});
await page.goto("http://localhost:4700/", {waitUntil:"networkidle"});
await page.waitForTimeout(1500);

// `scrollTo` lands each shot on the part worth showing rather than on an
// empty composer at the top of the page.
const shots = [
  ["01-postz",      "postz",      "The feed",         "Midnight Take"],
  ["02-collabz",    "collabz",    "Escrowed collabs", "Midnight — topline"],
  ["03-battlez",    "battlez",    "BattleZ",          "Best 16 bars"],
  ["04-occ",        "occ",        "OCC",              "Run it"],
  ["05-occ-workz",  "occ",        "OCC WorkZ",        "WorkZ"],
  ["06-profilez",   "profilez",   "Your profile",     null],
  ["07-membershipz","membershipz","Membership",       null],
];
for (const [name, tab, label, anchor] of shots) {
  await page.evaluate((t)=>window.dispatchEvent(new CustomEvent("mcz-goto-tab",{detail:t})), tab);
  await page.waitForTimeout(1700);
  if (anchor) {
    // Bring the interesting thing into view; ignore it if this build doesn't
    // render that string rather than failing the whole run.
    await page.getByText(anchor, {exact:false}).first()
      .scrollIntoViewIfNeeded({timeout:3000}).catch(()=>{});
    await page.waitForTimeout(700);
  }
  await page.screenshot({path:`${OUT}/${name}.png`});
  const {width,height} = await page.evaluate(()=>({width:innerWidth,height:innerHeight}));
  console.log(`shot ${name}.png — ${label} (${width}x${height} css)`);
}
await b.close(); srv.close();
