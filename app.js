
const KEY="NSCT_SAISONNIER_V1";
let startupRecoveryWarning="";
const DEFAULT_FIELDS=["Nom","Prénoms","Sexe","Date de naissance","Lieu de naissance","Téléphone","Adresse","Situation matrimoniale","Niveau d'étude","Diplôme","Père","Mère","Contact urgence","Documents","Lieu de dépôt"];
let db;
try{db=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){
 const damaged=localStorage.getItem(KEY);
 try{if(damaged)localStorage.setItem(KEY+"_RECOVERY_COPY",damaged)}catch(ignore){}
 startupRecoveryWarning="Le fichier de données locales était illisible. Le logiciel a conservé une copie de récupération si le navigateur l’a permis, puis va démarrer avec une base vide. N’effectuez aucune nouvelle inscription avant d’avoir vérifié les données et restauré une sauvegarde valide.";
 db=null;
}
db=db||{
 users:[{id:"ADMIN001",pwd:"admin123",nom:"Administrateur",prenoms:"Principal",role:"Administrateur",active:true,perms:["all"]}],
 applicants:[],registrations:[],activities:[],
 settings:{newFields:DEFAULT_FIELDS,teams:["ÉQUIPE A","ÉQUIPE B","ÉQUIPE C","ÉQUIPE D"],usines:[],roles:["Recruteur","Chef Quart","Chef Usine","Administrateur"],startAt:"",endAt:"",resultsAt:"",importedTemplate:null,companyName:"NSCT",companySubtitle:"Gestion des recrutements saisonniers",homePhoto:"",homePhotos:[],companyLogo:"",adminProfile:{nom:"",prenoms:""},resultsPublic:false},
 seq:1000,applicantSeq:1000,registrationSeq:1000
};
let session=null, authMode="admin", timerHandle=null;
try{document.documentElement.dataset.theme=localStorage.getItem("NSCT_THEME")||"clair"}catch(e){}
db.settings=db.settings||{}; db.settings.theme=db.settings.theme||"clair"; db.settings.newFields=db.settings.newFields||DEFAULT_FIELDS; db.settings.teams=db.settings.teams||["ÉQUIPE A","ÉQUIPE B","ÉQUIPE C","ÉQUIPE D"];db.settings.teamFactories=db.settings.teamFactories||{};
db.settings.usines=db.settings.usines||[];db.settings.teamFactories=db.settings.teamFactories||{};db.settings.startAt=db.settings.startAt||"";db.settings.endAt=db.settings.endAt||"";db.settings.resultsAt=db.settings.resultsAt||"";db.settings.importedTemplate=db.settings.importedTemplate||null;db.settings.roles=db.settings.roles||["Recruteur","Chef Quart","Chef Usine","Administrateur"];db.settings.companyName=db.settings.companyName||"NSCT";db.settings.companySubtitle=db.settings.companySubtitle||"Gestion des recrutements saisonniers";db.settings.homePhoto=db.settings.homePhoto||"";db.settings.homePhotos=db.settings.homePhotos||[];if(db.settings.homePhoto&&!db.settings.homePhotos.includes(db.settings.homePhoto))db.settings.homePhotos.unshift(db.settings.homePhoto);db.settings.companyLogo=db.settings.companyLogo||"";db.settings.adminProfile=db.settings.adminProfile||{nom:"",prenoms:""};db.settings.welcomePhotos=db.settings.welcomePhotos||[];db.settings.welcomePhotoIndex=0;db.settings.welcomeVideos=db.settings.welcomeVideos||[];db.settings.welcomeVideosEnabled=!!db.settings.welcomeVideosEnabled;db.settings.resultsPublic=!!db.settings.resultsPublic;db.settings.entryPasswords=db.settings.entryPasswords||{admin:"admin123",staff:"",candidate:""};db.settings.registrationStopped=!!db.settings.registrationStopped;db.settings.registrationStopReason=db.settings.registrationStopReason||"";db.settings.signatureAuthorized=db.settings.signatureAuthorized||[];db.settings.cachetAuthorized=db.settings.cachetAuthorized||[];db.settings.signatures=db.settings.signatures||{};db.settings.cachet=db.settings.cachet||"";applySystemTheme(db.settings.theme);
db.users.forEach(u=>{u.usine=u.usine||"TOUTES"});
db.applicants=db.applicants||[];db.registrations=db.registrations||[];db.applicantSeq=Number.isFinite(db.applicantSeq)?db.applicantSeq:Math.max(1000,...db.applicants.map(a=>parseInt(String(a.id||"").replace(/^POST/,""),10)||1000));db.registrationSeq=Number.isFinite(db.registrationSeq)?db.registrationSeq:Math.max(1000,...db.registrations.map(r=>parseInt(String(r.id||"").replace(/^NSCT\d{4}/,""),10)||1000));db.settings.retainedDateTime=db.settings.retainedDateTime||"";db.settings.retainedActivities=db.settings.retainedActivities||"";db.registrations.forEach(r=>{r.usine=r.usine||r.data?.usine||""});db.activities=db.activities||[];db.users=db.users||[];
if(!db.users.some(u=>u.isMainAdmin)){let a=db.users.find(u=>u.id==="ADMIN001")||db.users.find(u=>u.role==="Administrateur");if(a)a.isMainAdmin=true;else db.users.unshift({id:"ADMIN001",pwd:"admin123",nom:"Administrateur",prenoms:"Principal",role:"Administrateur",active:true,perms:["all"],isMainAdmin:true});}
db.applicants.forEach(a=>{a.perms=a.perms||[];a.active=a.active!==false;a.usine=a.usine||""});
function isMainAdmin(){return !!session?.isMainAdmin}
function visibleRegistrations(){
 if(!session)return [];
 if(isMainAdmin())return db.registrations;
 if(session.role==="Postulant")return db.registrations.filter(r=>r.account===session.id);
 if(session.usine)return db.registrations.filter(r=>r.usine===session.usine);
 return [];
}
function registrationByIdVisible(id){return visibleRegistrations().find(r=>r.id===id)}
function visibleApplicants(){
 if(isMainAdmin())return db.applicants;
 if(session?.role==="Postulant")return db.applicants.filter(a=>a.id===session.id);
 if(session?.usine)return db.applicants.filter(a=>db.registrations.some(r=>r.account===a.id&&r.usine===session.usine));
 return [];
}
function save(){
 try{localStorage.setItem(KEY,JSON.stringify(db));return true}
 catch(e){alert("Sauvegarde impossible : le stockage local du navigateur est limité et ne peut pas être agrandi depuis ce logiciel. Ne fermez pas cette page. Téléchargez une sauvegarde si possible, réduisez la taille des pièces jointes et réessayez. Pour accepter de gros documents de façon fiable, il faudra migrer les données vers IndexedDB ou une base de données en ligne.");return false}
}
function $(id){return document.getElementById(id)}
function esc(x){return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function can(p){return !!session&&(session.perms?.includes("all")||session.perms?.includes(p))}
function log(action){db.activities.unshift({date:new Date().toLocaleString(),user:session?.id||"PUBLIC",action});save()}
function showAuthScreen(){
  $("homeScreen").classList.add("hidden");
  $("authScreen").classList.remove("hidden");
  $("loginMsg").textContent="";
}
function backHomeAuth(){
  $("authZone").innerHTML="";
  $("loginMsg").textContent="";
  $("authScreen").classList.add("hidden");
  $("homeScreen").classList.remove("hidden");
  window.selectedAccess="";
  if(window.entryRole)renderEntryHome(window.entryRole);
}
function openLogin(kind){
  showAuthScreen();
  const z=$("authZone");
  if(kind==='admin'){
    z.innerHTML=`<div class="authPanel innerAccess"><h2>Administration</h2><p class="small">Choisissez votre type d'accès.</p><div class="homeChoices accessChoices"><button onclick="openAdminType('Administrateur')">Administrateur</button><button onclick="openAdminType('Personnel')">Personnel</button></div><button class="secondary" onclick="backHomeAuth()">← Retour à l'accueil</button></div>`;fitSessionBar();
  }else if(kind==='candidate'){
    z.innerHTML=`<div class="authPanel innerAccess"><h2>Candidat</h2><p class="small">Connectez-vous avec votre compte candidat enregistré dans le système.</p><input id="loginId" autocomplete="username" placeholder="Identifiant candidat"><input id="loginPwd" autocomplete="current-password" type="password" placeholder="Mot de passe"><button onclick="setAccessAndLogin('candidate')">Se connecter</button><button class="secondary" onclick="backHomeAuth()">← Retour à l'accueil</button></div>`;fitSessionBar();
  }
}
function openAdminType(type){
  window.selectedAccess=(type==='Administrateur'?'Administrateur':'Personnel');
  authMode='admin';
  showAuthScreen();
  const z=$("authZone");
  const plants=(db.settings.usines||[]).map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  if(type==='Administrateur'){
    z.innerHTML=`<div class="authPanel innerAccess"><h2>Administration — Administrateur</h2><p class="small">Connexion de l'administrateur principal. Aucune usine n'est demandée.</p><input id="loginId" autocomplete="username" placeholder="Identifiant administrateur"><input id="loginPwd" autocomplete="current-password" type="password" placeholder="Mot de passe"><button onclick="setAccessAndLogin('admin')">Se connecter</button><button class="secondary" onclick="openLogin('admin')">← Choisir un autre accès</button></div>`;fitSessionBar();
  }else{
    z.innerHTML=`<div class="authPanel innerAccess"><h2>Administration — Personnel</h2><p class="small">Sélectionnez l'usine enregistrée sur votre compte, puis connectez-vous.</p><label>Usine<select id="loginPlant"><option value="">Sélectionner l'usine</option>${plants}</select></label><input id="loginId" autocomplete="username" placeholder="Identifiant personnel"><input id="loginPwd" autocomplete="current-password" type="password" placeholder="Mot de passe"><button onclick="setAccessAndLogin('staff')">Se connecter</button><button class="secondary" onclick="openLogin('admin')">← Choisir un autre accès</button></div>`;fitSessionBar();
  }
}
function setAccessAndLogin(type){
  if(type==='candidate'){window.selectedAccess='candidate';authMode='candidate';}
  else if(type==='admin'){window.selectedAccess='Administrateur';authMode='admin';}
  else if(type==='staff'){window.selectedAccess='Personnel';authMode='admin';}
  login();
}
function openCreateAccount(){
  showAuthScreen();
  $("authZone").innerHTML=`<div class="authPanel innerAccess"><h2>Création d'un compte candidat</h2><p class="small">Créez d'abord votre compte. Il sera enregistré dans le système avant toute candidature.</p><input id="regNom" placeholder="Nom"><input id="regPrenoms" placeholder="Prénoms"><input id="regPhone" placeholder="Téléphone"><input id="regPwd" type="password" placeholder="Mot de passe (à retenir)"><input id="regPwd2" type="password" placeholder="Confirmer le mot de passe"><button class="secondary" onclick="createApplicantAccount()">Créer mon compte</button><button class="secondary" onclick="backHomeAuth()">← Retour à l'accueil</button><p class="small">Après création, votre identifiant sera affiché et enregistré automatiquement chez l'administration.</p></div>`;
  $("loginMsg").textContent="";
}
function openForgot(){
  showAuthScreen();
  $("authZone").innerHTML=`<div class="authPanel innerAccess"><h2>Identifiant ou mot de passe oublié</h2><input id="forgotPhone" placeholder="Téléphone utilisé à la création du compte"><button onclick="forgotAccount()">Rechercher</button><button class="secondary" onclick="backHomeAuth()">← Retour à l'accueil</button><p class="small">Le système recherchera le compte avec ce numéro et affichera les identifiants sur cette page. Aucun SMS ni message externe ne sera envoyé.</p></div>`;
  $("loginMsg").textContent="";
}
function normalizeSurname(v){return String(v||"").trim().toLocaleUpperCase("fr-FR")}
function normalizeGivenNames(v,trim=true){let value=String(v||"").toLocaleLowerCase("fr-FR").replace(/(^|[\s\-’'])(\p{L})/gu,(m,sep,ch)=>sep+ch.toLocaleUpperCase("fr-FR"));return trim?value.trim():value}
function normalizeNameInput(el){if(!el)return;const id=(el.id||"").toLowerCase(),ph=(el.getAttribute("placeholder")||"").toLowerCase(),lab=(el.closest("label")?.childNodes?.[0]?.textContent||"").trim().toLowerCase();if(id==="regnom"||id==="unom"||id==="adminnom"||ph==="nom"||/^nom$/.test(lab))el.value=normalizeSurname(el.value);else if(id==="regprenoms"||id==="upr"||id==="adminprenoms"||ph==="prénoms"||/^prénoms?$/.test(lab))el.value=normalizeGivenNames(el.value,false)}
document.addEventListener("input",e=>{if(e.target instanceof HTMLInputElement)normalizeNameInput(e.target)});
document.addEventListener("change",e=>{if(e.target instanceof HTMLInputElement)normalizeNameInput(e.target)});
function normalizePhone(v){return String(v||"").replace(/\\s+/g,"").trim()}
function createApplicantAccount(){
 let nom=normalizeSurname($("regNom").value),pr=normalizeGivenNames($("regPrenoms").value),ph=normalizePhone($("regPhone").value),pwd=$("regPwd").value,p2=$("regPwd2").value;
 $("regNom").value=nom;$("regPrenoms").value=pr;
 if(!nom||!pr||!pwd||!ph)return $("loginMsg").textContent="Nom, prénoms, téléphone et mot de passe sont obligatoires.";
 if(pwd!==p2)return $("loginMsg").textContent="Les deux mots de passe ne correspondent pas.";
 const existing=db.applicants.find(a=>normalizePhone(a.phone)===ph);
 if(existing){
   $("loginMsg").innerHTML=`<div class="locked"><b>Ce numéro possède déjà un compte candidat.</b><br>Vous ne pouvez pas créer un deuxième compte. Utilisez le compte existant pour effectuer votre inscription.<br><button class="secondary" onclick="openForgot()">Identifiant ou mot de passe oublié</button></div>`;fitSessionBar();
   return;
 }
 db.applicantSeq=(db.applicantSeq||1000)+1;let id="POST"+String(db.applicantSeq).padStart(5,"0");
 db.applicants.push({id,pwd,nom,prenoms:pr,phone:ph,created:new Date().toISOString(),active:true,perms:["inscription"]});
 if(!save()){db.applicants.pop();db.applicantSeq--;return;}
 showAuthScreen();
 $("authZone").innerHTML=`<div class="authPanel innerAccess accountCreated"><h2>Compte candidat créé</h2><div class="accountCredentials"><p><b>Votre identifiant :</b></p><div class="credential">${esc(id)}</div><p><b>Votre mot de passe :</b></p><div class="credential">${esc(pwd)}</div></div><div class="locked"><b>IMPORTANT :</b> conservez soigneusement cet identifiant et ce mot de passe. Ils vous serviront à vous connecter à votre espace candidat et à consulter ultérieurement vos résultats d'admission.</div><button onclick="openCandidateLoginWithId('${esc(id)}')">Se connecter comme candidat</button><button class="secondary" onclick="backHomeAuth()">← Retour à l'accueil</button></div>`;fitSessionBar();
 $("loginMsg").textContent="";
 logPublic("Création du compte candidat "+id);
}
function logPublic(action){db.activities.unshift({date:new Date().toLocaleString(),user:"PUBLIC",action});save()}
function forgotAccount(){
 const ph=normalizePhone($("forgotPhone")?.value);
 if(!ph)return $("loginMsg").textContent="Veuillez saisir le numéro de téléphone utilisé lors de la création du compte.";
 const a=db.applicants.find(x=>normalizePhone(x.phone)===ph);
 if(!a)return $("loginMsg").textContent="Aucun compte candidat ne correspond à ce numéro de téléphone.";
 $("authZone").innerHTML=`<div class="authPanel innerAccess accountCreated"><h2>Compte candidat retrouvé</h2><p>Votre compte existe déjà dans la base de données.</p><div class="accountCredentials"><p><b>Votre identifiant :</b></p><div class="credential">${esc(a.id)}</div><p><b>Votre mot de passe :</b></p><div class="credential">${esc(a.pwd)}</div></div><div class="locked"><b>Important :</b> conservez ces informations. Il s'agit de votre compte unique pour vous connecter et effectuer votre inscription.</div><button onclick="openCandidateLoginWithId('${esc(a.id)}')">Se connecter comme candidat</button><button class="secondary" onclick="backHomeAuth()">← Retour à l'accueil</button></div>`;fitSessionBar();
 $("loginMsg").textContent="";
 logPublic("Récupération des identifiants du compte candidat "+a.id);
}
function openCandidateLoginWithId(id){showAuthScreen();window.selectedAccess='candidate';authMode='candidate';$("authZone").innerHTML=`<div class="authPanel innerAccess"><h2>Candidat</h2><p class="small">Connectez-vous avec votre compte candidat enregistré dans le système.</p><input id="loginId" autocomplete="username" placeholder="Identifiant candidat" value="${esc(id)}"><input id="loginPwd" autocomplete="current-password" type="password" placeholder="Mot de passe"><button onclick="setAccessAndLogin('candidate')">Se connecter</button><button class="secondary" onclick="backHomeAuth()">← Retour à l'accueil</button></div>`;$("loginMsg").textContent=""}

function login(){
 let id=$("loginId")?.value.trim()||"",pwd=$("loginPwd")?.value||"",plant=$("loginPlant")?.value||"",u=null;
 const mainAdmin=db.users.find(x=>x.isMainAdmin);
 if(authMode==="admin"){
  const access=window.selectedAccess||"";
  if(!access)return $("loginMsg").textContent="Veuillez d'abord sélectionner Administrateur ou Personnel.";
  if(!id||!pwd)return $("loginMsg").textContent="Identifiant et mot de passe obligatoires.";
  if(access==="Administrateur"){
   u=mainAdmin && mainAdmin.id===id && mainAdmin.pwd===pwd && mainAdmin.active!==false ? mainAdmin : null;
   if(!u)return $("loginMsg").textContent="Identifiants administrateur incorrects ou compte non autorisé.";
  }else{
   if(!plant)return $("loginMsg").textContent="Veuillez sélectionner l'usine de votre compte.";
   u=db.users.find(x=>!x.isMainAdmin && x.id===id && x.pwd===pwd && x.active!==false && x.role!=="Administrateur" && x.usine===plant);
   if(!u)return $("loginMsg").textContent="Compte personnel, usine ou identifiants incorrects.";
  }
 }else if(authMode==="candidate"){
  u=db.applicants.find(x=>x.id===id&&x.pwd===pwd&&x.active!==false);
  if(!u)return $("loginMsg").textContent="Compte candidat introuvable, désactivé ou identifiants incorrects. Créez d'abord votre compte.";
 }else{return $("loginMsg").textContent="Choisissez votre mode de connexion depuis la page d'accueil.";}
 session=u;if(authMode==="candidate"){session.role="Postulant";session.perms=u.perms||[]}
 log("Connexion");$("loginView").classList.add("hidden");$("mainView").classList.remove("hidden");
 $("sessionBox").innerHTML=`<div class="sessionUser"><span><b>${esc(session.role)}</b> — ${esc(u.nom)} ${esc(u.prenoms)} ${u.usine?`— ${esc(u.usine)}`:""}</span><button class="danger sessionLogout" onclick="logout()">Déconnexion</button></div>`;fitSessionBar();
 renderNav();startCountdown();showPage(session.role==="Postulant"?candidateLandingPage():"dashboard");
}
function logout(){if(session)log("Déconnexion");session=null;clearInterval(timerHandle);$("mainView").classList.add("hidden");$("loginView").classList.remove("hidden");$("sessionBox").innerHTML="";$("authZone").innerHTML="";$("loginMsg").textContent="";showEntryGate();renderBrand()}
function toggleSidebar(){$("sidebar").classList.toggle("collapsed")}
function countdownText(){
 let s=db.settings.startAt,e=db.settings.endAt,now=Date.now();
 if(!s||!e)return "Fin des inscriptions : non configurée";
 let en=new Date(e).getTime();
 if(db.settings.registrationStopped || now>=en){
   if(now>=en && !db.settings.registrationStopped){db.settings.registrationStopped=true;db.settings.registrationStopReason="Temps imparti terminé";save();}
   return "Fin des inscriptions : 0j 00h 00m 00s";
 }
 return `Fin des inscriptions : ${fmtTime(en-now)}`;
}
function fmtTime(ms){ms=Math.max(0,ms);let sec=Math.floor(ms/1000),d=Math.floor(sec/86400);sec%=86400;let h=Math.floor(sec/3600);sec%=3600;let m=Math.floor(sec/60);sec%=60;return `${d}j ${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m ${String(sec).padStart(2,"0")}s`}
function startCountdown(){clearInterval(timerHandle);let tick=()=>{let txt=esc(countdownText());document.querySelectorAll("[data-countdown]").forEach(el=>el.innerHTML=txt);if(periodState()==="CLOSED"||resultsConsultationAvailable())renderNav();};tick();timerHandle=setInterval(tick,1000)}
function periodState(){if(db.settings.registrationStopped)return "CLOSED";let s=db.settings.startAt,e=db.settings.endAt,now=Date.now();if(!s||!e)return "OPEN";if(now<new Date(s).getTime())return "BEFORE";if(now>=new Date(e).getTime()){db.settings.registrationStopped=true;db.settings.registrationStopReason="Temps imparti terminé";save();return "CLOSED";}return "OPEN"}
function showPage(page){
 const c=$("content");const allowed=["dashboard","statistiques","inscription","postulants","listes","analyser","validation","resultats","chefquart","cheffab","signature","parametres"];if(!allowed.includes(page))return;
 if(page==="dashboard")return dashboard(c);if(page==="statistiques")return statistiques(c);if(page==="inscription")return inscription(c);if(page==="postulants")return postulants(c);if(page==="listes")return listes(c);if(page==="analyser")return analyser(c);if(page==="validation")return validation(c);if(page==="resultats")return resultats(c);if(page==="chefquart")return chefquart(c);if(page==="cheffab")return cheffab(c);if(page==="signature")return signaturePage(c);if(page==="parametres")return parametres(c)
}
const NAV=[["dashboard","Tableau de bord"],["statistiques","Statistiques générales"],["inscription","Inscription"],["postulants","Identifiants postulants"],["listes","Liste des postulants"],["analyser","Analyser"],["validation","Validation après le test"],["resultats","Résultats"],["chefquart","Espace chef quart"],["cheffab","Espace chef usine"],["signature","Signature et cachet"],["parametres","Paramètres"]];
function resultsAvailable(){return db.registrations.some(r=>r.status==="RETENU"||r.status==="REFUSÉ")}
function resultsConsultationAvailable(){
 if(session?.role==="Postulant" && periodState()!=="CLOSED")return false;
 let when=db.settings.resultsAt;
 if(!db.settings.resultsPublic)return false;
 if(!when)return true;
 return Date.now()>=new Date(when).getTime();
}
function candidateLandingPage(){
 if(session?.role!=="Postulant")return "dashboard";
 if(periodState()==="CLOSED" && resultsConsultationAvailable())return "validation";
 return "inscription";
}
function downloadUserGuide(){
 const isCandidate=!!session&&session.role==="Postulant";
 const userName=session?`${session.prenoms||""} ${session.nom||""}`.trim():"Visiteur";
 const role=session?(isCandidate?"Candidat":session.role):"Guide général — page d’accueil";
 const allowed=session?(isCandidate?[...[...(periodState()!=="CLOSED"?["Inscription"]:[]),...(resultsConsultationAvailable()?["Consultation des résultats"]:[])] ]:NAV.filter(([p])=>can(p)).map(([,label])=>label)):[];
 const permsText=session?(isCandidate?"Le candidat peut consulter et gérer uniquement son propre compte et sa candidature. La consultation des résultats dépend de l’autorisation et de la date fixées par l’administration.":(session.perms?.includes("all")?"Toutes les rubriques sont autorisées pour ce compte.":(allowed.length?"Rubriques autorisées : "+allowed.join(", "):"Aucune rubrique de gestion n’est autorisée pour ce compte. Contactez l’administrateur."))):"Ce guide présente les accès disponibles. Après connexion, le guide s’adapte au rôle et aux autorisations du compte connecté.";
 const mainAdmin=isMainAdmin();
 const tips=isCandidate?[
  "Connectez-vous avec l’identifiant et le mot de passe du compte candidat.",
  "Vérifiez vos informations personnelles avant de remplir la candidature.",
  "Choisissez le type de candidature demandé et complétez les champs affichés.",
  "Ajoutez les documents exigés, puis vérifiez les informations avant validation.",
  "Conservez votre identifiant de candidat et votre code d’inscription.",
  "Les résultats ne sont visibles que lorsque l’administration les publie.",
  "En cas de difficulté, contactez l’administrateur au 93797173."
 ]:session?[
  "N’utilisez que les rubriques affichées dans votre menu : elles correspondent aux autorisations accordées à votre compte.",
  "Les comptes du personnel sont limités aux données et, le cas échéant, à l’usine qui leur est attribuée.",
  "Consultez le tableau de bord pour les informations accessibles à votre rôle.",
  "Avant toute modification, vérifiez l’identité du candidat et les données concernées.",
  "Utilisez les fonctions d’impression ou d’export uniquement dans le cadre de vos responsabilités.",
  ...(mainAdmin?["Dans Paramètres, gérez les comptes, les rôles, les autorisations, les usines et les périodes d’inscription.","Attribuez à chaque utilisateur uniquement les autorisations nécessaires et protégez les mots de passe.","Effectuez régulièrement une sauvegarde des données."]:[]),
  ...(session.role==="Chef Quart"||session.role==="Chef Usine"?["La signature et le cachet ne sont accessibles que si l’administrateur vous a autorisé cette fonction."]:[]),
  "Ne partagez pas vos identifiants. Déconnectez-vous après utilisation.",
  "Pour une autorisation manquante ou un problème, contactez l’administrateur au 93797173."
 ]:[
  "Administration : accès réservé aux personnes disposant du mot de passe d’accès approprié.",
  "Candidat : permet aux candidats de se connecter à leur compte.",
  "Création compte : permet de créer un compte candidat selon les règles en vigueur.",
  "Identifiant ou mot de passe oublié : suivez les indications à l’écran ou contactez l’administrateur.",
  "Le personnel se connecte avec les accès qui lui ont été attribués et ne voit que les rubriques autorisées.",
  "Pour obtenir de l’aide, contactez l’administrateur au 93797173."
 ];
 const permittedHtml=allowed.length?`<h2>Rubriques accessibles à ce compte</h2><ul>${allowed.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:"";
 const guideFlow=isCandidate?`<h2>Parcours illustré du candidat</h2><div class="flow"><div class="step"><b>1. Connexion</b><p>Identifiant + mot de passe</p></div><div class="arrow">↓</div><div class="step"><b>2. Inscription</b><p>Choisir NOUVEAU ou ANCIEN</p></div><div class="arrow">↓</div><div class="step"><b>3. Formulaire</b><p>Remplir les champs et joindre les documents exigés</p></div><div class="arrow">↓</div><div class="step"><b>4. Vérification</b><p>Cliquer « Suivant — vérifier les informations » puis relire</p></div><div class="arrow">↓</div><div class="step"><b>5. Validation</b><p>Cliquer « Enregistrer », puis conserver l’identifiant affiché</p></div></div><p class="notice">Pour un ancien candidat : joindre obligatoirement le NIF, le dernier bulletin de paie en PDF et au moins un document coché avec son fichier correspondant.</p>`:session?`<h2>Parcours illustré de cet accès</h2><div class="flow"><div class="step"><b>1. Connexion</b><p>Ouvrir une session avec vos identifiants</p></div><div class="arrow">↓</div><div class="step"><b>2. Menu autorisé</b><p>Cliquer sur une rubrique affichée dans le menu</p></div><div class="arrow">↓</div><div class="step"><b>3. Travail</b><p>Consulter ou traiter uniquement les dossiers autorisés pour votre rôle et votre usine</p></div><div class="arrow">↓</div><div class="step"><b>4. Fin de session</b><p>Vérifier les actions, puis se déconnecter</p></div></div>`:`<h2>Parcours illustré depuis l’accueil</h2><div class="flow"><div class="step"><b>Accueil</b><p>Choisir Administration, Candidat ou Création compte</p></div><div class="arrow">↓</div><div class="step"><b>Accès / compte</b><p>Saisir les identifiants ou compléter la création de compte</p></div><div class="arrow">↓</div><div class="step"><b>Espace personnel</b><p>Suivre les rubriques autorisées et les instructions à l’écran</p></div><div class="arrow">↓</div><div class="step"><b>Terminer</b><p>Enregistrer les opérations et se déconnecter</p></div></div>`;
 const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Guide d’utilisation NSCT</title><style>@page{size:A4;margin:16mm}body{font:13px Arial,sans-serif;color:#17212b;line-height:1.45}h1{text-align:center;font-size:22px;color:#14532d}h2{font-size:16px;color:#14532d;border-bottom:1px solid #bbb;padding-bottom:4px;margin-top:22px}.meta{padding:12px;background:#f1f5f9;border-radius:6px}li{margin:7px 0}.foot{margin-top:30px;border-top:1px solid #aaa;padding-top:10px;font-size:12px}.notice{background:#fff7ed;padding:10px;border-left:4px solid #c2410c}.flow{display:block;margin:12px 0}.step{border:2px solid #198754;border-radius:8px;padding:8px 12px;margin:0 auto;max-width:440px;background:#f0fdf4}.step p{margin:3px 0}.arrow{text-align:center;font-size:26px;font-weight:bold;color:#198754;line-height:1.2}</style></head><body><h1>INSCRIPTION NSCT SAISONNIER</h1><p style="text-align:center"><b>Guide d’utilisation de la plateforme</b></p><div class="meta"><b>Compte :</b> ${esc(userName)}<br><b>Rôle :</b> ${esc(role)}<br><b>Usine :</b> ${esc(session?.usine||"Selon le compte / non applicable")}<br><b>Généré le :</b> ${esc(new Date().toLocaleString("fr-FR"))}</div><h2>Autorisations de ce compte</h2><p>${esc(permsText)}</p>${permittedHtml}<h2>Étapes d’utilisation</h2><ol>${tips.map(x=>`<li>${esc(x)}</li>`).join("")}</ol>${guideFlow}<h2>Règles de sécurité</h2><ul><li>Ne communiquez jamais votre mot de passe à une autre personne.</li><li>Ne consultez, ne modifiez et n’exportez que les informations nécessaires à votre mission.</li><li>Les informations enregistrées dans cette version hors connexion sont stockées dans le navigateur de l’appareil utilisé.</li><li>Une impression PDF s’ouvrira : choisissez « Enregistrer au format PDF » dans la fenêtre d’impression pour télécharger votre guide.</li></ul><p class="notice"><b>Contact administrateur :</b> 93797173</p><div class="foot">Document d’aide généré par la plateforme INSCRIPTION NSCT SAISONNIER. Ce guide décrit les fonctions selon le rôle et les autorisations du compte au moment de sa génération.</div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`;
 const w=window.open("","_blank");
 if(!w){alert("Autorisez les fenêtres pop-up pour générer le guide PDF, puis réessayez.");return;}
 w.document.open();w.document.write(html);w.document.close();
}

function renderNav(){let nav=$("navZone");let items=NAV.filter(([p])=>{if(session?.role==="Postulant"){
   if(p==="inscription")return periodState()!=="CLOSED";
   if(p==="validation"||p==="resultats")return resultsConsultationAvailable();
   return false;
  }return can(p)});nav.innerHTML=items.map(([p,l])=>`<button onclick="showPage('${p}')"><span class="navLabel">${l}</span></button>`).join("")+`<div class="adminContact"><b>Contact administrateur</b><br><a href="tel:93797173">93797173</a><br><button type="button" class="secondary guideButton" onclick="downloadUserGuide()">Guide d’utilisation (PDF)</button></div>`}

function denied(c){c.innerHTML='<div class="panel"><h2>Accès refusé</h2><p>Votre compte n’est pas autorisé à consulter cette partie.</p></div>'}
function candidateLocked(c,title,perm){ return false; }

function dashboard(c){
 if(!can("dashboard"))return denied(c);
 let scoped=visibleRegistrations(),n=scoped.filter(x=>x.type==="Nouveau").length,a=scoped.filter(x=>x.type==="Ancien").length;
 let securityNotice=isMainAdmin()&&db.users.some(u=>u.isMainAdmin&&u.id==="ADMIN001"&&u.pwd==="admin123")?`<div class="locked"><b>Sécurité :</b> l’identifiant et le mot de passe administrateur par défaut sont encore actifs. Modifiez-les dans Paramètres avant d’utiliser le système avec de vrais candidats.</div>`:"";
 c.innerHTML=`<h2>Tableau de bord</h2>${securityNotice}<div class="countdown"><strong>Fin des inscriptions</strong><span data-countdown>${esc(countdownText())}</span></div><div class="grid"><div class="stat">Nouveaux<b>${n}</b></div><div class="stat">Anciens<b>${a}</b></div><div class="stat">Total<b>${n+a}</b></div><div class="stat">Retenus<b>${scoped.filter(x=>x.status==="RETENU").length}</b></div><div class="stat">En attente<b>${scoped.filter(x=>x.status==="EN ATTENTE").length}</b></div></div>
 ${isMainAdmin()?`<div class="panel"><div class="topline"><h3>Activités de connexion</h3><button class="danger" onclick="clearActivities()">Supprimer les activités</button></div><div class="tablewrap dashboardActivityWrap"><table><tr><th>Date</th><th>Utilisateur</th><th>Action</th></tr>${db.activities.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.user)}</td><td>${esc(x.action)}</td></tr>`).join("")}</table></div></div>`:""}`
}
function statistiques(c){
 if(!can("statistiques") && !can("dashboard") && session?.role!=="Postulant")return denied(c);
 if(session?.role==="Postulant")return denied(c);
 const scoped=visibleRegistrations(); const total=scoped.length, nouv=scoped.filter(r=>r.type==="Nouveau").length, anc=scoped.filter(r=>r.type==="Ancien").length;
 const retenus=scoped.filter(r=>r.status==="RETENU").length, attente=scoped.filter(r=>r.status==="EN ATTENTE").length, refuses=scoped.filter(r=>r.status==="REFUSÉ").length;
 const pct=n=>total?Math.round(n/total*100):0;
 const bars=[['Nouveaux',nouv],['Anciens',anc],['Retenus',retenus],['En attente',attente],['Refusés',refuses]];
 const max=Math.max(1,...bars.map(x=>x[1]));
 const days=[]; for(let i=6;i>=0;i--){let d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);let key=d.toISOString().slice(0,10);days.push([key,scoped.filter(r=>String(r.date||'').slice(0,10)===key).length]);}
 c.innerHTML=`<div class="topline"><h2>Statistiques générales</h2><button onclick="printStatistics()">Imprimer les statistiques</button></div>
 <div class="grid statsCards"><div class="stat"><span>Total candidatures</span><b>${total}</b></div><div class="stat"><span>Nouveaux</span><b>${nouv}</b></div><div class="stat"><span>Anciens</span><b>${anc}</b></div><div class="stat"><span>Retenus</span><b>${retenus}</b></div><div class="stat"><span>En attente</span><b>${attente}</b></div><div class="stat"><span>Refusés</span><b>${refuses}</b></div></div>
 <div class="grid"><div class="panel"><h3>Répartition des candidatures</h3><div class="pieWrap"><div class="pie" style="--p:${total?Math.round(nouv/total*100):0}%"></div><div class="legend"><span><i class="dot d1"></i>Nouveaux : ${nouv} (${pct(nouv)}%)</span><span><i class="dot d2"></i>Anciens : ${anc} (${pct(anc)}%)</span></div></div></div>
 <div class="panel"><h3>Statut des candidatures</h3><div class="pieWrap"><div class="pie statusPie" style="--p:${total?Math.round(retenus/total*100):0}%"></div><div class="legend"><span><i class="dot d3"></i>Retenus : ${retenus}</span><span><i class="dot d4"></i>En attente : ${attente}</span><span><i class="dot d5"></i>Refusés : ${refuses}</span></div></div></div></div>
 <div class="panel"><h3>Évolution des démarches — 7 derniers jours</h3><div class="chart"><svg viewBox="0 0 700 260" preserveAspectRatio="none"><polyline fill="none" stroke="currentColor" stroke-width="4" points="${days.map((d,i)=>`${i*100+10},${240-(d[1]/Math.max(1,...days.map(x=>x[1])))*200}`).join(' ')}"></polyline>${days.map((d,i)=>`<circle cx="${i*100+10}" cy="${240-(d[1]/Math.max(1,...days.map(x=>x[1])))*200}" r="5"></circle>`).join('')}</svg><div class="chartLabels">${days.map(d=>`<span>${esc(d[0].slice(5))}<br><b>${d[1]}</b></span>`).join('')}</div></div></div>
 <div class="panel"><h3>Tableau récapitulatif</h3><div class="tablewrap"><table><tr><th>Démarche</th><th>Nombre</th><th>Pourcentage</th></tr>${bars.map(b=>`<tr><td>${b[0]}</td><td>${b[1]}</td><td>${pct(b[1])}%</td></tr>`).join('')}</table></div></div>`;
}
function printStatistics(){
 if(!can("statistiques")&&!can("dashboard"))return;
 const scoped=visibleRegistrations(); const total=scoped.length,nouv=scoped.filter(r=>r.type==="Nouveau").length,anc=scoped.filter(r=>r.type==="Ancien").length,retenus=scoped.filter(r=>r.status==="RETENU").length,attente=scoped.filter(r=>r.status==="EN ATTENTE").length,refuses=scoped.filter(r=>r.status==="REFUSÉ").length;
 const pct=n=>total?Math.round(n/total*100):0,company=esc(db.settings.companyName||"NSCT"),sub=esc(db.settings.companySubtitle||"Gestion des recrutements saisonniers");
 const w=window.open("","_blank");if(!w)return alert("Autorisez les fenêtres d'impression dans votre navigateur.");
 const rows=[['Total candidatures',total,pct(total)],['Nouveaux',nouv,pct(nouv)],['Anciens',anc,pct(anc)],['Retenus',retenus,pct(retenus)],['En attente',attente,pct(attente)],['Refusés',refuses,pct(refuses)]];
 const body=rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}%</td></tr>`).join('');
 const days=[];for(let i=6;i>=0;i--){let d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);let key=d.toISOString().slice(0,10);days.push([key,scoped.filter(r=>String(r.date||'').slice(0,10)===key).length]);}
 const max=Math.max(1,...days.map(x=>x[1]));const points=days.map((d,i)=>`${i*100+10},${220-(d[1]/max)*180}`).join(' ');
 w.document.write(`<html><head><title>Statistiques générales</title><style>@page{size:A4 portrait;margin:12mm}body{font-family:Arial,sans-serif;color:#111}.head{text-align:center;border-bottom:2px solid #111;padding-bottom:10px}.company{font-size:18px;font-weight:bold}.sub{font-size:12px}.title{font-size:16px;font-weight:bold;margin:12px 0 6px;text-transform:uppercase}.request{font-size:11px;border:1px solid #bbb;padding:6px;margin:8px 0 12px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #333;padding:6px;text-align:center;vertical-align:middle}th{text-align:center;background:#eee}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.box{border:1px solid #333;text-align:center;padding:9px}.box b{display:block;font-size:18px;margin-top:4px}.chart{border:1px solid #ccc;padding:8px;margin-top:14px}.date{text-align:right;font-size:10px;margin-top:10px}.foot{text-align:center;font-size:9px;margin-top:14px}</style></head><body><div class="head"><div class="company">${company}</div><div class="sub">${sub}</div><div class="title">Statistiques générales</div></div><div class="request">Requête : statistiques générales | Total : ${total}<br>Société concernée : ${company}</div><div class="cards">${rows.slice(0,6).map(r=>`<div class="box">${r[0]}<b>${r[1]}</b></div>`).join('')}</div><table><tr><th>Démarche</th><th>Nombre</th><th>Pourcentage</th></tr>${body}</table><div class="chart"><b>Évolution des candidatures — 7 derniers jours</b><svg viewBox="0 0 700 250" width="100%" height="250"><polyline fill="none" stroke="#16834a" stroke-width="4" points="${points}"></polyline>${days.map((d,i)=>`<circle cx="${i*100+10}" cy="${220-(d[1]/max)*180}" r="5" fill="#16834a"></circle>`).join('')}</svg></div><div class="date">Imprimé le ${esc(new Date().toLocaleString())}</div><div class="foot">Document généré par INSCRIPTION NSCT SAISONNIER</div><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
}
function inscription(c){
 if(session.role==="Postulant"&&periodState()==="CLOSED"){c.innerHTML=`<h2>Inscription</h2><div class="locked"><b>Les inscriptions sont terminées.</b><br>Le délai fixé par l'administration est arrivé à son terme. Vous ne pouvez plus soumettre de candidature. Attendez une éventuelle réouverture.</div>`;return}
 let existing=session.role==="Postulant"?mine()[0]:null;
 if(existing){c.innerHTML=`<h2>Inscription</h2><div class="panel ret"><h3>Inscription déjà enregistrée</h3><p>Votre inscription a bien été enregistrée le ${esc(existing.date||"")}.</p><p><b>Identifiant :</b> ${esc(existing.id)}</p><p>Veuillez patienter pour la validation après le test et la publication des résultats.</p></div><div class="countdown"><strong>Fin des inscriptions</strong><span data-countdown>${esc(countdownText())}</span></div>`;return}
 c.innerHTML=`<h2>Inscription</h2><div class="countdown"><strong>Fin des inscriptions</strong><span data-countdown>${esc(countdownText())}</span></div><div class="panel"><p>Choisissez le type d’inscription qui vous concerne :</p><div class="resultActions"><button type="button" id="btnNouveauCandidat" data-candidate-form="nouveau">NOUVEAU</button><button type="button" id="btnAncienCandidat" data-candidate-form="ancien">ANCIEN</button></div><div class="small">Après votre choix, le formulaire correspondant s’affichera immédiatement.</div></div><div id="formZone" class="formZone"></div>`
}

document.addEventListener("click",function(e){
 const b=e.target.closest("[data-candidate-form]");
 if(!b)return;
 e.preventDefault();
 if(b.getAttribute("data-candidate-form")==="nouveau") return newForm();
 if(b.getAttribute("data-candidate-form")==="ancien") return oldForm();
});

function newForm(){
 if(session?.role!=="Postulant") return alert("Cette inscription est réservée aux candidats.");
 if(periodState()==="CLOSED") return alert("Les inscriptions sont terminées.");
 renderCandidateForm("Nouveau",{});
}
function oldForm(){
 if(session?.role!=="Postulant") return alert("Cette inscription est réservée aux candidats.");
 if(periodState()==="CLOSED") return alert("Les inscriptions sont terminées.");
 renderCandidateForm("Ancien",{});
}
function candidateFields(type){let base=db.settings.newFields.filter(x=>x!=="Documents");["Nom","Prénoms","Téléphone","Situation matrimoniale"].forEach((x)=>{if(!base.some(k=>String(k).toLowerCase()===x.toLowerCase()))base.push(x)});if(!base.includes("Sexe"))base.splice(2,0,"Sexe");if(!base.includes("Date de naissance"))base.push("Date de naissance");if(type==="Ancien"&&!base.includes("Poste occupé lors de la dernière campagne"))base.push("Poste occupé lors de la dernière campagne");return base}
function renderCandidateForm(type,values={},docs=[],files=[],bulletin=null,nif=null){
 const prefix=type==="Nouveau"?"nf":"of",zone=$("formZone");if(!zone)return;
 const study=["Sans niveau","CEPD","BEPC","BAC1","BAC2","BT","BTS","DUT","Licence","Master","Doctorat","Autre"],sex=["Masculin","Féminin"],fields=candidateFields(type),a=db.applicants.find(x=>x.id===session.id)||{};
 window.candidateDraft={type,prefix,fields,values:{...values},docs:[...docs],files:[...files],bulletin,nif};
 const fieldHtml=fields.map((x,i)=>fieldLabel(x,i,prefix,study,sex,values[x],a)).join("");
 const docPrefix=type==="Nouveau"?"n":"o";
 const fileNames=files.map(f=>f.name||"document").join("; ");
 zone.innerHTML=`<div class="panel"><h3>Formulaire ${type.toUpperCase()} — étape 1/2</h3><p class="small">Tous les champs affichés doivent être renseignés. Les informations de votre compte (nom, prénoms et téléphone) sont verrouillées. Pour les corriger, contactez l'administrateur au 93797173.</p><div class="gridform">${plantField(prefix+"Usine",values.usine||"")}${fieldHtml}${type==="Ancien"?`<div class="full"><label>NIF — document obligatoire<input id="oldNif" type="file" required><span class="small">Importez le fichier de votre NIF avant de continuer.</span></label><p id="oldNifError" class="msg">${nif?`Fichier conservé : ${esc(nif.name)}`:"Le NIF est obligatoire."}</p></div><div class="full"><label>Dernier bulletin de paie (PDF obligatoire)<input id="oldPaySlip" type="file" accept="application/pdf,.pdf" required><span class="small">Choisissez le PDF de votre dernier bulletin de paie.</span></label><p id="oldPaySlipError" class="msg">${bulletin?`Fichier conservé : ${esc(bulletin.name)}`:"Ce document est obligatoire."}</p></div>`:""}${documentBlock(docPrefix,docs,files)}<div class="full"><button onclick="goReview('${type}')">Suivant — vérifier les informations</button></div></div></div>`;
 if(bulletin){window.candidateDraft.bulletin=bulletin;const inp=$("oldPaySlip");if(inp)inp.dataset.existingName=bulletin.name||"";}
 if(nif){window.candidateDraft.nif=nif;const inp=$("oldNif");if(inp)inp.dataset.existingName=nif.name||"";}
}
function collectCandidateDraft(type){const d=window.candidateDraft;if(!d||d.type!==type)return null;const a=db.applicants.find(x=>x.id===session.id)||{};let data={};d.fields.forEach((label,i)=>{let el=$(d.prefix+i);data[label]=el?.value?.trim()||""});data.Nom=a.nom||data.Nom;data.Prénoms=a.prenoms||data.Prénoms;data.Téléphone=a.phone||data.Téléphone;data.usine=$(d.prefix+"Usine")?.value||"";return data}
function goReview(type){
 if(periodState()==="CLOSED")return alert("Les inscriptions sont terminées.");
 let d=window.candidateDraft;if(!d||d.type!==type)return alert("Le formulaire a expiré. Veuillez le rouvrir.");
 const data=collectCandidateDraft(type),prefix=type==="Nouveau"?"n":"o";const missing=[];
 if(!data.usine)missing.push("Usine de candidature");d.fields.forEach(k=>{if(!String(data[k]||"").trim())missing.push(k)});
 const checked=[...document.querySelectorAll(`input[name="${prefix}Doc"]:checked`)].map(x=>x.value);const fileInput=$(prefix+"DocFiles"),newFiles=[...(fileInput?.files||[])];const previousFiles=new Map((d.docs||[]).map((name,i)=>[name,d.files?.[i]]));const selectedFiles=newFiles.length?newFiles:checked.map(name=>previousFiles.get(name)).filter(Boolean);
 const oldInput=$("oldPaySlip"),oldFile=oldInput?.files?.[0]||d.bulletin||null;
 const nifInput=$("oldNif"),nifFile=nifInput?.files?.[0]||d.nif||null;
 if(type==="Ancien"&&!nifFile)missing.push("NIF obligatoire (importez le fichier)");
 if(type==="Ancien"&&(!oldFile||(!((oldFile.type==="application/pdf")||/\.pdf$/i.test(oldFile.name||"")))))missing.push("Dernier bulletin de paie au format PDF");
 if(checked.length!==selectedFiles.length && selectedFiles.length>0)missing.push(`Documents : ${checked.length} type(s) coché(s), mais ${selectedFiles.length} fichier(s) choisi(s)`);
 if(checked.length>0&&selectedFiles.length!==checked.length)missing.push("Un fichier doit être choisi pour chaque document coché");
 if(checked.length===0)missing.push("Document à fournir : cochez et importez au moins un document obligatoire");
 if(checked.length===0&&selectedFiles.length>0)missing.push("Cochez les types correspondant aux fichiers joints");
 if(missing.length){alert("Veuillez corriger les éléments suivants avant de continuer :\n• "+[...new Set(missing)].join("\n• "));return}
 d.values=data;d.docs=checked;d.files=selectedFiles;d.bulletin=oldFile;d.nif=nifFile;
 const reviewRows=d.fields.map(k=>`<tr><th>${esc(k)}</th><td>${esc(data[k]||"—")}</td></tr>`).join("");
 const docRows=checked.map((name,i)=>`<tr><th>${esc(name)}</th><td>${esc(selectedFiles[i]?.name||"Fichier non trouvé")}</td></tr>`).join("");
 $("formZone").innerHTML=`<div class="panel"><h3>Vérification des informations — étape 2/2</h3><p>Relisez attentivement. Cette page est en lecture seule.</p><div class="tablewrap"><table class="reviewTable"><tr><th>Usine de candidature</th><td>${esc(data.usine)}</td></tr>${reviewRows}${docRows}${type==="Ancien"?`<tr><th>NIF</th><td>${esc(nifFile?.name||"")}</td></tr><tr><th>Dernier bulletin de paie</th><td>${esc(oldFile?.name||"")}</td></tr>`:""}</table></div><div class="resultActions"><button class="secondary" onclick="editCandidateDraft()">Modifier les informations</button><button onclick="finalizeCandidate('${type}')">Enregistrer le ${type.toUpperCase()}</button></div></div>`;
}
function editCandidateDraft(){const d=window.candidateDraft;if(!d)return;renderCandidateForm(d.type,d.values,d.docs,d.files,d.bulletin,d.nif)}
async function finalizeCandidate(type){const d=window.candidateDraft;if(!d||d.type!==type)return alert("Aucun formulaire à enregistrer.");try{let files=[];for(let f of d.files)files.push(await fileToData(f));let data={...d.values};if(type==="Ancien"&&d.bulletin)data["Dernier bulletin de paie"]=await fileToData(d.bulletin);if(type==="Ancien"&&d.nif)data["NIF"]=await fileToData(d.nif);createReg(type,data,d.docs,files)}catch(e){alert("Impossible de lire un document. Vérifiez les fichiers et recommencez.")}}
function plantField(id,value=""){return `<label class="full">Usine de candidature <select id="${id}" required><option value="">Sélectionner l’usine</option>${(db.settings.usines||[]).map(u=>`<option value="${esc(u)}" ${value===u?"selected":""}>${esc(u)}</option>`).join("")}</select></label>`}
function fieldLabel(label,i,prefix,study,sex,value="",account={}){
 let id=prefix+i,n=String(label||'').trim(),v=value;
 if(/^nom$/i.test(n)){v=account.nom||v;return `<label>${esc(n)}<input id="${id}" type="text" value="${esc(v)}" readonly required class="lockedField" title="Information issue du compte candidat, non modifiable"></label>`}
 if(/^prénoms?$/i.test(n)){v=account.prenoms||v;return `<label>${esc(n)}<input id="${id}" type="text" value="${esc(v)}" readonly required class="lockedField" title="Information issue du compte candidat, non modifiable"></label>`}
 if(/^téléphone$/i.test(n)){v=account.phone||v;return `<label>${esc(n)}<input id="${id}" type="tel" value="${esc(v)}" readonly required class="lockedField" title="Information issue du compte candidat, non modifiable"></label>`}
 if(n.toLowerCase()==="situation matrimoniale")return `<label>${esc(n)}<select id="${id}" required><option value="">Sélectionner</option>${["Célibataire","Marié(e)","Divorcé(e)","Veuf / Veuve","Union libre"].map(x=>`<option value="${esc(x)}" ${v===x?"selected":""}>${esc(x)}</option>`).join("")}</select></label>`;
 if(n==='Sexe') return `<label>${esc(n)}<select id="${id}" required><option value="">Sélectionner</option>${sex.map(x=>`<option value="${esc(x)}" ${v===x?"selected":""}>${esc(x)}</option>`).join('')}</select></label>`;
 if(n==='Date de naissance') return `<label>${esc(n)}<input id="${id}" type="date" value="${esc(v)}" required></label>`;
 if(n==="Niveau d’étude"||n==="Niveau d'étude") return `<label>${esc(n)}<select id="${id}" required><option value="">Sélectionner</option>${study.map(x=>`<option value="${esc(x)}" ${v===x?"selected":""}>${esc(x)}</option>`).join('')}</select></label>`;
 if(/^lieu de dépôt$/i.test(n)) return `<label>${esc(n)} — région et ville<select id="${id}" required><option value="">Sélectionner la ville de dépôt</option>${depositPlaces(value)}</select></label>`;
 if(/email|courriel/i.test(n)) return `<label>${esc(n)}<input id="${id}" type="email" value="${esc(v)}" required></label>`;
 return `<label>${esc(n)}<input id="${id}" type="text" value="${esc(v)}" required></label>`;
}
function depositPlaces(selected=""){
 const places={
  'Région Maritime':['Lomé','Tsévié','Aného','Tabligbo','Vogan','Afagnan','Kévé','Aklakou'],
  'Région des Plateaux':['Atakpamé','Kpalimé','Notsè','Badou','Amlamé','Kpélé-Élé','Agou-Gadzépé','Danyi'],
  'Région Centrale':['Sokodé','Tchamba','Sotouboua','Blitta','Adjengré','Kpangalam'],
  'Région de la Kara':['Kara','Niamtougou','Bafilo','Bassar','Kétao','Guérin-Kouka','Pagouda','Kandé'],
  'Région des Savanes':['Dapaong','Mango','Cinkassé','Tandjouaré','Borgou','Gando','Kantindi']
 };
 return Object.entries(places).map(([region,villes])=>`<optgroup label="${esc(region)}">${villes.map(v=>`<option value="${esc(region+' — '+v)}" ${selected===region+' — '+v?'selected':''}>${esc(v)}</option>`).join('')}</optgroup>`).join('');
}
function documentBlock(prefix,selected=[],existingFiles=[]){
 const common=['Carte nationale d’identité','Acte de naissance','Diplôme / attestation','Certificat de nationalité','Photo d’identité'];
 return `<div class="full panel docBlock"><h4>Documents à fournir</h4><p class="small">Cochez les documents que vous souhaitez joindre, puis choisissez exactement un fichier par type coché. Vous pouvez joindre plusieurs documents.</p><div class="checkgrid">${common.map(d=>`<label><input type="checkbox" name="${prefix}Doc" value="${esc(d)}" ${selected.includes(d)?"checked":""}> ${esc(d)}</label>`).join('')}</div><label class="full">Fichiers des documents <input id="${prefix}DocFiles" type="file" multiple></label>${existingFiles.length?`<p class="small">Fichiers précédemment sélectionnés : ${esc(existingFiles.map(f=>f.name||"document").join(", "))}. Pour les remplacer, sélectionnez à nouveau les fichiers.</p>`:""}</div>`;
}
function fileToData(file){if(file&&file.type&&file.type.startsWith("image/"))return imageToData(file);return new Promise((resolve,reject)=>{let r=new FileReader();r.onload=()=>resolve({name:file.name,type:file.type,size:file.size,data:r.result});r.onerror=reject;r.readAsDataURL(file)})}
function imageToData(file){return new Promise((resolve,reject)=>{if(!file||!file.type.startsWith("image/"))return reject(new Error("Image invalide"));let r=new FileReader();r.onload=()=>{let img=new Image();img.onload=()=>{let max=1600,w=img.width,h=img.height;if(w>max||h>max){let ratio=Math.min(max/w,max/h);w=Math.round(w*ratio);h=Math.round(h*ratio)}let canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;canvas.getContext("2d").drawImage(img,0,0,w,h);let data=canvas.toDataURL("image/jpeg",0.82);resolve({name:file.name,type:"image/jpeg",size:data.length,data})};img.onerror=reject;img.src=r.result};r.onerror=reject;r.readAsDataURL(file)})}

function createReg(type,data,docs,files=[]){
 let aid=session.id;if(session.role==="Postulant"&&!db.applicants.some(x=>x.id===aid))return;
 if(session.role==="Postulant"&&periodState()==="CLOSED")return alert("Les inscriptions sont terminées.");
 if(!data.usine)return alert("Aucune usine de candidature n’a été sélectionnée.");
 if(session.role==="Postulant"){
   const other=mine()[0];
   if(other){
     if(other.usine!==data.usine)return alert(`Vous avez déjà candidaté dans l’usine « ${other.usine} ». Un même compte candidat ne peut pas postuler dans une autre usine.`);
     return alert("Votre inscription est déjà enregistrée. Vous devez attendre la validation après le test et la publication des résultats.");
   }
 }
 db.registrationSeq=(db.registrationSeq||1000)+1;let rid="NSCT"+new Date().getFullYear()+String(db.registrationSeq).padStart(5,"0");
 if(data&&typeof data==="object"){for(const [k,v] of Object.entries(data)){if(/^nom$/i.test(k))data[k]=normalizeSurname(v);else if(/^prénoms?$/i.test(k))data[k]=normalizeGivenNames(v)}}
 db.registrations.push({id:rid,account:aid,usine:data.usine,type,data,docs,files,status:"EN ATTENTE",team:"",date:new Date().toLocaleString(),analysis:{score:0,missing:[],ready:false},refusalReason:"",candidateMessage:"Inscription validée. Veuillez patienter pendant la validation après le test et la publication des résultats."});
 if(!save()){db.registrations.pop();db.registrationSeq--;return;}
 if(session.role==="Postulant"){
   window.candidateDraft=null;let c=$("content");
   c.innerHTML=`<h2>Inscription</h2><div class="panel ret"><h3>Inscription reçue avec succès</h3><p>Votre inscription a bien été enregistrée et reçue par le système.</p><p><b>Identifiant d'inscription :</b> ${esc(rid)}</p><p>Veuillez patienter et espérer la suite de la procédure. Vous pourrez consulter votre décision lorsque l'administration publiera les résultats.</p><div class="countdown"><strong>Fin des inscriptions</strong><span data-countdown>${esc(countdownText())}</span></div></div><p class="small no-print">Besoin de corriger les informations de votre compte ? Contactez l’administrateur : <a href="tel:93797173">93797173</a>.</p>`;
   renderNav();
 }else{alert("Inscription enregistrée. Identifiant : "+rid);showPage("listes")}
}

function postulants(c){
 if(!can("postulants"))return denied(c);
 c.innerHTML=`<h2>Identifiants des postulants</h2><div class="panel"><button onclick="printApplicants()">Imprimer</button><div class="tablewrap"><table><tr><th>Identifiant</th><th>Nom</th><th>Prénoms</th><th>Téléphone</th><th>Mot de passe</th><th>Date</th><th>Accès</th><th>Action</th></tr>${visibleApplicants().map(x=>`<tr><td>${esc(x.id)}</td><td>${esc(x.nom)}</td><td>${esc(x.prenoms)}</td><td>${esc(x.phone)}</td><td>${esc(x.pwd)}</td><td>${esc(x.created)}</td><td><button onclick="manageCandidate('${esc(x.id)}')">Consulter</button></td><td><button class="danger" onclick="deleteApplicant('${esc(x.id)}')">Supprimer</button></td></tr>`).join("")}</table></div></div><div id="candidatePerms"></div>`
}
function manageCandidate(id){
 let a=visibleApplicants().find(x=>x.id===id);if(!a)return;
 $("candidatePerms").innerHTML=`<div class="panel"><h3>Accès candidat — ${esc(a.nom)} ${esc(a.prenoms)} (${esc(a.id)})</h3><p><b>Inscription :</b> automatique tant que la période d'inscription est ouverte.</p><p><b>Validation après le test et Résultats :</b> apparaissent pour tous les candidats uniquement après la clôture, à la date programmée, lorsque l'administrateur a autorisé la consultation.</p></div>`;
}

function saveCandidatePerms(id){return;}

function deleteApplicant(id){if(!isMainAdmin())return alert("Seul l’administrateur principal peut supprimer un compte candidat.");let a=db.applicants.find(x=>x.id===id);if(!a)return;if(!confirm(`Supprimer définitivement le compte ${a.id} et ses candidatures ?`))return;db.applicants=db.applicants.filter(x=>x.id!==id);db.registrations=db.registrations.filter(x=>x.account!==id);save();log("Suppression candidat "+id);postulants($("content"))}
function mine(){return db.registrations.filter(r=>r.account===session.id)}
function listes(c){if(session.role==="Postulant")return resultats(c);if(!can("listes")&&!can("postulant_check"))return denied(c);c.innerHTML=`<h2>Liste des postulants</h2><div class="panel"><label>Identifiant d'inscription<input id="searchRid" placeholder="Ex : NSCT20261001"></label><button onclick="searchReg()">Rechercher</button><div id="searchResult"></div></div><div class="grid"><div class="panel"><div class="topline"><h3>Nouveaux</h3><button onclick="printListType('Nouveau')">Imprimer cette liste</button><button class="secondary" onclick="exportListType('Nouveau')">Exporter</button></div>${tableRegs("Nouveau")}</div><div class="panel"><div class="topline"><h3>Anciens</h3><button onclick="printListType('Ancien')">Imprimer cette liste</button><button class="secondary" onclick="exportListType('Ancien')">Exporter</button></div>${tableRegs("Ancien")}</div></div><div class="panel"><button onclick="printAllLists()">Imprimer toutes les listes</button><button class="secondary" onclick="exportAllLists()">Exporter toutes les listes</button></div>`}
function tableRegs(type){let arr=visibleRegistrations().filter(x=>x.type===type);return `<div class="tablewrap"><table><tr><th>ID</th><th>Nom</th><th>Prénoms</th><th>Statut</th></tr>${arr.map(x=>`<tr><td>${esc(x.id)}</td><td>${esc(x.data.Nom)}</td><td>${esc(x.data.Prénoms)}</td><td>${esc(x.status)}</td></tr>`).join("")}</table></div>`}
function searchReg(){let q=$("searchRid").value.trim().toUpperCase(),r=registrationByIdVisible(q);$("searchResult").innerHTML=r?`<p><b>${esc(r.id)}</b> — ${esc(r.data.Nom)} ${esc(r.data.Prénoms)} — ${esc(r.type)} — ${esc(r.status)} <button onclick="printSingleReg('${esc(r.id)}')">Imprimer</button></p>`:"<p class='msg'>Aucun dossier trouvé.</p>"}
function printListType(type){let rows=visibleRegistrations().filter(r=>r.type===type);printReport(`Liste des postulants — ${type}`,rows,[['ID','id'],['Nom','data.Nom'],['Prénoms','data.Prénoms'],['Statut','status'],['Date','date']],`Requête : liste ${type.toLowerCase()} | Total : ${rows.length}`)}
function printAllLists(){printReport('Liste complète des postulants',visibleRegistrations(),[['ID','id'],['Nom','data.Nom'],['Prénoms','data.Prénoms'],['Type','type'],['Statut','status'],['Date','date']],`Requête : toutes les listes | Total : ${visibleRegistrations().length}`)}
function printSingleReg(id){let r=registrationByIdVisible(id);if(r)printReport('Dossier de candidature',[r],[['ID','id'],['Nom','data.Nom'],['Prénoms','data.Prénoms'],['Type','type'],['Statut','status'],['Équipe','team'],['Date','date']],`Requête : dossier ${id}`)}
function printApplicants(){printReport('Liste des identifiants des postulants',visibleApplicants(),[['Identifiant','id'],['Nom','nom'],['Prénoms','prenoms'],['Téléphone','phone'],['Mot de passe','pwd'],['Date','created']],`Requête : identifiants des postulants | Total : ${visibleApplicants().length}`)}
function analysisState(score){if(score<=54)return "i";if(score<=80)return "moyen";if(score<=90)return "fort";return "complet"}
function analyser(c){if(!can("analyser"))return denied(c);let rows=visibleRegistrations().map(r=>{let z=r.analysis;return `<tr><td>${esc(r.id)}</td><td>${esc(r.data.Nom)} ${esc(r.data.Prénoms)}</td><td>${r.type}</td><td>${z&&Number.isFinite(z.score)?z.score+"%":"—"}</td><td>${z?esc(analysisState(z.score)):"Non analysé"}</td><td>${z?(z.missing?.length?esc(z.missing.join(", ")):"Aucune"):"—"}</td><td><button onclick="runAnalysis('${esc(r.id)}')">Analyser</button></td></tr>`}).join("");c.innerHTML=`<h2>Analyser les inscriptions</h2><div class="panel"><p>Les pourcentages et états sont calculés uniquement après une action d’analyse.</p><button onclick="analyzeAll()">Analyser tous les dossiers</button><div class="tablewrap"><table><tr><th>ID</th><th>Nom</th><th>Type</th><th>Complétude</th><th>État</th><th>Manquant</th><th>Action</th></tr>${rows}</table></div></div>`}
function analyzeRegistration(r){let required=r.type==="Nouveau"?db.settings.newFields.filter(x=>x!=="Documents"):[...db.settings.newFields.filter(x=>x!=="Documents"),"Poste occupé lors de la dernière campagne"],missing=required.filter(k=>!String(r.data[k]||"").trim());if(r.type==="Ancien"&&!r.data?.["Dernier bulletin de paie"])missing.push("Dernier bulletin de paie (PDF)");if(r.type==="Ancien"&&!r.data?.["NIF"])missing.push("NIF");let total=required.length+(r.type==="Ancien"?2:0),score=Math.max(0,Math.min(100,Math.round(((total-missing.length)/total)*100)));r.analysis={score,missing,ready:missing.length===0,state:analysisState(score),analyzedAt:new Date().toISOString()};return r.analysis}
function runAnalysis(id){if(!can("analyser"))return alert("Vous n’êtes pas autorisé à analyser les dossiers.");let r=registrationByIdVisible(id);if(r){analyzeRegistration(r);save();analyser($("content"))}}
function analyzeAll(){if(!can("analyser"))return alert("Vous n’êtes pas autorisé à analyser les dossiers.");visibleRegistrations().forEach(analyzeRegistration);save();analyser($("content"))}
function validation(c){
 if(session?.role==="Postulant"){
   if(!resultsConsultationAvailable())return denied(c);
   const r=mine()[0]; if(!r)return denied(c);
   const z=r.analysis||{score:0,missing:[]};
   c.innerHTML=`<h2>Validation après le test</h2><div class="panel"><h3>Votre dossier</h3><p><b>Identifiant :</b> ${esc(r.id)}</p><p><b>Usine :</b> ${esc(r.usine||r.data?.usine||"-")}</p><p><b>Type :</b> ${esc(r.type)}</p><p><b>Complétude du dossier :</b> ${z.ready?"Complet":"Incomplet"}</p><p><b>Éléments manquants :</b> ${z.missing?.length?esc(z.missing.join(", ")):"Aucun"}</p><p><b>Évaluation :</b> ${esc(String(z.score??0))}%</p><p><b>Décision :</b> ${esc(r.status)}</p>${r.refusalReason?`<div class="locked"><b>Motif de la décision :</b><br>${esc(r.refusalReason)}</div>`:`<p class="ok">Votre dossier a été examiné. Consultez l’onglet Résultats pour connaître la décision publiée.</p>`}</div>`;
   return;
 }
 if(!can("validation"))return denied(c);let arr=visibleRegistrations().filter(r=>!r.validatedAt && (r.status||"EN ATTENTE")==="EN ATTENTE");c.innerHTML='<h2>Validation après le test</h2><div class="panel"><div class="tablewrap"><table><tr><th>ID</th><th>Nom</th><th>Type</th><th>Score</th><th>Statut</th><th>Action</th></tr>'+arr.map(r=>'<tr><td>'+esc(r.id)+'</td><td>'+esc(r.data.Nom)+' '+esc(r.data.Prénoms)+'</td><td>'+esc(r.type)+'</td><td>'+r.analysis.score+'%</td><td>'+esc(r.status)+'</td><td><button class="success" onclick="setStatus(\''+esc(r.id)+'\',\'RETENU\')">RETENU</button><button class="warning" onclick="setStatus(\''+esc(r.id)+'\',\'EN ATTENTE\')">EN ATTENTE</button><button class="danger" onclick="refuseReg(\''+esc(r.id)+'\')">REFUSÉ</button></td></tr>').join('')+'</table></div></div>'
}
function refuseReg(id){let motif=prompt("Motif du refus :");if(!motif?.trim())return;let r=registrationByIdVisible(id);if(r){r.status="REFUSÉ";r.refusalReason=motif.trim();r.validatedAt=new Date().toLocaleString();save();log("Refus "+id);validation($("content"))}}
function setStatus(id,status){let r=registrationByIdVisible(id);if(r){r.status=status;if(status!=="EN ATTENTE")r.validatedAt=new Date().toLocaleString();else delete r.validatedAt;save();log("Validation après test : "+id+" → "+status);validation($("content"))}}
function resultats(c){
 if(session?.role==="Postulant"){
   if(!resultsConsultationAvailable())return denied(c);
   const r=mine()[0]; if(!r)return denied(c);
   const decisionMessage=r.status==="RETENU"?`Félicitations ! Vous êtes RETENU. Veuillez vous présenter à votre usine le ${esc(db.settings.retainedDateTime||"date et heure à confirmer par l’administration")} pour les activités suivantes : ${esc(db.settings.retainedActivities||"activités à préciser par l’administration")}.`:r.status==="EN ATTENTE"?"Vous êtes retenu sur la liste d’attente. Veuillez patienter ; l’administration vous contactera pour un éventuel contrat en cas de démission.":"Nous vous remercions pour votre participation. Votre candidature n’a pas été retenue cette fois-ci. Nous vous encourageons à poursuivre vos démarches et vous souhaitons plein succès pour vos prochaines candidatures.";
   c.innerHTML=`<h2>Résultats</h2><div class="panel" id="candidateResultPrintable"><h3>Votre résultat</h3><p><b>Identifiant :</b> ${esc(r.id)}</p><p><b>Usine :</b> ${esc(r.usine||r.data?.usine||"-")}</p><p><b>Type :</b> ${esc(r.type)}</p><p><b>Décision :</b> <strong>${esc(r.status||"EN ATTENTE")}</strong></p><div class="candidateDecisionMessage">${decisionMessage}</div><div class="no-print resultActions"><button onclick="printCandidateResult()">Imprimer mon résultat</button><button class="secondary" onclick="printCandidateResult()">Télécharger en PDF</button></div></div>`;
   return;
 }
 if(!can("resultats"))return denied(c);let rows=visibleRegistrations().map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(r.data.Nom)} ${esc(r.data.Prénoms)}</td><td>${esc(r.type)}</td><td>${esc(r.status)}</td><td>${esc(r.team||"-")}</td><td>${r.status==="RETENU"?`<select onchange="assignTeam('${esc(r.id)}',this.value)"><option value="">Choisir</option>${(db.settings.teams||[]).filter(t=>!db.settings.teamFactories[t]||db.settings.teamFactories[t]===r.usine).map(t=>`<option value="${esc(t)}" ${r.team===t?"selected":""}>${esc(t)}${db.settings.teamFactories[t]?` — ${esc(db.settings.teamFactories[t])}`:""}</option>`).join("")}</select>`:"-"}</td></tr>`).join("");c.innerHTML=`<h2>Résultats</h2><div class="panel"><div class="resultActions"><button onclick="printStatus('RETENU')">Imprimer RETENUS</button><button onclick="printStatus('EN ATTENTE')">Imprimer EN ATTENTE</button><button class="danger" onclick="printStatus('REFUSÉ')">Imprimer REFUSÉS</button><button class="secondary" onclick="exportStatus('RETENU')">Excel RETENUS</button><button class="secondary" onclick="exportStatus('EN ATTENTE')">Excel EN ATTENTE</button><button class="secondary" onclick="exportStatus('REFUSÉ')">Excel REFUSÉS</button></div><div class="tablewrap"><table><tr><th>ID</th><th>Nom</th><th>Type</th><th>Statut</th><th>Équipe</th><th>Affectation</th></tr>${rows}</table></div></div>`
}
function assignTeam(id,t){let r=registrationByIdVisible(id);if(r){r.team=t;save();log("Affectation "+id+" → "+t)}}
function printStatus(cat){let rows=visibleRegistrations().filter(r=>r.status===cat);printReport(`Résultats — ${cat}`,rows,[['ID','id'],['Nom','data.Nom'],['Prénoms','data.Prénoms'],['Type','type'],['Statut','status'],['Équipe','team']],`Requête : résultats ${cat.toLowerCase()} | Total : ${rows.length}`)}
function exportExcel(filename,rows,columns){
 let head=columns.map(c=>`<th>${esc(c[0])}</th>`).join("");
 let body=rows.map(r=>`<tr>${columns.map(c=>`<td>${esc(c[1].split('.').reduce((o,k)=>o?.[k],r)??"")}</td>`).join("")}</tr>`).join("");
 let html=`<html><head><meta charset="UTF-8"></head><body><table border="1"><tr>${head}</tr>${body}</table></body></html>`;
 let blob=new Blob(["\ufeff"+html],{type:"application/vnd.ms-excel"}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename.endsWith('.xls')?filename:filename+'.xls';a.click();URL.revokeObjectURL(url);
}
function exportListType(type){let rows=visibleRegistrations().filter(r=>r.type===type);exportExcel(`LISTE_${type.toUpperCase()}.xls`,rows,[['ID','id'],['Nom','data.Nom'],['Prénoms','data.Prénoms'],['Statut','status'],['Date','date']])}
function saveUsines(){
 if(!isMainAdmin())return alert("Seul l’administrateur principal peut enregistrer les usines.");
 const vals=[...new Set((($('usines')?.value||'').split(',').map(x=>x.trim()).filter(Boolean)))];
 if(!vals.length)return alert("Ajoutez au moins une usine.");
 db.settings.usines=vals;
 db.users.forEach(u=>{if(u.usine!=="TOUTES"&&!vals.includes(u.usine))u.usine="";});
 Object.keys(db.settings.teamFactories||{}).forEach(t=>{if(!vals.includes(db.settings.teamFactories[t]))delete db.settings.teamFactories[t];});
 save();alert("Les usines ont été enregistrées.");parametres($('content'));
}
function saveTeams(){
 if(!isMainAdmin())return alert("Seul l’administrateur principal peut enregistrer les équipes.");
 const rows=[...document.querySelectorAll('.teamConfigRow')];
 const teams=[];const map={};
 rows.forEach(row=>{const name=row.querySelector('.teamName')?.value.trim();const usine=row.querySelector('.teamUsine')?.value||'';if(name){teams.push(name);if(usine)map[name]=usine;}});
 const newName=$('newTeamName')?.value.trim();const newUsine=$('newTeamUsine')?.value||'';
 if(newName){if(teams.includes(newName))return alert("Cette équipe existe déjà.");teams.push(newName);if(newUsine)map[newName]=newUsine;}
 if(!teams.length)return alert("Ajoutez au moins une équipe.");
 const missing=teams.filter(t=>!map[t]);if(missing.length)return alert("Chaque équipe doit être rattachée à une usine : "+missing.join(', '));
 db.settings.teams=teams;db.settings.teamFactories=map;
 db.users.forEach(u=>{if(u.team&&!teams.includes(u.team))u.team='';});
 save();alert("Les équipes et leurs usines ont été enregistrées.");parametres($('content'));
}

function exportAllLists(){exportExcel('LISTE_POSTULANTS_COMPLETE.xls',visibleRegistrations(),[['ID','id'],['Nom','data.Nom'],['Prénoms','data.Prénoms'],['Type','type'],['Statut','status'],['Date','date']])}
function exportStatus(cat){let rows=visibleRegistrations().filter(r=>r.status===cat);exportExcel(`RESULTATS_${cat.replace(/\s+/g,'_')}.xls`,rows,[['ID','id'],['Nom','data.Nom'],['Prénoms','data.Prénoms'],['Type','type'],['Statut','status'],['Équipe','team']])}
function printReport(title,rows,columns,request){let w=window.open("","_blank");if(!w)return alert("Autorisez les fenêtres d'impression dans votre navigateur.");let company=esc(db.settings.companyName||"NSCT"),sub=esc(db.settings.companySubtitle||"Gestion des recrutements saisonniers"),logo=db.settings.companyLogo||"";let logoHtml=logo?`<img src="${logo}" class="printLogo">`:'';let head=columns.map(c=>`<th>${esc(c[0])}</th>`).join('');let body=rows.map(r=>`<tr>${columns.map(c=>`<td>${esc(c[1].split('.').reduce((o,k)=>o?.[k],r)??'-')}</td>`).join('')}</tr>`).join('');w.document.write(`<html><head><title>${esc(title)}</title><style>@page{size:A4 portrait;margin:12mm}body{font-family:Arial,sans-serif;color:#111;margin:0}.head{text-align:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:12px}.printLogo{width:70px;height:70px;object-fit:contain;display:block;margin:0 auto 6px}.company{font-size:18px;font-weight:bold}.sub{font-size:12px}.title{font-size:16px;font-weight:bold;margin:12px 0 6px;text-transform:uppercase}.request{font-size:11px;text-align:left;border:1px solid #bbb;padding:6px;margin:8px 0 12px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #333;padding:5px;text-align:center;vertical-align:middle}th{text-align:center;background:#eee}.foot{margin-top:16px;font-size:10px;text-align:center}.date{text-align:right;font-size:10px;margin-top:10px}@media print{button{display:none}}</style></head><body><div class="head">${logoHtml}<div class="company">${company}</div><div class="sub">${sub}</div><div class="title">${esc(title)}</div></div><div class="request">${esc(request)}<br>Société concernée : ${company}</div><table><tr>${head}</tr>${body}</table><div class="date">Imprimé le ${esc(new Date().toLocaleString())}</div><div class="foot">Document généré par INSCRIPTION NSCT SAISONNIER</div><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}
function signaturePage(c){if(!can("signature"))return denied(c);if(session.role==="Administrateur"){c.innerHTML=`<h2>Signature et cachet</h2><div class="panel"><b>Accès administrateur — consultation uniquement.</b><p>L'administrateur principal ne signe pas ici. Il autorise les signataires et le cachet dans Paramètres.</p><p>Signataires autorisés : ${(db.settings.signatureAuthorized||[]).map(id=>{let u=db.users.find(x=>x.id===id);return u?esc(u.nom+" "+u.prenoms):id}).join(", ")||"Aucun"}</p></div>`;return}if(!["Chef Quart","Chef Usine"].includes(session.role)||!(db.settings.signatureAuthorized||[]).includes(session.id))return denied(c);c.innerHTML=`<h2>Signature et cachet</h2><div class="panel"><p class="ok">Vous êtes autorisé à signer.</p><label>Nom du signataire<input id="sigName" value="${esc(session.nom+' '+session.prenoms)}"></label><p><b>Signez dans le cadre ci-dessous avec la souris ou le doigt :</b></p><canvas id="signatureCanvas" width="900" height="240" style="width:100%;height:180px;border:2px solid #456;background:#fff;border-radius:8px;touch-action:none;display:block"></canvas><button type="button" class="secondary" onclick="clearSignatureCanvas()">Effacer la signature</button><label>Ou saisir une signature textuelle<textarea id="sigText" rows="2" placeholder="Nom / signature textuelle (facultatif)"></textarea></label><button onclick="saveSignature()">Enregistrer la signature</button></div>`;initSignatureCanvas()}
let signatureDrawing=false,signatureHasInk=false;
function initSignatureCanvas(){const canvas=$("signatureCanvas");if(!canvas)return;const ctx=canvas.getContext("2d");ctx.strokeStyle="#111";ctx.lineWidth=3;ctx.lineCap="round";ctx.lineJoin="round";const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}};canvas.onpointerdown=e=>{e.preventDefault();signatureDrawing=true;canvas.setPointerCapture?.(e.pointerId);const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y)};canvas.onpointermove=e=>{if(!signatureDrawing)return;e.preventDefault();const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();signatureHasInk=true};const end=()=>{signatureDrawing=false};canvas.onpointerup=end;canvas.onpointercancel=end;canvas.onpointerleave=e=>{if(e.buttons===0)end()}}
function clearSignatureCanvas(){const c=$("signatureCanvas");if(c)c.getContext("2d").clearRect(0,0,c.width,c.height);signatureHasInk=false}
function saveSignature(){if(!session||!(["Chef Quart","Chef Usine"].includes(session.role))||!(db.settings.signatureAuthorized||[]).includes(session.id))return alert("Vous n’êtes pas autorisé à signer.");const canvas=$("signatureCanvas"),textSig=$("sigText")?.value.trim()||"";const drawing=canvas&&signatureHasInk?canvas.toDataURL("image/png"):"";if(!drawing&&!textSig)return alert("Veuillez dessiner votre signature ou saisir une signature textuelle.");db.settings.signatures=db.settings.signatures||{};db.settings.signatures[session.id]={name:$("sigName").value.trim(),signature:textSig,drawing,date:new Date().toLocaleString()};save();alert("Signature enregistrée.")}
function chefquart(c){
 if(!can("chefquart"))return denied(c);
 if(session.role==="Administrateur"){
   const teams=db.settings.teams||[];
   const blocks=teams.map(team=>{
     const usine=db.settings.teamFactories[team]||"Usine non définie";
     const rows=visibleRegistrations().filter(r=>r.team===team&&r.status==="RETENU"&&r.usine===usine);
     return `<div class="panel adminReadonly"><div class="topline"><b>${esc(team)}</b><span class="small">Usine : ${esc(usine)}</span><div class="resultActions"><button type="button" onclick="printAdminChefQuart('${esc(team)}')">Imprimer</button><button type="button" class="secondary" onclick="exportAdminChefQuartExcel('${esc(team)}')">Excel</button></div></div><div class="tablewrap"><table><tr><th>ID</th><th>Nom</th><th>Prénoms</th><th>Type</th><th>Usine</th><th>Poste</th></tr>${rows.map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(r.data.Nom)}</td><td>${esc(r.data.Prénoms)}</td><td>${esc(r.type)}</td><td>${esc(r.usine)}</td><td>${esc(r.chefPoste||"")}</td></tr>`).join("")||'<tr><td colspan="6">Aucun postulant retenu pour cette équipe.</td></tr>'}</table></div><p class="small muted">Lecture seule : données limitées à l’usine affiliée à cette équipe.</p></div>`;
   }).join('');
   c.innerHTML=`<h2>Espace Chef Quart — Administration</h2><div class="panel"><b>Accès administrateur principal uniquement</b><p>Toutes les équipes sont regroupées par usine. Vous pouvez consulter, imprimer et exporter chaque équipe.</p></div>${blocks||'<div class="locked">Aucune équipe enregistrée.</div>'}`;return;
 }
 let team=session.team||"";let usine=session.usine||"";
 if(!team)return c.innerHTML=`<h2>Espace Chef Quart</h2><div class="locked">Aucune équipe n’est associée à votre compte. L’administrateur doit vous attribuer une équipe dans Paramètres.</div>`;
 const teamUsine=db.settings.teamFactories[team]||"";
 if(teamUsine && usine!==teamUsine)return denied(c);
 const rows=visibleRegistrations().filter(r=>r.team===team&&r.status==="RETENU"&&r.usine===usine);
 c.innerHTML=`<h2>Espace Chef Quart</h2><div class="panel"><div class="topline"><b>Équipe : ${esc(team)}</b><span class="small">Usine : ${esc(usine)}</span><button type="button" onclick="printChefQuart()">Imprimer ma liste</button><button type="button" onclick="exportChefQuartExcel()">Exporter Excel</button></div><div class="tablewrap"><table><tr><th>ID</th><th>Nom</th><th>Prénoms</th><th>Type</th><th>Poste</th></tr>${rows.map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(r.data.Nom)}</td><td>${esc(r.data.Prénoms)}</td><td>${esc(r.type)}</td><td><input value="${esc(r.chefPoste||"")}" onchange="saveChefPoste('${esc(r.id)}',this.value)"></td></tr>`).join("")||'<tr><td colspan="5">Aucun postulant retenu pour votre équipe.</td></tr>'}</table></div></div>`;
}
function printAdminChefQuart(team){if(!isMainAdmin())return;let usine=db.settings.teamFactories[team]||"";let rows=visibleRegistrations().filter(r=>r.team===team&&r.status==="RETENU"&&(!usine||r.usine===usine));printReport(`Liste Chef Quart — ${team}`,rows,[['ID','id'],['Nom','data.Nom'],['Prénoms','data.Prénoms'],['Type','type'],['Poste','chefPoste']],`Requête : données Chef Quart ${team} | Total : ${rows.length}`)}
function exportAdminChefQuartExcel(team){if(!isMainAdmin())return;let usine=db.settings.teamFactories[team]||"";let rows=visibleRegistrations().filter(r=>r.team===team&&r.status==="RETENU"&&(!usine||r.usine===usine));exportExcel(`CHEF_QUART_${team}.xls`,rows,[['ID','id'],['Nom','data.Nom'],['Prénoms','data.Prénoms'],['Type','type'],['Poste','chefPoste']])}
function saveChefPoste(id,value){let r=registrationByIdVisible(id);if(!r||r.team!==session.team)return;r.chefPoste=value.trim();save()}
function printChefQuart(){if(!can("chefquart"))return;let team=session.team||"",rows=visibleRegistrations().filter(r=>r.team===team&&r.status==="RETENU");printRows(`Liste Chef Quart — ${team}`,rows.map(r=>[r.id,r.data.Nom||"",r.data.Prénoms||"",r.type,r.chefPoste||""]),["ID","Nom","Prénoms","Type","Poste"])}
function exportChefQuartExcel(){if(!can("chefquart"))return;let team=session.team||"",rows=visibleRegistrations().filter(r=>r.team===team&&r.status==="RETENU");exportExcel(`CHEF_QUART_${team}.xls`,rows,[["ID","id"],["Nom","data.Nom"],["Prénoms","data.Prénoms"],["Type","type"],["Poste","chefPoste"]])}
function tableTeam(t){let a=visibleRegistrations().filter(r=>r.team===t&&r.status==="RETENU");return `<table><tr><th>ID</th><th>Nom</th><th>Prénoms</th><th>Type</th><th>Poste</th></tr>${a.map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(r.data.Nom)}</td><td>${esc(r.data.Prénoms)}</td><td>${esc(r.type)}</td><td>${esc(r.chefPoste||"")}</td></tr>`).join("")}</table>`}
function cheffab(c){if(!can("cheffab"))return denied(c);c.innerHTML=`<h2>Espace Chef Usine</h2><div class="panel">${tableTeam(db.settings.teams[0])}</div>`}
function printRows(title,rows,headers){let company=db.settings.companyName||"NSCT";let w=window.open("","_blank");if(!w)return;w.document.write(`<html><head><title>${esc(title)}</title><style>body{font-family:Arial;margin:18mm}h1,h2,p{text-align:center}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #333;padding:6px;font-size:11px;text-align:center;vertical-align:middle}th{background:#eee;text-align:center}.meta{text-align:center}</style></head><body><h1>${esc(company)}</h1><h2>${esc(title)}</h2><p class="meta">Requête : ${esc(title)} — Imprimé le ${esc(new Date().toLocaleString())}</p><table><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr>${rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</table><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}
const PERMS=[['dashboard','Tableau de bord'],['statistiques','Statistiques générales'],['inscription','Inscription'],['postulants','Identifiants postulants'],['listes','Liste des postulants'],['analyser','Analyser'],['validation','Validation après le test'],['resultats','Résultats'],['chefquart','Espace chef quart'],['cheffab','Espace chef usine'],['signature','Signature et cachet'],['parametres','Paramètres'],['postulant_check','Recherche inscription'],['postulant_result','Voir résultats']];
function clearActivities(){if(!isMainAdmin())return alert("Seul l’administrateur principal peut voir ou supprimer les activités de connexion.");db.activities=[];save();dashboard($('content'))}
function section(title,id,body,open=true){return `<div class="panel"><div class="sectionTitle" onclick="toggleSection('${id}')"><b>▸ ${title}</b></div><div id="${id}" class="sectionBody ${open?'':'hidden'}">${body}</div></div>`}
function clearUserForm(){['uid','upwd','unom','upr','uphone','uteam','uusine'].forEach(id=>{let e=$(id);if(e)e.value=''});document.querySelectorAll('input[name="perm"]').forEach(x=>x.checked=false);}
function saveAdminAccount(){
 if(!session?.isMainAdmin)return alert('Seul l’administrateur principal peut modifier ces informations.');
 const a=db.users.find(u=>u.isMainAdmin); if(!a)return alert('Administrateur principal introuvable.');
 const id=$('adminId').value.trim(),pwd=$('adminPwd').value;
 if(!id)return alert('L’identifiant est obligatoire.');
 if(db.users.some(u=>u!==a&&u.id===id))return alert('Cet identifiant est déjà utilisé.');
 a.id=id;if(pwd)a.pwd=pwd;
 const nom=normalizeSurname($('adminNom').value),pr=normalizeGivenNames($('adminPrenoms').value);if(nom)a.nom=nom;if(pr)a.prenoms=pr;
 db.settings.adminProfile={nom:a.nom,prenoms:a.prenoms};save();session=a;
 $('sessionBox').innerHTML=`<div class="sessionUser"><span><b>Administrateur</b> — ${esc(a.nom)} ${esc(a.prenoms)}</span><button class="danger sessionLogout" onclick="logout()">Déconnexion</button></div>`;fitSessionBar();
 alert('Identifiants administrateur modifiés avec succès.');parametres($('content'));
}
function saveUser(){
 if(!session?.isMainAdmin)return alert('Seul l’administrateur principal peut gérer les utilisateurs.');
 const id=$('uid').value.trim(),pwd=$('upwd').value,nom=normalizeSurname($('unom').value),pr=normalizeGivenNames($('upr').value),phone=normalizePhone($('uphone')?.value||''),role=$('urole').value,team=$('uteam').value.trim(),usine=$('uusine').value;
 if(!usine)return alert('Sélectionnez la section d’usine à laquelle cet accès doit être rattaché.');
 if(!db.settings.usines.includes(usine))return alert('L’usine sélectionnée n’est pas enregistrée dans Paramètres. Enregistrez d’abord les usines.');
 if(role==='Chef Quart' && team){const tu=db.settings.teamFactories[team]||"";if(!tu)return alert("Cette équipe n’est rattachée à aucune usine.");if(usine!==tu)return alert(`L’équipe ${team} appartient à l’usine ${tu}. Sélectionnez cette même usine pour le Chef Quart.`);}
 if(!id||!nom||!pr||!role)return alert('Identifiant, nom, prénoms et rôle sont obligatoires.');
 let u=db.users.find(x=>x.id===id&&!x.isMainAdmin);
 if(!u){if(db.users.some(x=>x.id===id))return alert('Cet identifiant existe déjà.');if(!pwd)return alert('Le mot de passe est obligatoire pour un nouvel utilisateur.');u={id,pwd,nom,prenoms:pr,phone,role,active:true,perms:[]};db.users.push(u)}
 else {if(pwd)u.pwd=pwd;u.nom=nom;u.prenoms=pr;u.phone=phone;u.role=role;}
 u.phone=phone;u.team=team;u.usine=usine;u.perms=[...document.querySelectorAll('input[name="perm"]:checked')].map(x=>x.value);if(role==='Administrateur')u.perms=['all'];
 save();alert('Utilisateur enregistré.');parametres($('content'));clearUserForm();
}
function editUser(id){let u=db.users.find(x=>x.id===id);if(!u)return;parametres($('content'));setTimeout(()=>{['uid','unom','upr','uphone','uteam'].forEach((k,i)=>{let e=$(k);if(e)e.value=[u.id,u.nom,u.prenoms,u.phone||'',u.team||''][i]});$('upwd').value='';$('urole').value=u.role;$('uusine').value=(u.usine||'');document.querySelectorAll('input[name="perm"]').forEach(x=>x.checked=(u.perms||[]).includes('all')||(u.perms||[]).includes(x.value));},0)}
function printStaffAccess(id){if(!isMainAdmin())return alert('Seul l’administrateur principal peut imprimer les fiches d’accès.');const u=db.users.find(x=>x.id===id&&!x.isMainAdmin);if(!u)return;const w=window.open('','_blank');if(!w)return alert('Autorisez les fenêtres d’impression dans votre navigateur.');w.document.write(`<html><head><meta charset="UTF-8"><title>Fiche d’accès du personnel</title><style>body{font-family:Arial,sans-serif;color:#111;padding:28px}.card{max-width:650px;margin:auto;border:1px solid #555;padding:24px}h2{text-align:center}dt{font-weight:bold;margin-top:16px}dd{margin:5px 0;padding:10px;background:#f2f2f2;font-size:18px;overflow-wrap:anywhere}.note{margin-top:22px;font-size:12px}</style></head><body><div class="card"><h2>INSCRIPTION NSCT SAISONNIER</h2><h3>Fiche d’accès du personnel</h3><p>Nom : <b>${esc(u.nom)} ${esc(u.prenoms)}</b></p><p>Rôle : ${esc(u.role)}</p><p>Usine : ${esc(u.usine||'')}</p><p>Téléphone : ${esc(u.phone||'Non renseigné')}</p><dl><dt>Identifiant</dt><dd>${esc(u.id)}</dd><dt>Mot de passe initial / actuel</dt><dd>${esc(u.pwd||'Non disponible')}</dd></dl><p class="note">Document confidentiel à remettre uniquement à la personne concernée. Changez le mot de passe après remise si nécessaire. Aucun SMS n’est envoyé par ce logiciel.</p></div><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}
function toggleUser(id){let u=db.users.find(x=>x.id===id);if(!u||u.isMainAdmin)return;u.active=u.active===false;save();alert(u.active?'Utilisateur activé.':'Utilisateur désactivé.');parametres($('content'))}
function deleteUser(id){let u=db.users.find(x=>x.id===id);if(!u||u.isMainAdmin)return;if(!confirm(`Supprimer définitivement ${u.nom} ${u.prenoms} ?`))return;db.users=db.users.filter(x=>x.id!==id);save();alert('Utilisateur supprimé définitivement.');parametres($('content'))}
function saveFields(){
 if(!isMainAdmin())return alert("Seul l’administrateur principal peut modifier les champs du formulaire.");
 const raw=$("fields")?.value||"";
 let fields=[...new Set(raw.split(/\r?\n|;/).map(x=>x.trim()).filter(Boolean))];
 if(!fields.length)return alert("Saisissez au moins un champ.");
 const required=["Nom","Prénoms","Sexe","Date de naissance","Téléphone"];
 required.forEach(x=>{if(!fields.some(y=>y.toLocaleLowerCase("fr")==x.toLocaleLowerCase("fr")))fields.push(x)});
 if(fields.some(x=>x.length>80))return alert("Chaque nom de champ doit contenir au maximum 80 caractères.");
 db.settings.newFields=fields;
 if(!save())return;
 alert("Champs enregistrés. Les champs obligatoires (Nom, Prénoms, Sexe, Date de naissance et Téléphone) ont été conservés automatiquement.");
 parametres($("content"));
}
function importTemplate(){
 if(!isMainAdmin())return alert("Seul l’administrateur principal peut importer un modèle.");
 const file=$("templateFile")?.files?.[0];
 if(!file)return alert("Sélectionnez un fichier CSV ou TXT.");
 if(!/\.(csv|txt)$/i.test(file.name))return alert("Format non pris en charge. Utilisez un fichier CSV ou TXT.");
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const content=String(reader.result||"").replace(/^\uFEFF/,"");
   let fields=[];
   if(/\.csv$/i.test(file.name)){
    const first=(content.split(/\r?\n/).find(x=>x.trim())||"");
    let delim=[";",",","\t"].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
    fields=first.split(delim).map(x=>x.trim().replace(/^"|"$/g,"").replace(/""/g,'"'));
   }else fields=content.split(/\r?\n/).map(x=>x.trim());
   fields=[...new Set(fields.map(x=>x.trim()).filter(Boolean))];
   if(!fields.length)throw new Error("Aucun nom de champ n’a été trouvé dans le fichier.");
   if(fields.length>60)throw new Error("Le fichier contient plus de 60 champs. Réduisez la liste avant l’importation.");
   if(fields.some(x=>x.length>80))throw new Error("Un nom de champ dépasse 80 caractères.");
   const required=["Nom","Prénoms","Sexe","Date de naissance","Téléphone"];
   required.forEach(x=>{if(!fields.some(y=>y.toLocaleLowerCase("fr")==x.toLocaleLowerCase("fr")))fields.push(x)});
   const old=db.settings.newFields;
   db.settings.newFields=fields;
   db.settings.importedTemplate={name:file.name,date:new Date().toLocaleString(),fields:fields.length};
   if(!save()){db.settings.newFields=old;return;}
   alert(`Importation terminée : ${fields.length} champs enregistrés. Vérifiez la liste avant de l’utiliser.`);
   parametres($("content"));
  }catch(e){alert("Importation impossible : "+e.message)}
 };
 reader.onerror=()=>alert("Impossible de lire le fichier sélectionné.");
 reader.readAsText(file,"UTF-8");
}

function parametres(c){
 if(!can('parametres'))return denied(c);let ap=db.settings.adminProfile||{nom:'',prenoms:''};
 const groupedUsers=(db.settings.usines||[]).map(plant=>({plant,users:db.users.filter(u=>!u.isMainAdmin&&u.usine===plant)})).filter(g=>g.users.length);const unassignedUsers=db.users.filter(u=>!u.isMainAdmin&&(!u.usine||u.usine==='TOUTES'||!(db.settings.usines||[]).includes(u.usine)));const mainAdmins=db.users.filter(u=>u.isMainAdmin);const userRows=users=>users.map(u=>`<tr><td>${esc(u.id)}</td><td>${esc(u.nom)} ${esc(u.prenoms)}</td><td>${esc(u.phone||'')}</td><td>${esc(u.role)}</td><td>${esc(u.team||'')}</td><td>${esc(u.usine||'')}</td><td>${u.active!==false?'Actif':'Désactivé'}</td><td><div class="userActionsGrid"><button title="Modifier cet utilisateur" onclick="editUser('${esc(u.id)}')">Modifier</button>${!u.isMainAdmin?`<button class="secondary" title="Imprimer la fiche d’accès" onclick="printStaffAccess('${esc(u.id)}')">Fiche</button><button class="warning" title="Activer ou désactiver cet utilisateur" onclick="toggleUser('${esc(u.id)}')">${u.active!==false?'Désactiver':'Activer'}</button><button class="danger" title="Supprimer définitivement cet utilisateur" onclick="deleteUser('${esc(u.id)}')">Supprimer</button>`:''}</div></td></tr>`).join('');const usersTable=users=>`<div class="tablewrap usersAuthorizedWrap"><table class="usersAuthorizedTable"><tr><th>ID</th><th>Nom</th><th>Téléphone</th><th>Rôle</th><th>Équipe</th><th>Usine</th><th>État</th><th>Actions</th></tr>${userRows(users)||'<tr><td colspan="8">Aucun accès enregistré dans cette section d’usine.</td></tr>'}</table></div>`;let usersByPlantHtml=groupedUsers.map(g=>`<div class="panel factoryUsersSection"><h4>Section d’usine : ${esc(g.plant)}</h4><p class="small">${g.users.length} accès enregistré(s) dans cette usine.</p>${usersTable(g.users)}</div>`).join('');let usersBody=`<h3>Administrateur principal</h3><div class="gridform"><label>Nom<input id="adminNom" value="${esc(ap.nom)}"></label><label>Prénoms<input id="adminPrenoms" value="${esc(ap.prenoms)}"></label><label>Identifiant administrateur<input id="adminId" value="${esc(db.users.find(u=>u.isMainAdmin)?.id||"ADMIN001")}"></label><label>Nouveau mot de passe<input id="adminPwd" type="password" placeholder="Laisser vide pour conserver"></label></div><button onclick="saveAdminAccount()">Modifier mes identifiants</button><hr><h3>Créer / modifier un utilisateur</h3><p class="small">Fonctionnement hors connexion : aucun SMS n’est envoyé. Le téléphone est conservé comme contact. Pour remettre les accès au personnel, utilisez le bouton « Fiche d’accès » dans la liste, puis imprimez la fiche en privé.</p><div class="gridform"><input id="uid" placeholder="Identifiant"><input id="upwd" placeholder="Mot de passe (laisser vide pour conserver)"><input id="unom" placeholder="Nom"><input id="upr" placeholder="Prénoms"><input id="uphone" type="tel" placeholder="Téléphone du personnel (facultatif)"><select id="urole">${db.settings.roles.map(r=>`<option>${esc(r)}</option>`).join('')}</select><select id="uteam"><option value="">Équipe pour Chef Quart</option>${(db.settings.teams||[]).map(t=>`<option value="${esc(t)}">${esc(t)}${db.settings.teamFactories[t]?` — ${esc(db.settings.teamFactories[t])}`:""}</option>`).join("")}</select><select id="uusine" required><option value="">Usine obligatoire — section concernée</option>${db.settings.usines.map(t=>`<option>${esc(t)}</option>`).join("")}</select></div><h4>Autorisations</h4><div class="checkgrid">${PERMS.map(p=>`<label><input type="checkbox" name="perm" value="${p[0]}"> ${p[1]}</label>`).join('')}</div><button onclick="saveUser()">Enregistrer</button><button class="secondary" onclick="clearUserForm()">Nouveau</button><hr><h3>Utilisateurs autorisés — classés par section d’usine</h3><p class="small">Chaque nouvel accès est enregistré dans la section correspondant à l’usine choisie lors de sa création. Pour déplacer un compte, cliquez sur « Modifier » puis sélectionnez une autre usine.</p>${mainAdmins.length?`<div class="panel factoryUsersSection"><h4>Administration principale</h4>${usersTable(mainAdmins)}</div>`:''}${usersByPlantHtml||'<p class="small">Aucun utilisateur du personnel n’a encore été enregistré dans une section d’usine.</p>'}${unassignedUsers.length?`<div class="panel factoryUsersSection"><h4>À vérifier — usine non définie ou inconnue</h4><p class="small">Modifiez ces comptes et attribuez-leur une usine valide pour les ranger dans la bonne section.</p>${usersTable(unassignedUsers)}</div>`:''}<p class="small">Désactivé = compte conservé mais connexion interdite. Supprimé = accès et compte retirés définitivement ; l'administrateur devra recréer l'utilisateur.</p>`;
 let gateBody=`<h3>Mots de passe d’accès avant la page d’accueil</h3><p class="small">Ces codes contrôlent quel menu d’accueil s’affiche après l’écran de bienvenue. Attribuez un code différent à chaque groupe. Ils sont enregistrés dans le navigateur de cette version hors ligne.</p><div class="gridform"><label>Mot de passe Administrateur<input id="entryAdminPwd" type="password" value="${esc((db.settings.entryPasswords||{}).admin||"")}" placeholder="Mot de passe administrateur"></label><label>Mot de passe Personnel<input id="entryStaffPwd" type="password" value="${esc((db.settings.entryPasswords||{}).staff||"")}" placeholder="Mot de passe personnel"></label><label>Mot de passe Candidat<input id="entryCandidatePwd" type="password" value="${esc((db.settings.entryPasswords||{}).candidate||"")}" placeholder="Mot de passe candidat"></label></div><button onclick="saveEntryPasswords()">Enregistrer les mots de passe d’accès</button><p class="small"><b>Important :</b> cette protection est locale et ne remplace pas une authentification sécurisée en ligne. Avec GitHub Pages seul, ces codes et les données ne sont pas partagés entre les appareils.</p>`;
 let roleBody=`<h3>Rôles disponibles</h3><input id="roles" value="${esc(db.settings.roles.join(', '))}"><button onclick="saveRoles()">Enregistrer les rôles</button><p class="small">Les rôles enregistrés alimentent automatiquement la liste déroulante de création d'utilisateur.</p>`;
 let brandBody=`<h3>Identité visuelle</h3><label>Nom de la société<input id="companyName" value="${esc(db.settings.companyName)}"></label><label>Sous-titre / service<input id="companySubtitle" value="${esc(db.settings.companySubtitle)}"></label><label>Logo de la société<input id="companyLogoFile" type="file" accept="image/*"></label><label>Photos de la page d'accueil (plusieurs fichiers)<input id="homePhotoFiles" type="file" accept="image/*" multiple></label><button onclick="saveBranding()">Enregistrer les images et informations</button>${db.settings.companyLogo?`<p><img class="previewImg" src="${db.settings.companyLogo}"></p>`:''}<div class="grid">${(db.settings.homePhotos||[]).map(x=>`<img class="previewHome" src="${x}">`).join('')}</div>`;
 let templateBody=`<h3>Formulaire NOUVEAU — champs</h3><textarea id="fields" rows="8">${db.settings.newFields.join('\n')}</textarea><button onclick="saveFields()">Enregistrer les champs</button><h4>Importer une liste de champs (CSV ou TXT)</h4><input id="templateFile" type="file" accept=".csv,.txt,text/csv,text/plain"><button onclick="importTemplate()">Importer et mettre à jour</button><p class="small">Pour garantir une lecture correcte hors connexion, l’importation accepte les fichiers CSV ou TXT. Dans un CSV, les champs doivent être sur la première ligne ; dans un TXT, mettez un champ par ligne. Les fichiers Excel, Word et PDF ne sont pas lus directement par cette version.</p>${db.settings.importedTemplate?`<p class="ok">Modèle actuel : ${esc(db.settings.importedTemplate.name)} — ${esc(db.settings.importedTemplate.date)}</p>`:''}`;
 let periodBody=`<h3>Période des inscriptions</h3><label>Début<input id="startAt" type="datetime-local" value="${esc(db.settings.startAt)}"></label><label>Fin<input id="endAt" type="datetime-local" value="${esc(db.settings.endAt)}"></label><button onclick="savePeriod()">Enregistrer la période</button>${db.settings.registrationStopped?`<button class="success" onclick="reopenRegistration()">Réouvrir les inscriptions</button>`:`<button class="danger" onclick="manualStopRegistration()">Arrêter les inscriptions maintenant</button>`}<div class="countdown"><strong>Fin des inscriptions</strong><span data-countdown>${esc(countdownText())}</span></div><div class="locked">${db.settings.registrationStopped?`Inscriptions bloquées : ${esc(db.settings.registrationStopReason||'arrêt demandé')}. Aucun candidat ne peut soumettre de candidature.`:'Les inscriptions se bloqueront automatiquement à la date et heure de fin.'}</div>`;
 let sigBody=`${isMainAdmin()?`<h3>Convocation des candidats retenus</h3><label>Date et heure de présentation à l’usine<input id="retainedDateTime" type="datetime-local" value="${esc(db.settings.retainedDateTime||"")}"></label><label>Activités à mener<textarea id="retainedActivities" rows="3" placeholder="Préciser les activités demandées">${esc(db.settings.retainedActivities||"")}</textarea></label><button onclick="saveRetainedSchedule()">Enregistrer la convocation</button><hr>`:""}<h3>Autorisation Signature et cachet</h3><p>Autoriser cette fonction uniquement aux Chef Quart / Chef Usine sélectionnés.</p><div class="checkgrid">${db.users.filter(u=>['Chef Quart','Chef Usine'].includes(u.role)).map(u=>`<label><input type="checkbox" class="sigAuth" value="${esc(u.id)}" ${(db.settings.signatureAuthorized||[]).includes(u.id)?'checked':''}> ${esc(u.role)} — ${esc(u.nom)} ${esc(u.prenoms)}</label>`).join('')||'<p>Aucun Chef Quart ou Chef Usine créé.</p>'}</div><button onclick="saveSignatureAuthorizations()">Enregistrer les autorisations</button><hr><h3>Publication des résultats aux candidats</h3><label>Date et heure de disponibilité des résultats<input id="resultsAt" type="datetime-local" value="${esc(db.settings.resultsAt||"")}"></label><label><input type="checkbox" id="resultsPublic" ${db.settings.resultsPublic?'checked':''}> Autoriser la consultation des résultats par les candidats</label><button onclick="saveResultsPublic()">Enregistrer la publication des résultats</button>`;
 let photoRows=(db.settings.welcomePhotos||[]).map((v,i)=>welcomePhotoAdminRow(v,i)).join("");
 let videoBody=isMainAdmin()?`<h3>Photos des activités en usine</h3><p class="small">Ajoutez une photo et indiquez le titre de l’activité qu’elle présente (ex. : Réception du coton, tri, pesage, mise en balle, sécurité). Les photos défileront automatiquement sur l’écran de bienvenue. Elles sont enregistrées dans le navigateur ; utilisez des photos légères pour éviter de saturer le stockage.</p><div id="welcomePhotoAdminRows">${photoRows}</div><button type="button" class="secondary" onclick="addWelcomePhotoRow()">+ Ajouter une photo</button> <button type="button" onclick="saveWelcomePhotos()">Enregistrer les photos et titres</button>`:`<p>Seul l’administrateur principal peut gérer les photos de présentation.</p>`;
 let themeBody=`<h3>Apparence du système</h3><label>Thème à utiliser<select id="systemTheme"><option value="clair" ${db.settings.theme==="clair"?"selected":""}>Clair (classique)</option><option value="sombre" ${db.settings.theme==="sombre"?"selected":""}>Sombre</option><option value="vert" ${db.settings.theme==="vert"?"selected":""}>Vert NSCT</option><option value="bleu" ${db.settings.theme==="bleu"?"selected":""}>Bleu professionnel</option></select></label><button onclick="saveSystemTheme()">Appliquer le thème</button><p class="small">Le thème choisi s’applique à l’ensemble du logiciel sur ce navigateur.</p>`;
 let resetBody=`<h3>Sauvegarde et restauration</h3><p>Avant toute modification importante, téléchargez et conservez une copie de sauvegarde. La restauration remplace les données actuellement présentes par celles du fichier sélectionné.</p><button onclick="secureBackup()">Télécharger une sauvegarde</button><hr><label>Restaurer une sauvegarde JSON<input id="restoreFile" type="file" accept=".json,application/json"></label><button class="secondary" onclick="secureRestore()">Restaurer la sauvegarde sélectionnée</button><hr><h3>Remise à zéro</h3><p>Par défaut, la remise à zéro supprime les candidatures et les activités, mais conserve les comptes des candidats, les paramètres et le compte administrateur.</p><label class="resetCandidateAccountsOption"><input id="deleteCandidateAccounts" type="checkbox"> Supprimer également les comptes des candidats</label><p class="small">Cochez cette case uniquement si vous souhaitez effacer aussi les comptes candidats. Si elle reste décochée, les candidats pourront conserver leur compte après la remise à zéro.</p><button class="danger" onclick="secureReset()">Remettre les données de recrutement à zéro</button><hr><h3>Contrôle de santé du système</h3><button class="secondary" onclick="runSystemAudit()">Vérifier le système</button><div id="systemAuditResult" class="small"></div>`;
 c.innerHTML=`<h2>Paramètres</h2>${section('Administrateur principal et utilisateurs','secUsers',usersBody)}${section('Mots de passe d’accès','secEntryPasswords',gateBody)}${section('Rôles','secRoles',roleBody)}${section('Photo accueil et logo société','secBrand',brandBody)}${section('Formulaire nouveau — champs / importer','secForm',templateBody)}${section('Date et heure des inscriptions','secPeriod',periodBody)}${section('Signature et cachet — autorisations','secSignature',sigBody)}${section('Photos de bienvenue et activités','secWelcomePhotos',videoBody)}${section('Apparence et thèmes','secTheme',themeBody)}${section('Sauvegarde / mise à jour du système','secReset',resetBody)}${section('Usines','secPlants',`<p class="small">Enregistrez ici les usines. Elles apparaîtront ensuite dans la connexion du personnel. Chaque utilisateur reçoit son usine dans son compte.</p><input id="usines" value="${esc(db.settings.usines.join(', '))}" placeholder="Usine 1, Usine 2"><button onclick="saveUsines()">Enregistrer les usines</button>`)}${section('Équipes par usine','secTeams',`${(db.settings.teams||[]).map(t=>`<div class="gridform teamConfigRow"><input class="teamName" value="${esc(t)}" placeholder="Nom de l’équipe"><select class="teamUsine"><option value="">Choisir l’usine</option>${(db.settings.usines||[]).map(u=>`<option value="${esc(u)}" ${(db.settings.teamFactories[t]||"")===u?"selected":""}>${esc(u)}</option>`).join("")}</select></div>`).join("")}<hr><div class="gridform"><input id="newTeamName" placeholder="Nouvelle équipe"><select id="newTeamUsine"><option value="">Choisir l’usine</option>${(db.settings.usines||[]).map(u=>`<option value="${esc(u)}">${esc(u)}</option>`).join("")}</select></div><button onclick="saveTeams()">Enregistrer les équipes</button><p class="small">Chaque équipe doit être rattachée à une usine. Les Chefs Quart et les informations d’équipe sont ensuite limités à cette usine.</p>`)}`;
}
function applySystemTheme(theme){
 const allowed=["clair","sombre","vert","bleu"];const chosen=allowed.includes(theme)?theme:"clair";
 document.documentElement.dataset.theme=chosen;
 try{localStorage.setItem("NSCT_THEME",chosen)}catch(e){}
}
function saveSystemTheme(){
 if(!isMainAdmin())return alert("Seul l’administrateur principal peut modifier le thème du système.");
 const theme=$("systemTheme")?.value||"clair";db.settings.theme=theme;
 if(!save())return;applySystemTheme(theme);alert("Thème appliqué.");parametres($("content"));
}
function fitSessionBar(){
 const bar=$("sessionBox");if(!bar)return;const user=bar.querySelector(".sessionUser");if(!user)return;
 const label=user.querySelector("span");if(!label)return;
 const n=(label.textContent||"").length;const size=n>65?9:n>48?10:n>34?11:n>24?12:13;
 label.style.fontSize=size+"px";label.style.whiteSpace="nowrap";label.style.minWidth="0";label.style.overflow="hidden";label.style.textOverflow="ellipsis";
}
function toggleSection(id){$(id).classList.toggle("hidden")}
function saveResultsPublic(){
 if(!session?.isMainAdmin)return alert("Seul l'administrateur principal peut modifier cette autorisation.");
 let at=$("resultsAt")?.value||"";
 if(at && isNaN(new Date(at).getTime()))return alert("Date de disponibilité des résultats invalide.");
 db.settings.resultsAt=at;
 db.settings.resultsPublic=!!$("resultsPublic")?.checked;
 save();renderNav();parametres($("content"));
 if(db.settings.resultsPublic && at && Date.now()<new Date(at).getTime())alert("Consultation autorisée : les onglets Validation après le test et Résultats apparaîtront à la date programmée.");
 else alert(db.settings.resultsPublic?"Consultation des résultats autorisée pour les candidats.":"Consultation des résultats retirée aux candidats.");
}

function manualStopRegistration(){if(!session?.isMainAdmin)return alert("Seul l'administrateur principal peut arrêter les inscriptions manuellement.");if(!confirm("Arrêter les inscriptions maintenant ? Le compteur sera immédiatement mis à 0."))return;db.settings.registrationStopped=true;db.settings.registrationStopReason="Arrêt manuel par l’administrateur";save();startCountdown();parametres($('content'));alert("Inscriptions arrêtées. Le compteur est à 0.")}
function reopenRegistration(){if(!session?.isMainAdmin)return alert("Seul l'administrateur principal peut réouvrir les inscriptions.");db.settings.registrationStopped=false;db.settings.registrationStopReason="";save();startCountdown();parametres($('content'));alert("Les inscriptions sont réouvertes selon la période configurée.")}
function saveSignatureAuthorizations(){db.settings.signatureAuthorized=[...document.querySelectorAll('.sigAuth:checked')].map(x=>x.value);save();alert('Autorisations de signature enregistrées.');parametres($('content'))}
function savePeriod(){let s=$("startAt").value,e=$("endAt").value;if(s&&e&&new Date(e)<=new Date(s))return alert("La fin doit être après le début.");db.settings.startAt=s;db.settings.endAt=e;if(s&&e&&new Date(e)>new Date()) {db.settings.registrationStopped=false;db.settings.registrationStopReason="";}save();startCountdown();alert("Période enregistrée.");parametres($("content"))}
function saveAdminProfile(){let nom=normalizeSurname($('adminNom').value),pr=normalizeGivenNames($('adminPrenoms').value);$('adminNom').value=nom;$('adminPrenoms').value=pr;if(!nom||!pr)return alert('Nom et prénoms obligatoires.');db.settings.adminProfile={nom,prenoms:pr};let a=db.users.find(u=>u.isMainAdmin);if(a){a.nom=nom;a.prenoms=pr;}save();if(session?.id==='ADMIN001')$('sessionBox').innerHTML=`<div class="sessionUser"><span><b>Administrateur</b> — ${esc(nom)} ${esc(pr)}</span><button class="danger sessionLogout" onclick="logout()">Déconnexion</button></div>`;alert('Identité de l’administrateur enregistrée.');parametres($('content'))}
function saveRoles(){let roles=$('roles').value.split(',').map(x=>x.trim()).filter(Boolean);if(!roles.length)return alert('Au moins un rôle est nécessaire.');db.settings.roles=[...new Set(roles)];save();alert('Rôles enregistrés.');parametres($('content'))}
function saveBranding(){let logoFile=$("companyLogoFile")?.files?.[0],photos=[...($("homePhotoFiles")?.files||[])];db.settings.companyName=$("companyName").value.trim()||"NSCT";db.settings.companySubtitle=$("companySubtitle").value.trim()||"Gestion des recrutements saisonniers";let jobs=[];if(logoFile)jobs.push(imageToData(logoFile).then(x=>db.settings.companyLogo=x.data));if(photos.length)jobs.push(Promise.all(photos.map(imageToData)).then(xs=>{db.settings.homePhotos=xs.map(x=>x.data);db.settings.homePhoto=db.settings.homePhotos[0]||"";}));Promise.all(jobs).then(()=>{try{save()}catch(e){return alert("Impossible d'enregistrer les images : l'espace de stockage du navigateur est insuffisant. Réduisez la taille ou le nombre des photos.")}renderBrand();alert("Identité visuelle enregistrée et photos sauvegardées.");parametres($("content"))})}

function verifyMainAdminCredentials(){if(!session?.isMainAdmin)return false;const id=prompt("Identifiant de l’administrateur principal :");if(id===null)return false;const pwd=prompt("Mot de passe administrateur :");if(pwd===null)return false;const admin=db.users.find(u=>u.isMainAdmin);if(!admin||id!==admin.id||pwd!==admin.pwd){alert("Identifiants administrateur incorrects. Opération annulée.");return false;}return true;}
function secureBackup(){if(!verifyMainAdminCredentials())return;try{const payload={application:"INSCRIPTION NSCT SAISONNIER",version:"V28",createdAt:new Date().toISOString(),database:db};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="SAUVEGARDE_NSCT_"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);alert("Sauvegarde téléchargée. Conservez ce fichier en lieu sûr.");}catch(e){alert("Échec de la sauvegarde : "+e.message)}}

