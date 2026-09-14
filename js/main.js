const SUPABASE_URL='https://jrgzenkcimujewydqflq.supabase.co';
const SUPABASE_KEY='sb_publishable_scV6_vg_8Nmf3Y2p4hbPPw_SiJB-NZN';

function initMenu(){
  const toggle=document.querySelector('.menu-toggle');
  const menu=document.querySelector('.navbar__menu');
  const inner=document.querySelector('.navbar__inner');
  if(!toggle||!menu||!inner)return;
  menu.id=menu.id||'site-menu';
  toggle.setAttribute('aria-controls',menu.id);
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-label','Open menu');
  const setActive=()=>{
    const current=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    menu.querySelectorAll('a[href]').forEach(link=>{
      const raw=link.getAttribute('href')||'';
      const target=raw.split('#')[0].split('?')[0].split('/').pop().toLowerCase()||'index.html';
      const active=target===current;
      link.classList.toggle('is-active',active);
      if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    });
  };
  const close=()=>{menu.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open menu');document.body.classList.remove('menu-open')};
  const open=()=>{menu.classList.add('is-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close menu');document.body.classList.add('menu-open')};
  toggle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();menu.classList.contains('is-open')?close():open()});
  menu.addEventListener('click',e=>{if(e.target.closest('a'))close()});
  document.addEventListener('click',e=>{if(menu.classList.contains('is-open')&&!menu.contains(e.target)&&!toggle.contains(e.target))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('is-open')){close();toggle.focus()}});
  window.addEventListener('resize',()=>{if(window.innerWidth>1050)close()},{passive:true});
  setActive();
}

function initViewCards(){
  const serviceDetails={
    'Maintenance':'Spring & fall cleanups; edging & mulching; weeding; lawn care; fertilizing; lawn renovations; new lawn installations; aeration; de-thatching; seeding; trimming of trees and shrubs.',
    'Planting & design':'Installation of trees, shrubs and perennials, plus landscape design services tailored to the property.',
    'Commercial':'Complete grounds maintenance plus snow management, snowplowing, shoveling, melting/de-icing and snow removal.',
    'Other landscape work':'Bobcat/backhoe work, shrub and stump removal, land clearing and re-grading.'
  };
  const cards=document.querySelectorAll('.service-grid .service-card[href],.team-grid .team-card');
  cards.forEach(original=>{
    if(original.dataset.viewCard)return;
    const summary=original.querySelector('p');
    if(!summary)return;
    let card=original;
    const destination=card.getAttribute('href');
    if(card.matches('a.service-card[href]')){
      const replacement=document.createElement('article');
      [...card.attributes].forEach(attr=>{if(attr.name!=='href')replacement.setAttribute(attr.name,attr.value)});
      while(card.firstChild)replacement.appendChild(card.firstChild);
      card.replaceWith(replacement);
      card=replacement;
    }
    card.dataset.viewCard='true';
    card.classList.add('view-card');
    const title=card.querySelector('h3,h2')?.textContent.trim()||'';
    const detail=document.createElement('div');
    detail.className='view-card__detail';
    if(card.matches('.service-card')&&serviceDetails[title])detail.innerHTML=`<ul>${serviceDetails[title].split(';').map(x=>`<li>${x}</li>`).join('')}</ul>`;
    else detail.innerHTML=summary.innerHTML;
    summary.className='view-card__summary';
    card.appendChild(detail);
    const hint=document.createElement('span');
    hint.className='view-card__hint';
    hint.textContent='Tap to view details';
    card.appendChild(hint);
    if(destination){
      const action=document.createElement('a');
      action.className='view-card__action';
      action.href=destination;
      action.innerHTML='View service <span aria-hidden="true">→</span>';
      action.setAttribute('aria-label',`View ${title} service details`);
      card.appendChild(action);
    }
    card.setAttribute('tabindex','0');
    card.setAttribute('role','button');
    card.setAttribute('aria-expanded','false');
    const toggle=()=>{const open=card.classList.toggle('is-open');card.setAttribute('aria-expanded',String(open));hint.textContent=open?'Tap to close':'Tap to view details'};
    card.addEventListener('click',e=>{if(e.target.closest('.view-card__action'))return;toggle()});
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){if(e.target.closest('.view-card__action'))return;e.preventDefault();toggle()}
      else if(e.key==='Escape'&&card.classList.contains('is-open'))toggle();
    });
  });
}

function initReveal(){
  const items=document.querySelectorAll('.reveal');
  if(!items.length)return;
  if(!('IntersectionObserver'in window)){items.forEach(el=>el.classList.add('is-visible'));return}
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.08,rootMargin:'0px 0px -30px 0px'});
  items.forEach(el=>observer.observe(el));
}

