// Package the approved Klarnet Hocam V6 directly from versioned GitHub
// sources. Never download an unrelated/stale Vercel deployment at build time.
import fs from "node:fs/promises";
import path from "node:path";

const root=process.cwd();
const source=path.join(root,"web");
const out=path.join(root,"www");
const names=["index.html","premium.js","premium.css","polish.css","mobile-extras.js","mobile-extras.css"];
const assets={};
for(const name of names){
  const file=path.join(source,name);
  assets[name]=await fs.readFile(file,"utf8").catch(error=>{
    throw new Error("Approved Klarnet Hocam V6 source missing: "+file+" ("+error.message+")");
  });
}
const html=assets["index.html"];
const js=assets["premium.js"];
const css=assets["premium.css"];
const lessons=(js.match(/^add\('/gm)||[]).length;
const exercisesStart=js.indexOf("const exercises=[");
const exercisesEnd=js.indexOf("const main=",exercisesStart);
const exerciseCatalogue=exercisesStart>=0 && exercisesEnd>exercisesStart
  ? js.slice(exercisesStart,exercisesEnd):"";
// Entries can appear several times on the same line, so do not anchor to ^.
const practices=(exerciseCatalogue.match(/\[\s*'[^'\n]+'\s*,\s*'[^'\n]+'\s*\]/g)||[]).length;
if(!html.includes("Fotoğraflı Müzik Akademisi V6")||
   !html.includes('id="main"')||
   !html.includes('src="./premium.js"')||
   !html.includes('href="./premium.css"')||
   !html.includes('href="./polish.css"')||
   !html.includes('src="./mobile-extras.js"')||
   !html.includes('src="./mobile-config.js"')||
   !html.includes('id="kh-settings-open"'))
  throw new Error("Incorrect HTML version or missing V6 asset references");
if(lessons<29 || !js.includes("const exercises=[") ||
   !js.includes("function showLesson") ||
   !js.includes("function showPractice") ||
   !js.includes("navigator.mediaDevices") ||
   !js.includes("Pitchy") || !js.includes("abcjs") ||
   !js.includes("micToggle") ||
   js.length<100000 || css.length<200000)
  throw new Error("The approved V6 lesson/microphone UI is incomplete; refusing stale TestFlight IPA");
if(practices!==35)
  throw new Error("Expected exactly 35 training exercises in the V6 curriculum; found "+practices);
// Native iPhone only; no banner and no web impressions. Interstitial after verified practice exit.
const mode=String(process.env.KLARNET_ADMOB_MODE||"disabled").trim();
if(!["disabled","test","production"].includes(mode))
  throw Error("Invalid KLARNET_ADMOB_MODE; use disabled, test or production");
if(mode==="test"&&process.env.KLARNET_ADMOB_ALLOW_TESTFLIGHT!=="1")
  throw Error("Klarnet demo AdMob units require explicit TestFlight opt-in");
const appId=String(process.env.KLARNET_ADMOB_APP_ID||"").trim();
const interstitialId=String(process.env.KLARNET_ADMOB_INTERSTITIAL_ID||"").trim();
const appPattern=/^ca-app-pub-\d{16}~\d{10}$/;
const unitPattern=/^ca-app-pub-\d{16}\/\d{10}$/;
if(mode==="production"&&(!appPattern.test(appId)||!unitPattern.test(interstitialId)||
    appId.startsWith("ca-app-pub-3940256099942544")||
    interstitialId.startsWith("ca-app-pub-3940256099942544")))
  throw Error("Production Klarnet AdMob needs the app's own real APP and INTERSTITIAL IDs");
const config={
  enabled:mode!=="disabled",
  testMode:mode==="test",
  interstitialId:mode==="test"?"ca-app-pub-3940256099942544/4411468910":(mode==="production"?interstitialId:""),
};
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(out,{recursive:true});
for(const name of names)await fs.writeFile(path.join(out,name),assets[name],"utf8");
await fs.writeFile(path.join(out,"mobile-config.js"),
  "window.KLARNET_AD_CONFIG=Object.freeze("+JSON.stringify(config)+");\n","utf8");
for(const name of names){
  const st=await fs.stat(path.join(out,name));
  if(st.size===0)throw new Error("Empty packaged V6 resource: "+name);
}
console.log("PASS: packaged approved Klarnet Hocam V6 from GitHub, not Vercel");
console.log("V6 curriculum: "+lessons+" topic lessons, "+practices+" practice items");
console.log("All core lesson content is bundled locally. Optional third-party media/services still need connectivity.");
console.log("Klarnet native AdMob mode: "+mode+"; local notifications remain user opt-in.");
