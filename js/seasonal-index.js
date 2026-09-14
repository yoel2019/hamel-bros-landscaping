(function(){
  const init=()=>{
    if(!document.body||document.getElementById('seasonal-index-ready'))return;
    const mark=document.createElement('meta');mark.id='seasonal-index-ready';document.head.appendChild(mark);
    const logo=document.querySelector('.navbar__logo');
    if(logo){
      const scene=document.createElement('span');scene.className='seasonal-logo-scene';scene.setAttribute('aria-hidden','true');
      const svg=(name,cls='')=>`<img class="seasonal-svg ${cls}" src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/svgs/solid/${name}.svg" alt="" aria-hidden="true" loading="eager" decoding="async">`;
      scene.innerHTML=`${svg('seedling','spring-svg seasonal-svg--tall')}${svg('leaf','spring-svg seasonal-svg--small')}${svg('seedling','spring-svg')}${svg('leaf','spring-svg seasonal-svg--small')}${svg('sun','summer-svg seasonal-svg--tall')}${svg('leaf','summer-svg')}${svg('leaf','summer-svg seasonal-svg--small')}${svg('leaf','autumn-svg seasonal-svg--small')}${svg('leaf','autumn-svg')}${svg('leaf','autumn-svg seasonal-svg--small')}${svg('leaf','autumn-svg')}${svg('snowflake','winter-svg seasonal-svg--small')}${svg('snowflake','winter-svg')}${svg('snowflake','winter-svg seasonal-svg--small')}<span class="seasonal-ground seasonal-ground--spring"></span><span class="seasonal-ground seasonal-ground--summer"></span><span class="seasonal-ground seasonal-ground--autumn"></span><span class="seasonal-ground seasonal-ground--winter"></span>`;
      logo.appendChild(scene);
    }
    const heroPrimary=document.querySelector('.hero__actions .btn-accent');
    const ctaPrimary=document.querySelector('.cta .btn-accent');
    [heroPrimary,ctaPrimary].forEach(el=>{if(el)el.classList.add('seasonal-highlight','seasonal-highlight--grass','seasonal-highlight--leaves','seasonal-highlight--snow')});
    const cards=[...document.querySelectorAll('.section--deep .service-grid .service-card')];
    [cards[0],cards[cards.length-1]].forEach(el=>{if(el)el.classList.add('seasonal-highlight','seasonal-highlight--grass','seasonal-highlight--leaves','seasonal-highlight--snow')});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();