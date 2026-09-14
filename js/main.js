const SUPABASE_URL='https://jrgzenkcimujewydqflq.supabase.co';const SUPABASE_KEY='sb_publishable_scV6_vg_8Nmf3Y2p4hbPPw_SiJB-NZN';

function initMenu(){
  const toggle=document.querySelector('.menu-toggle'),menu=document.querySelector('.navbar__menu');
  if(!toggle||!menu)return;
  menu.id=menu.id||'site-menu';
  toggle.setAttribute('aria-controls',menu.id);
  toggle.classList.remove('menu-toggle--floating-widget');
  const close=()=>{menu.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open menu');document.body.classList.remove('menu-open')};
  toggle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const open=menu.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu');document.body.classList.toggle('menu-open',open)});
  menu.addEventListener('click',e=>{if(e.target.closest('a'))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  const sync=()=>{if(window.innerWidth>1050)close()};
  window.addEventListener('resize',sync,{passive:true});
  sync();
}

function initReveal(){
  const items=document.querySelectorAll('.reveal');
  if(!items.length)return;
  if(!('IntersectionObserver' in window)){items.forEach(el=>el.classList.add('is-visible'));return}
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.08,rootMargin:'0px 0px -30px 0px'});
  items.forEach(el=>observer.observe(el));
}

function initFooterAccordion(){
  const groups=[...document.querySelectorAll('.footer__top>div:not(.footer__brand)')];
  if(!groups.length)return;
  groups.forEach((group,index)=>{
    const title=group.querySelector('h3'),list=group.querySelector('ul');
    if(!title||!list||group.dataset.footerReady)return;
    group.dataset.footerReady='true';
    title.setAttribute('role','button');title.setAttribute('tabindex','0');title.setAttribute('aria-expanded',index===0?'true':'false');
    if(index===0)group.classList.add('is-open');
    const toggle=()=>{if(window.innerWidth>780)return;const open=group.classList.toggle('is-open');title.setAttribute('aria-expanded',String(open))};
    title.addEventListener('click',toggle);
    title.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
  });
  const sync=()=>groups.forEach((group,index)=>{const title=group.querySelector('h3');if(!title)return;if(window.innerWidth>780){group.classList.add('is-open');title.setAttribute('aria-expanded','true')}else if(index!==0){group.classList.remove('is-open');title.setAttribute('aria-expanded','false')}});
  window.addEventListener('resize',sync,{passive:true});
  sync();
}

function initGalleryLightbox(){