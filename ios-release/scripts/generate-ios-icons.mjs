// Build native Xcode AppIcon.appiconset from the already approved GitHub asset.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const root=process.cwd();
const approved=path.resolve(root,"..","resources","icon.png");
const dest=path.join(root,"ios","App","App","Assets.xcassets","AppIcon.appiconset");
const meta=await sharp(approved).metadata();
if(meta.width!==1024||meta.height!==1024)throw new Error("Approved GitHub icon must be 1024 x 1024");
await fs.mkdir(dest,{recursive:true});
const definitions=[
  ["iphone","20x20",[2,3]],["iphone","29x29",[2,3]],
  ["iphone","40x40",[2,3]],["iphone","60x60",[2,3]],
  ["ipad","20x20",[1,2]],["ipad","29x29",[1,2]],
  ["ipad","40x40",[1,2]],["ipad","76x76",[1,2]],
  ["ipad","83.5x83.5",[2]]
];
const images=[];
for(const [idiom,size,scales] of definitions){
  const pt=Number(size.split("x")[0]);
  for(const scale of scales){
    const px=Math.round(pt*scale);
    const filename=`AppIcon-${idiom}-${size}-${scale}x.png`;
    await sharp(approved).flatten({background:"#080b15"}).resize(px,px).png().toFile(path.join(dest,filename));
    images.push({idiom,size,scale:scale+"x",filename});
  }
}
const marketing="AppIcon-1024.png";
await sharp(approved).flatten({background:"#080b15"}).png().toFile(path.join(dest,marketing));
images.push({idiom:"ios-marketing",size:"1024x1024",scale:"1x",filename:marketing});
await fs.writeFile(path.join(dest,"Contents.json"),JSON.stringify({images,info:{author:"xcode",version:1}},null,2)+"\n");
if(images.length<15)throw new Error("Incomplete iOS icon set");
console.log("PASS: Generated "+images.length+" authentic native iOS app icon sizes from resources/icon.png");