function initFooterAccordion(){
  const groups=[...document.querySelectorAll('.footer__top>div:not(.footer__brand)')];
  groups.forEach((group,index)=>{
    const title=group.querySelector('h3');
    const list=group.querySelector('ul');
    if(!title||!list||group.dataset.footerReady)return;
    group.dataset.footerReady='true';
    title.setAttribute('role','button');
    title.setAttribute('tabindex','0');
    title.setAttribute('aria-expanded',index===0?'true':'false');
    if(index===0)group.classList.add('is-open');
    const toggle=()=>{if(window.innerWidth>820)return;const open=group.classList.toggle('is-open');title.setAttribute('aria-expanded',String(open))};
    title.addEventListener('click',toggle);
    title.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
  });
  const sync=()=>groups.forEach((group,index)=>{
    const title=group.querySelector('h3');
    if(!title)return;
    if(window.innerWidth>820){group.classList.add('is-open');title.setAttribute('aria-expanded','true')}
    else if(index!==0){group.classList.remove('is-open');title.setAttribute('aria-expanded','false')}
  });
  window.addEventListener('resize',sync,{passive:true});
  sync();
}

function initGalleryLightbox(){
  const cards=[...document.querySelectorAll('.gallery-card')];
  if(!cards.length||document.getElementById('gallery-lightbox'))return;
  const lb=document.createElement('div');
  lb.className='gallery-lightbox';
  lb.id='gallery-lightbox';
  lb.setAttribute('aria-hidden','true');
  lb.innerHTML='<div class="gallery-lightbox__stage" role="dialog" aria-modal="true" aria-label="Gallery photo viewer"><button class="gallery-lightbox__close" type="button" aria-label="Close photo viewer"><i class="fa-solid fa-xmark"></i></button><button class="gallery-lightbox__prev" type="button" aria-label="Previous photo"><i class="fa-solid fa-chevron-left"></i></button><img class="gallery-lightbox__image" alt=""><button class="gallery-lightbox__next" type="button" aria-label="Next photo"><i class="fa-solid fa-chevron-right"></i></button><div class="gallery-lightbox__caption" aria-live="polite"></div></div>';
  document.body.appendChild(lb);
  const img=lb.querySelector('.gallery-lightbox__image'),caption=lb.querySelector('.gallery-lightbox__caption'),prev=lb.querySelector('.gallery-lightbox__prev'),next=lb.querySelector('.gallery-lightbox__next'),closeButton=lb.querySelector('.gallery-lightbox__close');
  let index=0,touchX=0,lastFocused=null;
  const title=c=>c.querySelector('.gallery-card__copy strong')?.textContent.trim()||'';
  const show=i=>{
    index=(i+cards.length)%cards.length;
    const c=cards[index],source=c.querySelector('img');
    if(!source)return;
    img.src=source.currentSrc||source.src;
    img.alt=source.alt||title(c);
    caption.textContent='';
    const label=document.createElement('span');label.textContent=title(c);caption.appendChild(label);
    const counter=document.createElement('span');counter.className='gallery-lightbox__counter';counter.textContent=`${index+1} / ${cards.length}`;caption.appendChild(counter);
  };
  const open=i=>{lastFocused=document.activeElement;show(i);lb.classList.add('is-open');lb.setAttribute('aria-hidden','false');document.body.classList.add('gallery-open');closeButton.focus()};
  const close=()=>{lb.classList.remove('is-open');lb.setAttribute('aria-hidden','true');document.body.classList.remove('gallery-open');img.removeAttribute('src');lastFocused?.focus?.()};
  cards.forEach((c,i)=>{c.tabIndex=0;c.setAttribute('role','button');c.addEventListener('click',e=>{e.preventDefault();open(i)});c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(i)}})});
  closeButton.addEventListener('click',close);prev.addEventListener('click',()=>show(index-1));next.addEventListener('click',()=>show(index+1));
  lb.addEventListener('click',e=>{if(e.target===lb)close()});
  document.addEventListener('keydown',e=>{if(!lb.classList.contains('is-open'))return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')show(index-1);if(e.key==='ArrowRight')show(index+1)});
  lb.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].screenX},{passive:true});
  lb.addEventListener('touchend',e=>{const dx=e.changedTouches[0].screenX-touchX;if(Math.abs(dx)>45)show(dx<0?index+1:index-1)},{passive:true});
}

async function submitContact(form){
  const status=form.querySelector('.form-status');
  const button=form.querySelector('button[type=submit]');
  if(!status||!button)return;
  const original=button.textContent;
  status.textContent='Sending…';
  button.disabled=true;
  try{
    const data=Object.fromEntries(new FormData(form).entries());
    const response=await fetch(`${SUPABASE_URL}/rest/v1/contact_submissions`,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Prefer':'return=minimal'},body:JSON.stringify({first_name:data.first_name,last_name:data.last_name,email:data.email,phone:data.phone||null,city:data.city,service:data.service||null,message:data.message,source:data.source||'Website'})});
    if(!response.ok)throw new Error(await response.text());
    form.reset();status.textContent='Thanks — your request has been received. We’ll be in touch.';status.className='form-status success';
  }catch(error){
    console.error(error);status.textContent='We could not send the form right now. Please call 508-647-0003.';status.className='form-status error';
  }finally{button.disabled=false;button.textContent=original}
}

function initContactForm(){
  const form=document.getElementById('contactForm');
  if(!form)return;
  form.addEventListener('submit',e=>{e.preventDefault();if(form.reportValidity())submitContact(form)});
}

document.addEventListener('DOMContentLoaded',()=>{initMenu();initViewCards();initReveal();initFooterAccordion();initGalleryLightbox();initContactForm()});
