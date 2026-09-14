(function(){
  const init=()=>{
    if(!document.body||document.getElementById('seasonal-index-ready'))return;
    const mark=document.createElement('meta');mark.id='seasonal-index-ready';document.head.appendChild(mark);
    const logo=document.querySelector('.navbar__logo');
    if(logo){
      const scene=document.createElement('span');scene.className='seasonal-logo-scene';scene.setAttribute('aria-hidden','true');
      scene.innerHTML='<span class="grass"></span><span class="spring-buds"></span><span class="leaves"></span><span class="snow"></span>';
      logo.appendChild(scene);
      const marker=document.createElement('span');marker.className='seasonal-season-marker';marker.setAttribute('aria-label','Current seasonal preview');marker.setAttribute('aria-hidden','true');logo.appendChild(marker);
      const icons={original:'',spring:'🌱',summer:'☀️',autumn:'🍂',winter:'❄️'};
      const update=()=>{const key=document.body.dataset.season||'original';marker.textContent=icons[key]||'';marker.style.display=key==='original'?'none':'inline-flex';marker.classList.remove('is-changing');requestAnimationFrame(()=>marker.classList.add('is-changing'))};
      update();
      new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['data-season']});
    }
    const heroPrimary=document.querySelector('.hero__actions .btn-accent');
    const ctaPrimary=document.querySelector('.cta .btn-accent');
    [heroPrimary,ctaPrimary].forEach(el=>{if(el)el.classList.add('seasonal-highlight','seasonal-highlight--grass')});
    const cards=[...document.querySelectorAll('.section--deep .service-grid .service-card')];
    [cards[0],cards[cards.length-1]].forEach(el=>{if(el)el.classList.add('seasonal-highlight','seasonal-highlight--grass')});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();