function secureRestore(){
 if(!verifyMainAdminCredentials())return;
 const file=$("restoreFile")?.files?.[0];
 if(!file)return alert("Sélectionnez d'abord un fichier de sauvegarde JSON.");
 if(!confirm("ATTENTION : la restauration remplacera les données actuelles par celles de la sauvegarde. Avez-vous sauvegardé les données actuelles ?"))return;
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const payload=JSON.parse(String(reader.result||""));
   const incoming=payload.database;
   if(payload.application!=="INSCRIPTION NSCT SAISONNIER"||!incoming||!Array.isArray(incoming.users)||!Array.isArray(incoming.applicants)||!Array.isArray(incoming.registrations)||!incoming.settings)throw new Error("Structure de sauvegarde non reconnue.");
   if(!incoming.users.some(u=>u.isMainAdmin))throw new Error("La sauvegarde ne contient aucun administrateur principal.");
   if(!confirm(`Confirmer la restauration de la sauvegarde du ${payload.createdAt||"date inconnue"} ?`))return;
   const previousDb=db;db=incoming;db.settings=db.settings||{};db.applicants=db.applicants||[];db.registrations=db.registrations||[];db.applicantSeq=Number.isFinite(db.applicantSeq)?db.applicantSeq:Math.max(1000,...db.applicants.map(a=>parseInt(String(a.id||"").replace(/^POST/,""),10)||1000));db.registrationSeq=Number.isFinite(db.registrationSeq)?db.registrationSeq:Math.max(1000,...db.registrations.map(r=>parseInt(String(r.id||"").replace(/^NSCT\d{4}/,""),10)||1000));db.settings.retainedDateTime=db.settings.retainedDateTime||"";db.settings.retainedActivities=db.settings.retainedActivities||"";db.activities=db.activities||[];db.users=db.users||[];db.seq=Number(db.seq)||1000;
   if(!save()){db=previousDb;return;}
   alert("Sauvegarde restaurée. Le logiciel va se recharger pour appliquer les données restaurées.");location.reload();
  }catch(e){alert("Restauration impossible : "+e.message)}
 };
 reader.onerror=()=>alert("Impossible de lire le fichier sélectionné.");reader.readAsText(file);
}
function runSystemAudit(){
 if(!isMainAdmin())return alert("Seul l'administrateur principal peut lancer ce contrôle.");
 const dupPhones=[];const seen=new Set();(db.applicants||[]).forEach(a=>{const ph=normalizePhone(a.phone);if(ph&&seen.has(ph))dupPhones.push(ph);if(ph)seen.add(ph)});
 const dupUserIds=[];const seenIds=new Set();(db.users||[]).concat(db.applicants||[]).forEach(u=>{const id=String(u.id||"").trim();if(id&&seenIds.has(id))dupUserIds.push(id);if(id)seenIds.add(id)});
 const noPlant=(db.registrations||[]).filter(r=>!r.usine&&!r.data?.usine).length;
 const unknownPlants=(db.registrations||[]).filter(r=>r.usine&&!db.settings.usines.includes(r.usine)).length;
 const noAccount=(db.registrations||[]).filter(r=>!r.account||(!db.applicants.some(a=>a.id===r.account)&&!db.users.some(u=>u.id===r.account))).length;
 const duplicateApplications=(db.registrations||[]).filter((r,i,arr)=>r.account&&arr.findIndex(x=>x.account===r.account) !== i).length;
 const missingApplicantInfo=(db.applicants||[]).filter(a=>!String(a.phone||"").trim()||!String(a.nom||"").trim()||!String(a.prenoms||"").trim()).length;
 const noUserPlant=(db.users||[]).filter(u=>!u.isMainAdmin&&(!u.usine||u.usine==="TOUTES"||!db.settings.usines.includes(u.usine))).length;
 const orphanTeams=(db.settings.teams||[]).filter(t=>!db.settings.teamFactories?.[t]||!db.settings.usines.includes(db.settings.teamFactories[t])).length;
 let bytes=0;try{bytes=new Blob([localStorage.getItem(KEY)||""]).size}catch(e){}
 const issues=[];if(dupPhones.length)issues.push(`${dupPhones.length} numéro(s) de téléphone en double`);if(dupUserIds.length)issues.push(`${dupUserIds.length} identifiant(s) en doublon entre comptes`);if(noPlant)issues.push(`${noPlant} candidature(s) sans usine`);if(unknownPlants)issues.push(`${unknownPlants} candidature(s) rattachée(s) à une usine inconnue`);if(noAccount)issues.push(`${noAccount} candidature(s) sans compte candidat valide`);if(duplicateApplications)issues.push(`${duplicateApplications} candidature(s) semblent concerner un compte déjà inscrit`);if(missingApplicantInfo)issues.push(`${missingApplicantInfo} compte(s) candidat(s) sans nom, prénoms ou téléphone`);if(noUserPlant)issues.push(`${noUserPlant} compte(s) personnel(s) sans usine valide`);if(orphanTeams)issues.push(`${orphanTeams} équipe(s) sans usine valide`);if(!db.users.some(u=>u.isMainAdmin))issues.push("Aucun administrateur principal défini");
 const el=$("systemAuditResult");if(!el)return;
 el.innerHTML=`<div class="panel"><b>Rapport de contrôle — ${esc(new Date().toLocaleString())}</b><p>Comptes candidats : ${db.applicants.length} | Candidatures : ${db.registrations.length} | Utilisateurs : ${db.users.length} | Usines : ${db.settings.usines.length} | Équipes : ${db.settings.teams.length}</p><p>Taille approximative des données locales : ${(bytes/1024).toFixed(1)} Ko</p>${issues.length?`<p class="locked"><b>Points à vérifier :</b><br>${issues.map(esc).join("<br>")}</p>`:`<p class="ok">Aucune incohérence simple détectée.</p>`}<p class="small">Ce contrôle vérifie la cohérence des données locales ; il ne remplace pas une sauvegarde régulière ni un audit de sécurité.</p></div>`;
}

