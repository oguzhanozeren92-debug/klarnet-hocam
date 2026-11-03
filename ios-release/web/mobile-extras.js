/* Klarnet Hocam: opt-in native practice reminders + unobtrusive native AdMob banner.
 * Browser and Vercel previews never simulate native notifications or ad revenue.
 */
(function(){
  "use strict";
  const PREF="kh-reminder-settings-v1";
  const DONE="kh-last-practice-date-v1";
  const IDS=Array.from({length:25},(_,i)=>790200+i);
  const adConfig=window.KLARNET_AD_CONFIG||{enabled:false};
  let adReady=null, bannerVisible=false, currentBannerBusy=false;
  const native=()=>!!window.Capacitor?.isNativePlatform?.()&&window.Capacitor?.getPlatform?.()==="ios";
  function plugin(name){
    if(!native())return null;
    const c=window.Capacitor;
    if(c.isPluginAvailable&&!c.isPluginAvailable(name))return null;
    return c.Plugins?.[name]||(typeof c.registerPlugin==="function"?c.registerPlugin(name):null);
  }
  function today(){
    return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",
      year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  }
  function load(){
    try{const s=JSON.parse(localStorage.getItem(PREF)||"null");
      return {enabled:s?.enabled===true,time:/^([01]\d|2[0-3]):[0-5]\d$/.test(s?.time||"")?s.time:"19:00"};}
    catch{return {enabled:false,time:"19:00"};}
  }
  function save(p){localStorage.setItem(PREF,JSON.stringify(p));}
  async function cancelLocal(p){await p.cancel({notifications:IDS.map(id=>({id}))});}
  async function syncLocal(){
    const p=plugin("LocalNotifications");if(!p)return false;
    const pref=load();await cancelLocal(p);
    if(!pref.enabled)return true;
    const permission=await p.checkPermissions();if(permission.display!=="granted")return false;
    const [hour,minute]=pref.time.split(":").map(Number),now=Date.now();
    const skipToday=localStorage.getItem(DONE)===today();
    const list=[];
    for(let offset=0;offset<25;offset++){
      const at=new Date();at.setHours(hour,minute,0,0);at.setDate(at.getDate()+offset);
      if(at.getTime()<=now+60000 || (offset===0&&skipToday))continue;
      list.push({id:IDS[list.length],title:"🎶 Klarnet Hocam",body:"Bugünkü klarnet pratiğini yaptın mı? Birkaç dakika çalalım.",
        schedule:{at},extra:{target:"practice"},foreground:false});
    }
    if(list.length)await p.schedule({notifications:list});
    return true;
  }
  async function enable(time){
    const p=plugin("LocalNotifications");
    if(!p)throw Error("Bildirimler yalnız iPhone uygulamasında kullanılabilir.");
    const permission=await p.requestPermissions();
    if(permission.display!=="granted")throw Error("iPhone bildirim izni verilmedi.");
    save({enabled:true,time});await syncLocal();
  }
  async function disable(){
    save({enabled:false,time:load().time});
    const p=plugin("LocalNotifications");if(p)await cancelLocal(p);
  }
  function status(el){const p=load();el.textContent=!native()?
    "Bu ayar iPhone uygulamasında çalışır.":
    p.enabled?"Hatırlatmalar açık: her gün "+p.time:"Günlük hatırlatmalar kapalı.";}
  function showSettings(){
    if(document.getElementById("kh-modal"))return;
    const pref=load(),dialog=document.createElement("div");dialog.id="kh-modal";
    dialog.innerHTML='<div class="kh-dialog" role="dialog" aria-modal="true" aria-labelledby="kh-title">'+
      '<button class="kh-close" type="button" aria-label="Kapat">✕</button>'+
      '<h2 id="kh-title">🎵 Günlük çalışma hatırlatması</h2>'+
      '<p>Her gün yalnız bir nazik bildirim. Bugün pratik yaptıysan hatırlatma gönderilmez. İstersen kapatabilirsin.</p>'+
      '<label class="kh-time-label">Saat <input id="kh-time" type="time" value="'+pref.time+'"></label>'+
      '<p id="kh-notice-status" role="status"></p>'+
      '<div class="kh-actions"><button type="button" id="kh-activate">Bildirimleri aç</button>'+
      '<button type="button" id="kh-deactivate">Kapat</button></div>'+
      '<button type="button" id="kh-ad-privacy" hidden>Reklam gizlilik tercihleri</button></div>';
    document.body.appendChild(dialog);dialog.querySelector(".kh-close").onclick=()=>dialog.remove();
    dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.remove()});
    const msg=dialog.querySelector("#kh-notice-status");status(msg);
    const update=async(action)=>{msg.textContent="İşleniyor…";try{await action();status(msg)}catch(e){msg.textContent=e?.message||"İşlem tamamlanamadı.";}}
    dialog.querySelector("#kh-activate").onclick=()=>update(()=>enable(dialog.querySelector("#kh-time").value||"19:00"));
    dialog.querySelector("#kh-deactivate").onclick=()=>update(disable);
    const adButton=dialog.querySelector("#kh-ad-privacy");
    if(native()&&adConfig.enabled===true){
      adButton.hidden=false;
      adButton.onclick=async()=>{try{await plugin("AdMob")?.showPrivacyOptionsForm();}
        catch{msg.textContent="Reklam gizlilik formu şu anda açılamıyor.";}};
    }
  }
  async function adSdk(){
    if(!native()||adConfig.enabled!==true)return false;
    if(adReady)return adReady;
    adReady=(async()=>{
      const admob=plugin("AdMob");if(!admob)return false;
      try{
        let consent=await admob.requestConsentInfo();
        if(consent?.isConsentFormAvailable&&consent?.status==="REQUIRED")
          consent=await admob.showConsentForm();
        if(!consent?.canRequestAds)return false;
        await admob.initialize({initializeForTesting:adConfig.testMode===true});
        return true;
      }catch(e){console.warn("Klarnet AdMob not ready",e?.message);return false;}
    })();
    return adReady;
  }
  async function syncBanner(){
    if(!native()||!plugin("AdMob")||currentBannerBusy)return;
    const onHome=!!document.querySelector('nav [data-page="home"].active');
    const allowed=onHome&&adConfig.enabled===true;
    if(allowed===bannerVisible)return;
    currentBannerBusy=true;const admob=plugin("AdMob");
    try{
      if(!allowed){await admob.hideBanner();bannerVisible=false;document.body.classList.remove("kh-banner-visible");return;}
      if(!(await adSdk()))return;
      await admob.showBanner({adId:adConfig.bannerId,adSize:"ADAPTIVE_BANNER",
        position:"BOTTOM_CENTER",margin:86,npa:true,isTesting:adConfig.testMode===true});
      bannerVisible=true;document.body.classList.add("kh-banner-visible");
    }catch(e){console.warn("Klarnet banner skipped",e?.message)}
    finally{currentBannerBusy=false}
  }
  function init(){
    if(!document.getElementById("kh-settings-open"))return;
    document.getElementById("kh-settings-open").addEventListener("click",showSettings);
    window.addEventListener("kh:practice-completed",()=>{
      try{localStorage.setItem(DONE,today())}catch{}
      void syncLocal().catch(e=>console.warn("Practice reminder",e?.message));
    });
    document.addEventListener("click",e=>{
      if(e.target.closest('nav [data-page]'))setTimeout(()=>{void syncBanner()},80);
    });
    document.addEventListener("visibilitychange",()=>{
      if(!document.hidden){if(load().enabled)void syncLocal();void syncBanner()}
    });
    if(native()){
      if(load().enabled)void syncLocal().catch(e=>console.warn("Klarnet reminder sync",e?.message));
      setTimeout(()=>{void syncBanner()},350);
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
