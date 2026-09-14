/* Temporary public-site seasonal preview. No weather request is made here. */
(function(){
  const seasons={
    original:{icon:'fa-leaf',label:'Original'},
    spring:{icon:'fa-seedling',label:'Spring'},
    summer:{icon:'fa-sun',label:'Summer'},
    autumn:{icon:'fa-leaf',label:'Autumn'},
    winter:{icon:'fa-snowflake',label:'Winter'}
  };
  const getCalendarSeason=()=>{const m=new Date().getMonth()+1;if(m>=3&&m<=5)return'spring';if(m>=6&&m<=8)return'summer';if(m>=9&&m<=11)return'autumn';return'winter'};
  const applySeason=(season)=>{
    const body=document.body;if(!body)return;
    const key=seasons[season]?season:'original';
    body.dataset.season=key;
    body.dataset.weather='preview';
    body.dataset.seasonalReady='true';
    document.documentElement.style.setProperty('--season-key',key);
    document.documentElement.style.setProperty('--season-icon',`'${seasons[key].label}'`);
    document.documentElement.style.setProperty('--seasonal-preview-active',key==='original'?'0':'1');
    document.querySelectorAll('[data-season-choice]').forEach(button=>{
      const active=button.dataset.seasonChoice===key;
      button.classList.toggle('is-selected',active);
      button.setAttribute('aria-pressed',String(active));
    });
    const icon=document.querySelector('[data-season-icon]');
    if(icon){icon.className=`fa-solid ${seasons[key].icon}`;icon.setAttribute('aria-label',seasons[key].label)}
    const label=document.querySelector('[data-season-current]');
    if(label)label.textContent=seasons[key].label;
  };
  /* Replace the weather initializer during this temporary visual review so no API is consulted. */
  window.initSeasonalWeather=function(){applySeason('original');};
  function initPreview(){
    if(document.getElementById('seasonal-preview'))return;
    const root=document.createElement('div');root.id='seasonal-preview';root.className='seasonal-preview';
    root.innerHTML='<button class="seasonal-preview__toggle" type="button" aria-expanded="false" aria-controls="seasonal-preview-panel" title="Preview seasonal colors"><i class="fa-solid fa-palette"></i><span>Preview</span></button><div class="seasonal-preview__panel" id="seasonal-preview-panel" hidden><div class="seasonal-preview__head"><strong>Seasonal preview</strong><button type="button" class="seasonal-preview__close" aria-label="Close preview">×</button></div><div class="seasonal-preview__choices" role="group" aria-label="Choose a seasonal palette"></div><p>Temporary preview only. Weather is not being consulted.</p></div>';
    document.body.appendChild(root);
    const choices=root.querySelector('.seasonal-preview__choices');
    Object.entries(seasons).forEach(([key,meta])=>{const b=document.createElement('button');b.type='button';b.dataset.seasonChoice=key;b.setAttribute('aria-pressed','false');b.innerHTML=`<i class="fa-solid ${meta.icon}" aria-hidden="true"></i><span>${meta.label}</span>`;b.addEventListener('click',()=>applySeason(key));choices.appendChild(b)});
    const toggle=root.querySelector('.seasonal-preview__toggle'),panel=root.querySelector('.seasonal-preview__panel'),close=root.querySelector('.seasonal-preview__close');
    const setOpen=open=>{toggle.setAttribute('aria-expanded',String(open));panel.hidden=!open;root.classList.toggle('is-open',open)};
    toggle.addEventListener('click',()=>setOpen(panel.hidden));close.addEventListener('click',()=>setOpen(false));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)setOpen(false)});
    document.addEventListener('click',e=>{if(!root.contains(e.target)&&!panel.hidden)setOpen(false)});
    applySeason('original');
  }
  document.addEventListener('DOMContentLoaded',initPreview);
})();