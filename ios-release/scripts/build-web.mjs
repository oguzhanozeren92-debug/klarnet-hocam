// Package the approved Klarnet Hocam V6 directly from versioned GitHub
// sources. Never download an unrelated/stale Vercel deployment at build time.
import fs from "node:fs/promises";
import path from "node:path";

const root=process.cwd();
const source=path.join(root,"web");
const out=path.join(root,"www");
const names=["index.html","premium.js","premium.css","polish.css"];
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
const practices=(js.match(/^\['[^\n]*?'\s*,\s*'/gm)||[]).length;
if(!html.includes("Fotoğraflı Müzik Akademisi V6")||
   !html.includes('id="main"')||
   !html.includes('src="./premium.js"')||
   !html.includes('href="./premium.css"')||
   !html.includes('href="./polish.css"'))
  throw new Error("Incorrect HTML version or missing V6 asset references");
if(lessons<29 || !js.includes("const exercises=[") ||
   !js.includes("function showLesson") ||
   !js.includes("function showPractice") ||
   !js.includes("navigator.mediaDevices") ||
   !js.includes("Pitchy") || !js.includes("abcjs") ||
   !js.includes("micToggle") ||
   js.length<100000 || css.length<200000)
  throw new Error("The approved V6 lesson/microphone UI is incomplete; refusing stale TestFlight IPA");
if(practices<35)
  throw new Error("Expected at least 35 training exercises in the V6 curriculum; found "+practices);
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(out,{recursive:true});
for(const name of names)await fs.writeFile(path.join(out,name),assets[name],"utf8");
for(const name of names){
  const st=await fs.stat(path.join(out,name));
  if(st.size===0)throw new Error("Empty packaged V6 resource: "+name);
}
console.log("PASS: packaged approved Klarnet Hocam V6 from GitHub, not Vercel");
console.log("V6 curriculum: "+lessons+" topic lessons, "+practices+" practice items");
console.log("All core lesson content is bundled locally. Optional third-party media/services still need connectivity.");