function saveRetainedSchedule(){if(!isMainAdmin())return alert("Seul l’administrateur principal peut programmer la convocation.");db.settings.retainedDateTime=$("retainedDateTime")?.value||"";db.settings.retainedActivities=$("retainedActivities")?.value.trim()||"";save();alert("Date, heure et activités de convocation enregistrées.");parametres($("content"))}
function printCandidateResult(){
 if(session?.role!=="Postulant")return;
 const r=mine()[0];if(!r)return;
 const status=r.status||"EN ATTENTE";
 const msg=status==="RETENU"?`Félicitations ! Vous êtes RETENU. Veuillez vous présenter à votre usine le ${db.settings.retainedDateTime||"date et heure à confirmer"} pour les activités suivantes : ${db.settings.retainedActivities||"activités à préciser"}.`:status==="EN ATTENTE"?"Vous êtes retenu sur la liste d’attente. Veuillez patienter ; l’administration vous contactera pour un éventuel contrat en cas de démission.":"Nous vous remercions pour votre participation. Votre candidature n’a pas été retenue cette fois-ci. Nous vous encourageons à poursuivre vos démarches et vous souhaitons plein succès pour vos prochaines candidatures.";
 const w=window.open("","_blank");if(!w)return alert("Autorisez les fenêtres contextuelles dans votre navigateur pour imprimer ou enregistrer le résultat en PDF.");
 const company=esc(db.settings.companyName||"NSCT"),sub=esc(db.settings.companySubtitle||"Gestion des recrutements saisonniers"),logo=db.settings.companyLogo||"";
 const logoHtml=logo?`<img class="logo" src="${logo}" alt="Logo NSCT">`:"";
 w.document.write(`<html><head><meta charset="UTF-8"><title>Résultat candidat - ${esc(r.id)}</title><style>@page{size:A4 portrait;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0;padding:0}.sheet{max-width:700px;margin:0 auto;border:1px solid #777;padding:28px}.head{text-align:center;border-bottom:2px solid #222;padding:0 0 16px;margin-bottom:22px}.logo{display:block;width:76px;height:76px;object-fit:contain;margin:0 auto 8px}.company{font-size:20px;font-weight:700;text-align:center;text-transform:uppercase}.sub{font-size:12px;text-align:center;margin-top:5px}.title{font-size:17px;font-weight:700;text-align:center;margin-top:16px;text-transform:uppercase}.details p{font-size:13px;margin:13px 0;line-height:1.5}.decision{display:inline-block;border:1px solid #333;padding:5px 10px;font-weight:700}.msg{margin-top:24px;padding:16px;border:1px solid #ccc;background:#f7f7f7;line-height:1.65;font-size:13px}.date{text-align:right;font-size:10px;margin-top:24px}.actions{display:flex;justify-content:center;gap:10px;margin:0 auto 18px}.actions button{padding:10px 16px;border:0;border-radius:5px;background:#1769aa;color:#fff;font-size:14px;cursor:pointer}.actions .secondary{background:#555}.hint{text-align:center;font-size:11px;color:#555;margin:0 auto 18px}@media print{.actions,.hint{display:none!important}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.sheet{border:0;padding:0;max-width:none}}</style></head><body><div class="actions"><button onclick="window.print()">Télécharger en PDF / Imprimer</button><button class="secondary" onclick="window.close()">Fermer</button></div><p class="hint">Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF » pour sauvegarder ce document sur votre appareil.</p><div class="sheet"><div class="head">${logoHtml}<div class="company">${company}</div><div class="sub">${sub}</div><div class="title">Résultat de candidature</div></div><div class="details"><p><b>Identifiant :</b> ${esc(r.id)}</p><p><b>Nom et prénoms :</b> ${esc((r.data?.Nom||"")+" "+(r.data?.Prénoms||""))}</p><p><b>Usine :</b> ${esc(r.usine||r.data?.usine||"-")}</p><p><b>Type de candidature :</b> ${esc(r.type||"-")}</p><p><b>Décision :</b> <span class="decision">${esc(status)}</span></p></div><div class="msg">${esc(msg)}</div><p class="date">Édité le ${esc(new Date().toLocaleString())}</p></div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
 w.document.close();
}
function secureReset(){if(!verifyMainAdminCredentials())return;const deleteCandidateAccounts=!!$("deleteCandidateAccounts")?.checked;const message=deleteCandidateAccounts?"Cette opération supprimera les comptes candidats, les candidatures et les activités. Les paramètres et le compte administrateur seront conservés.":"Cette opération supprimera les candidatures et les activités, mais conservera les comptes candidats, les paramètres et le compte administrateur.";if(!confirm(message+" Avez-vous déjà téléchargé une sauvegarde ?"))return;if(!confirm("Confirmez-vous la remise à zéro des données de recrutement ? Cette opération est irréversible sans sauvegarde."))return;db.registrations=[];db.activities=[];db.seq=1000;db.registrationSeq=1000;if(deleteCandidateAccounts){db.applicants=[];db.applicantSeq=1000;}save();alert(deleteCandidateAccounts?"Les candidatures, les activités et les comptes candidats ont été supprimés. Les paramètres et le compte administrateur sont conservés.":"Les candidatures et les activités ont été supprimées. Les comptes candidats, les paramètres et le compte administrateur sont conservés.");parametres($("content"));}

function renderBrand(){let logo=db.settings.companyLogo||'';let hlogo=$("headerLogo");if(hlogo)hlogo.innerHTML=logo?`<img src="${logo}" class="headerLogoImg">`:'NSCT';$("headerTitle").textContent=db.settings.companyName?`INSCRIPTION ${db.settings.companyName} SAISONNIER`:'INSCRIPTION NSCT SAISONNIER';$("headerSubtitle").textContent=db.settings.companySubtitle||'Gestion des recrutements saisonniers';let hb=$("homeBrand"),lv=$("loginView");let photos=db.settings.homePhotos||[];if(hb)hb.innerHTML=photos.length?photos.map((x,i)=>`<img src="${x}" class="homePhoto ${i?'hidden':''}" data-home-index="${i}">`).join(''):(db.settings.homePhoto?`<img src="${db.settings.homePhoto}" class="homePhoto">`:'');if(lv)lv.style.backgroundImage=photos.length?`linear-gradient(#0006,#0006),url("${photos[0]}")`:'';if(photos.length>1){let i=0;clearInterval(window.homePhotoTimer);window.homePhotoTimer=setInterval(()=>{let imgs=document.querySelectorAll('#homeBrand .homePhoto');if(!imgs.length)return;imgs.forEach(x=>x.classList.add('hidden'));i=(i+1)%imgs.length;imgs[i].classList.remove('hidden');if(lv)lv.style.backgroundImage=`linear-gradient(#0006,#0006),url("${imgs[i].src}")`},4000)}}
function welcomePhotoAdminRow(v={},i=Date.now()){
 return `<div class="panel welcomePhotoAdminRow"><div class="welcomePhotoAdminPreview">${v.image?`<img src="${v.image}" alt="Photo actuelle">`:'<span>Aucune photo sélectionnée</span>'}</div><label>Choisir une photo<input class="welcomePhotoFile" type="file" accept="image/*"></label><label>Titre de l’activité<input class="welcomePhotoTitle" maxlength="100" placeholder="Ex. : Réception du coton" value="${esc(v.title||'')}"></label><input class="welcomePhotoExisting" type="hidden" value="${esc(v.image||'')}"><button type="button" class="danger" onclick="this.closest('.welcomePhotoAdminRow').remove()">Supprimer cette photo</button></div>`;
}
function addWelcomePhotoRow(){if(!isMainAdmin())return alert("Seul l’administrateur principal peut gérer les photos.");const box=$("welcomePhotoAdminRows");if(box)box.insertAdjacentHTML('beforeend',welcomePhotoAdminRow({},Date.now()));}
function resizeWelcomePhoto(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const max=1200,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',0.78));};img.src=reader.result;};reader.readAsDataURL(file);});}
async function saveWelcomePhotos(){
 if(!isMainAdmin())return alert("Seul l’administrateur principal peut gérer les photos.");
 const rows=[...document.querySelectorAll('#welcomePhotoAdminRows .welcomePhotoAdminRow')],photos=[];
 try{for(const row of rows){const file=row.querySelector('.welcomePhotoFile').files[0],title=row.querySelector('.welcomePhotoTitle').value.trim();let image=row.querySelector('.welcomePhotoExisting').value;if(!file&&!image&&!title)continue;if(file)image=await resizeWelcomePhoto(file);if(!image||!title)return alert("Pour chaque élément, choisissez une photo et indiquez le titre de l’activité.");photos.push({image,title});}}
 catch(e){return alert("Une photo n’a pas pu être lue. Essayez avec une image JPG ou PNG.");}
 const previous=db.settings.welcomePhotos;db.settings.welcomePhotos=photos;db.settings.welcomePhotoIndex=0;if(!save()){db.settings.welcomePhotos=previous;return;}renderWelcomeSplash();alert("Les photos et les titres des activités ont été enregistrés.");parametres($("content"));
}
function renderWelcomeSplash(){const box=$("welcomePhotoGallery"),splash=$("welcomeSplash");if(!box||!splash)return;const photos=db.settings.welcomePhotos||[];if(!photos.length){box.innerHTML='';clearInterval(window.welcomePhotoTimer);splash.classList.remove('welcomeHidden');return;}let index=0;const draw=()=>{const p=photos[index];box.innerHTML=`<h2 class="welcomePhotosTitle">Découvrez les activités de nos usines</h2><div class="welcomeSlideshow"><button type="button" class="welcomeSlideArrow" aria-label="Photo précédente" onclick="changeWelcomePhoto(-1)">‹</button><img class="welcomeSlideImage" src="${p.image}" alt="${esc(p.title)}"><button type="button" class="welcomeSlideArrow" aria-label="Photo suivante" onclick="changeWelcomePhoto(1)">›</button></div><div class="welcomeSlideCaption">${esc(p.title)}</div><div class="welcomeSlideDots">${photos.map((_,i)=>`<button type="button" aria-label="Afficher la photo ${i+1}" class="welcomeDot ${i===index?'active':''}" onclick="goWelcomePhoto(${i})"></button>`).join('')}</div>`;db.settings.welcomePhotoIndex=index;};window.changeWelcomePhoto=(delta)=>{index=(index+delta+photos.length)%photos.length;draw();resetWelcomePhotoTimer();};window.goWelcomePhoto=(i)=>{index=(i+photos.length)%photos.length;draw();resetWelcomePhotoTimer();};window.resetWelcomePhotoTimer=()=>{clearInterval(window.welcomePhotoTimer);if(photos.length>1)window.welcomePhotoTimer=setInterval(()=>{index=(index+1)%photos.length;draw();},4500);};draw();resetWelcomePhotoTimer();splash.classList.remove('welcomeHidden');}
function dismissWelcome(){const splash=$("welcomeSplash");if(splash)splash.classList.add("welcomeHidden");showEntryGate();}
function showEntryGate(){
  session=null;window.entryRole="";$ ("mainView").classList.add("hidden");$("homeScreen").classList.add("hidden");$("authScreen").classList.remove("hidden");
  $("authZone").innerHTML=`<div class="authPanel innerAccess entryGate"><h2>Accès à la plateforme</h2><p class="small">Saisissez le mot de passe d’accès que l’administrateur vous a attribué.</p><input id="entryPassword" type="password" autocomplete="current-password" placeholder="Mot de passe d’accès" onkeydown="if(event.key==='Enter')checkEntryPassword()"><button onclick="checkEntryPassword()">Continuer</button><p id="entryMsg" class="msg"></p><p class="small">Vous n’avez pas ce mot de passe ? Contactez l’administrateur de la plateforme.</p></div>`;
  $("loginMsg").textContent="";
}
function checkEntryPassword(){
 const pwd=$("entryPassword")?.value||"", codes=db.settings.entryPasswords||{};
 if(!pwd){$("entryMsg").textContent="Saisissez votre mot de passe d’accès.";return;}
 let role="";
 // Admin password has priority if passwords happen to match.
 if(codes.admin && pwd===codes.admin)role="admin";
 else if(codes.staff && pwd===codes.staff)role="staff";
 else if(codes.candidate && pwd===codes.candidate)role="candidate";
 if(!role){$("entryMsg").textContent="Mot de passe d’accès incorrect. Demandez le bon mot de passe à l’administrateur.";return;}
 window.entryRole=role; renderEntryHome(role);
}
function renderEntryHome(role){
 $("authScreen").classList.add("hidden");$("homeScreen").classList.remove("hidden");$("homeScreen").innerHTML=`<div id="homeBrand"></div><h2>Bienvenue</h2><p class="small">Accès : ${role==='admin'?'Administrateur principal':role==='staff'?'Personnel':'Candidat'}</p><div class="homeChoices">${role==='admin'?`<button onclick="openLogin('admin')">Administration</button><button onclick="openLogin('candidate')">Candidat</button><button class="secondary" onclick="openCreateAccount()">Création compte</button><button class="secondary" onclick="openForgot()">Identifiant ou mot de passe oublié</button>`:role==='staff'?`<button onclick="openStaffGate()">Administration — Personnel</button>`:`<button onclick="openLogin('candidate')">Se connecter comme candidat</button><button class="secondary" onclick="openCreateAccount()">Création compte</button><button class="secondary" onclick="openForgot()">Identifiant ou mot de passe oublié</button>`}</div><button class="secondary" onclick="downloadUserGuide()">Guide d’utilisation de la plateforme (PDF)</button><button class="secondary" onclick="showEntryGate()">Changer d’accès</button>`;
 renderBrand();
}
function openStaffGate(){
 const expected=(db.settings.entryPasswords||{}).staff||"";
 $("homeScreen").classList.add("hidden");$("authScreen").classList.remove("hidden");
 $("authZone").innerHTML=`<div class="authPanel innerAccess"><h2>Administration — Personnel</h2><p class="small">Saisissez une nouvelle fois votre mot de passe d’accès Personnel pour continuer.</p><input id="staffGatePwd" type="password" placeholder="Mot de passe Personnel" onkeydown="if(event.key==='Enter')confirmStaffGate()"><button onclick="confirmStaffGate()">Continuer</button><button class="secondary" onclick="renderEntryHome('staff')">Retour</button></div>`;$("loginMsg").textContent="";
}
function confirmStaffGate(){const expected=(db.settings.entryPasswords||{}).staff||"";if(!expected||($("staffGatePwd")?.value||"")!==expected){alert("Mot de passe Personnel incorrect ou non configuré. Demandez à l’administrateur de le définir dans Paramètres.");return;}openAdminType('Personnel');}
function saveEntryPasswords(){if(!isMainAdmin())return alert("Seul l’administrateur principal peut modifier les mots de passe d’accès.");const admin=$("entryAdminPwd").value,staff=$("entryStaffPwd").value,candidate=$("entryCandidatePwd").value;if(!admin.trim()||!staff.trim()||!candidate.trim())return alert("Les trois mots de passe d’accès sont obligatoires.");if(new Set([admin,staff,candidate]).size!==3)return alert("Choisissez trois mots de passe différents pour éviter toute confusion.");db.settings.entryPasswords={admin,staff,candidate};if(!save())return;alert("Mots de passe d’accès enregistrés sur ce navigateur. Remettez chaque mot de passe uniquement à la personne ou au groupe concerné.");parametres($("content"));}
window.addEventListener("load",()=>{if(startupRecoveryWarning)alert(startupRecoveryWarning);save();renderBrand();renderWelcomeSplash();startCountdown()});
