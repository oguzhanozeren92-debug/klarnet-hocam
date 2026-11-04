/* Klarnet Hocam: opt-in practice reminders + rare post-practice native interstitial.
 * Browser and Vercel previews never simulate native notifications or ad revenue.
 */
(function(){
  "use strict";
  const PREF="kh-reminder-settings-v1";
  const DONE="kh-last-practice-date-v1";
  const IDS=Array.from({length:25},(_,i)=>790200+i);
  const adConfig=window.KLARNET_AD_CONFIG||{enabled:false};
  let adReady=null;
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
  async function test(){
    const p=plugin("LocalNotifications");
    if(!p || (await p.checkPermissions())?.display!=="granted")
      throw Error("Önce iPhone bildirimlerine izin vermelisin.");
    await p.schedule({notifications:[{
      id:790299,title:"🔔 Klarnet Hocam bildirim testi",
      body:"Harika! iPhone çalışma hatırlatmaları çalışıyor.",
      schedule:{at:new Date(Date.now()+5000)},extra:{target:"practice",source:"klarnet-test"},foreground:false
    }]});
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
       '<button type="button" id="kh-test-notification" style="margin-top:10px;width:100%">🔔 5 saniyelik test bildirimi</button>'+
      '<button type="button" id="kh-ad-privacy" hidden>Reklam gizlilik tercihleri</button></div>';
    document.body.appendChild(dialog);dialog.querySelector(".kh-close").onclick=()=>dialog.remove();
    dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.remove()});
    const msg=dialog.querySelector("#kh-notice-status");status(msg);
    const update=async(action)=>{msg.textContent="İşleniyor…";try{await action();status(msg)}catch(e){msg.textContent=e?.message||"İşlem tamamlanamadı.";}}
    dialog.querySelector("#kh-activate").onclick=()=>update(()=>enable(dialog.querySelector("#kh-time").value||"19:00"));
    dialog.querySelector("#kh-deactivate").onclick=()=>update(disable);
    dialog.querySelector("#kh-test-notification").onclick=async()=>{
      try{await test();msg.textContent="Test 5 saniye sonrasına ayarlandı. Ekranı kilitleyip dene.";}
      catch(e){msg.textContent=e?.message||"Test bildirimi planlanamadı.";}
    };
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
    })().then(ok=>{
      if(!ok)adReady=null; // Consent or network might change after a failed attempt.
      return ok;
    });
    return adReady;
  }
  // AdMob: only after a REAL microphone-verified practice is completed,
  // and ONLY after the learner leaves that practice for the exercise list.
  // Never while audio capture, playback, teaching, or a lesson is active.
  const ADS="kh-interstitial-frequency-v1";
  const MIN_GAP_MS=40*60*1000;
  const MAX_DAILY=2;
  let interstitialReady=false,interstitialLoading=null,interstitialShowing=false;
  let adListeners=null,completedPending=false;
  const adUnit=()=>adConfig.testMode===true
    ?"ca-app-pub-3940256099942544/4411468910"
    :String(adConfig.interstitialId||"");
  function loadAdState(){
    const day=today();
    try{
      const x=JSON.parse(localStorage.getItem(ADS)||"null");
      if(x&&Number.isFinite(x.completions)&&Number.isFinite(x.lastShown)&&Array.isArray(x.seen)){
        return {completions:x.completions,lastShown:x.lastShown,
          day,shown:x.day===day&&Number.isFinite(x.shown)?x.shown:0,
          seen:x.seen.slice(-120)};
      }
    }catch{}
    return {completions:0,lastShown:0,day,shown:0,seen:[]};
  }
  function storeAdState(s){
    try{localStorage.setItem(ADS,JSON.stringify(s))}catch{}
  }
  function canOfferInterstitial(){
    if(!native()||adConfig.enabled!==true||interstitialShowing)return false;
    const s=loadAdState();
    return s.completions>0&&s.completions%3===0&&s.shown<MAX_DAILY
      &&(!s.lastShown||Date.now()-s.lastShown>=MIN_GAP_MS);
  }
  function ensureAdListeners(){
    if(adListeners)return adListeners;
    adListeners=(async()=>{
      const mob=plugin("AdMob");
      if(!mob)throw Error("AdMob native plugin unavailable");
      await mob.addListener("interstitialAdDismissed",()=>{interstitialShowing=false;});
      await mob.addListener("interstitialAdFailedToShow",()=>{interstitialShowing=false;});
    })().catch(e=>{adListeners=null;throw e;});
    return adListeners;
  }
  function eligibleUpcomingPractice(practiceId){
    const state=loadAdState();
    return native()&&adConfig.enabled===true&&
      !state.seen.includes(today()+":"+practiceId)&&
      state.completions>=2&&(state.completions+1)%3===0&&
      state.shown<MAX_DAILY&&
      (!state.lastShown||Date.now()-state.lastShown>=MIN_GAP_MS);
  }
  async function preloadPracticeAd(upcoming=false){
    if(!(upcoming||canOfferInterstitial())||interstitialReady)return false;
    if(interstitialLoading)return interstitialLoading;
    interstitialLoading=(async()=>{
      if(!(await adSdk()))return false;
      const mob=plugin("AdMob");if(!mob)return false;
      await ensureAdListeners();
      await mob.prepareInterstitial({adId:adUnit(),npa:true,isTesting:adConfig.testMode===true});
      interstitialReady=true;
      return true;
    })().catch(e=>{console.warn("Klarnet geçiş reklamı yüklenemedi",e?.message);return false;})
      .finally(()=>{interstitialLoading=null;});
    return interstitialLoading;
  }
  function rememberVerifiedCompletion(practiceId){
    const s=loadAdState(),key=today()+":"+practiceId;
    if(s.seen.includes(key))return false; // Same practice doesn't create extra ads today.
    s.seen.push(key);s.seen=s.seen.slice(-120);
    s.completions++;
    storeAdState(s);
    return true;
  }
  async function showPracticeAdAfterExit(){
    if(!completedPending)return;
    completedPending=false;
    // Premium UI must already have navigated away and stopped the microphone.
    if(!document.querySelector('nav [data-page="alistirmalar"].active')||
       document.getElementById("micToggle")||!canOfferInterstitial()||!interstitialReady)return;
    interstitialReady=false;
    interstitialShowing=true;
    try{
      await plugin("AdMob").showInterstitial();
      const s=loadAdState();
      s.shown++;s.lastShown=Date.now();
      storeAdState(s);
    }catch(e){console.warn("Klarnet geçiş reklamı atlandı",e?.message);}
    finally{interstitialShowing=false;}
  }
  function init(){
    if(!document.getElementById("kh-settings-open"))return;
    document.getElementById("kh-settings-open").addEventListener("click",showSettings);
    // Background loading only; the ad itself is never shown during microphone use.
    window.addEventListener("kh:practice-opened",event=>{
      const id=event?.detail?.practiceId;
      if(typeof id==="string"&&eligibleUpcomingPractice(id))void preloadPracticeAd(true);
    });
    window.addEventListener("kh:practice-completed",event=>{
      try{localStorage.setItem(DONE,today())}catch{}
      void syncLocal().catch(e=>console.warn("Practice reminder",e?.message));
      const practiceId=event?.detail?.practiceId;
      if(typeof practiceId!=="string"||!practiceId||!native())return;
      if(!rememberVerifiedCompletion(practiceId))return;
      if(canOfferInterstitial()){
        completedPending=true;
        void preloadPracticeAd();
      }
    });
    document.addEventListener("click",e=>{
      if(e.target?.closest?.("#backPractice")){
        // Back button handler stops the microphone and renders the practice list
        // before the ad can open; never interrupt a live practice session.
        setTimeout(()=>{void showPracticeAdAfterExit()},120);
      }else if(e.target?.closest?.('nav [data-page]')){
        completedPending=false;
      }
    });
    document.addEventListener("visibilitychange",()=>{
      if(!document.hidden&&load().enabled)void syncLocal();
    });
    if(native()&&load().enabled)
      void syncLocal().catch(e=>console.warn("Klarnet reminder sync",e?.message));
    if(native()&&!load().enabled&&localStorage.getItem("kh-notification-offered-v1")!=="1"){
      window.setTimeout(()=>{
        if(load().enabled||localStorage.getItem("kh-notification-offered-v1")==="1")return;
        const card=document.createElement("aside");
        card.setAttribute("role","dialog");
        card.setAttribute("aria-label","Klarnet çalışma hatırlatmaları");
        card.style.cssText="position:fixed;z-index:999;bottom:calc(15px + env(safe-area-inset-bottom));left:12px;right:12px;max-width:430px;margin:auto;background:#17263d;color:white;border:1px solid #7790af;border-radius:17px;padding:16px;box-shadow:0 10px 36px #0008;font:14px system-ui";
        card.innerHTML='<strong>🎵 Klarnet çalışmayı hatırlatalım mı?</strong><p style="line-height:1.5">Her gün seçtiğin saatte iPhone bildirim gönderebilir. Sadece izin verirsen çalışır.</p><div style="display:flex;gap:9px"><button data-open style="flex:1;padding:12px;border:0;border-radius:11px;background:#e7b870;color:#21180c;font-weight:800">Bildirimleri ayarla</button><button data-close style="padding:12px;border:1px solid #93a6bd;border-radius:11px;background:#233c59;color:white">Şimdi değil</button></div>';
        const close=()=>{localStorage.setItem("kh-notification-offered-v1","1");card.remove()};
        card.querySelector("[data-close]").onclick=close;
        card.querySelector("[data-open]").onclick=()=>{close();showSettings()};
        document.body.appendChild(card);
      },2500);
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
