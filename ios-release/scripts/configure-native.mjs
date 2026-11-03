// Reapply microphone disclosure, iPhone orientation and actual web bundle
// after Capacitor regenerates its native iOS project.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const projectRoot=process.cwd();
const native=path.join(projectRoot,"ios","App","App");
const project=path.join(projectRoot,"ios","App","App.xcodeproj","project.pbxproj");
const www=path.join(projectRoot,"www");
const config=path.join(projectRoot,"capacitor.config.json");
const plist=path.join(native,"Info.plist");
function required(f){if(!fs.existsSync(f)||!fs.statSync(f).size)throw new Error("Missing required build asset: "+f);}
for(const f of [path.join(www,"index.html"),path.join(www,"premium.js"),path.join(www,"premium.css"),path.join(www,"polish.css"),project,config,plist]) required(f);
const app=JSON.parse(fs.readFileSync(config,"utf8"));
if(app.appId!=="com.oguzhanozeren.klarnethocam")throw new Error("Wrong bundle identifier");
const publicDir=path.join(native,"public");
fs.rmSync(publicDir,{recursive:true,force:true});
fs.cpSync(www,publicDir,{recursive:true,force:true});
fs.copyFileSync(config,path.join(native,"capacitor.config.json"));
const xml=path.join(native,"config.xml");
if(!fs.existsSync(xml))fs.writeFileSync(xml,'<?xml version="1.0" encoding="utf-8"?>\n<widget xmlns="http://www.w3.org/ns/widgets" id="'+app.appId+'" version="1.0.0"><name>Klarnet Hocam</name><content src="index.html"/></widget>\n');
execFileSync("plutil",["-replace","NSMicrophoneUsageDescription","-string","Klarnet calisinizi dinleyerek nota, akort ve ritim dogrulugunu olcmek icin mikrofon kullanilir.",plist]);
execFileSync("plutil",["-replace","UIViewControllerBasedStatusBarAppearance","-bool","false",plist]);
execFileSync("plutil",["-replace","UIStatusBarStyle","-string","UIStatusBarStyleLightContent",plist]);
let pbx=fs.readFileSync(project,"utf8");
if(!pbx.includes("TARGETED_DEVICE_FAMILY"))throw new Error("Expected native iOS device-family build setting missing");
pbx=pbx.replace(/TARGETED_DEVICE_FAMILY = [^;]+;/g,"TARGETED_DEVICE_FAMILY = 1;");
fs.writeFileSync(project,pbx);
for(const name of ["index.html","premium.js","premium.css","polish.css"])required(path.join(publicDir,name));
required(path.join(native,"config.xml"));
required(path.join(native,"capacitor.config.json"));
console.log("PASS: Native iPhone-only resources, microphone disclosure, status bar and real web content.");
