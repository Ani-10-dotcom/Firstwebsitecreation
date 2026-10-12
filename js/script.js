(function(){
  /* ---------- helpers ---------- */
  var $ = function(s){return document.querySelector(s)};
  var store = {
    get:function(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},
    set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  };
  var esc = function(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var inr = function(n){return '\u20B9'+n.toLocaleString('en-IN')};
  var PRICE=749, MRP=1050, NAME='Leoron by Srushti Gold Outer Lid Pressure Cooker, 3 L';
  var stars = function(v){return '<span class="stars" style="--p:'+(v/5*100)+'%" role="img" aria-label="'+v.toFixed(1)+' out of 5">\u2605\u2605\u2605\u2605\u2605</span>'};

  /* ---------- product images (real photos embedded) ---------- */
  var IMAGES = [
    {t:'Front view', c:'Front view with the Leoron label and Bakelite handle', s:'images/1-front-view.jpg'},
    {t:'Weight valve and safe locking', c:'Precision weight valve and safe locking system', s:'images/2-weight-valve.jpg'},
    {t:'Features and certifications', c:'ISI mark product with heat resistant Bakelite handles and micro tech vent weight', s:'images/3-features.jpg'},
    {t:'Inside the cooker', c:'Strong body, extra thick base and gasket release system', s:'images/4-inside.jpg'},
    {t:'Safety valve and handle', c:'Lead free safety valve and heat resistant easy grip Bakelite handle', s:'images/5-safety-valve.jpg'}
  ];

  /* ---------- gallery ---------- */
  var idx = 0, stage=$('#stage'), mainImg=$('#mainImg');
  var thumbsEl = $('#thumbs');
  thumbsEl.innerHTML = IMAGES.map(function(im,i){
    return '<button class="thumb" data-i="'+i+'" aria-label="Show image '+(i+1)+': '+esc(im.t)+'"><img src="'+im.s+'" alt=""></button>';
  }).join('');
  function show(i){
    idx = (i+IMAGES.length)%IMAGES.length;
    mainImg.src = IMAGES[idx].s; mainImg.alt = NAME+', '+IMAGES[idx].t.toLowerCase();
    $('#count').textContent = (idx+1)+' / '+IMAGES.length;
    $('#cap').textContent = IMAGES[idx].c;
    thumbsEl.querySelectorAll('.thumb').forEach(function(b,n){b.setAttribute('aria-current', n===idx?'true':'false')});
  }
  thumbsEl.addEventListener('click',function(e){var b=e.target.closest('.thumb'); if(b) show(+b.dataset.i)});
  $('#prev').addEventListener('click',function(){show(idx-1)});
  $('#next').addEventListener('click',function(){show(idx+1)});
  stage.addEventListener('keydown',function(e){
    if(e.key==='ArrowLeft'){show(idx-1);e.preventDefault()}
    if(e.key==='ArrowRight'){show(idx+1);e.preventDefault()}
  });
  if(window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches){
    stage.classList.add('zoom');
    stage.addEventListener('mouseenter',function(){stage.classList.add('zoomed')});
    stage.addEventListener('mousemove',function(e){
      if(e.target.closest('.arrow')){mainImg.style.transform='none';return}
      var r=stage.getBoundingClientRect();
      mainImg.style.setProperty('--x',((e.clientX-r.left)/r.width*100)+'%');
      mainImg.style.setProperty('--y',((e.clientY-r.top)/r.height*100)+'%');
      mainImg.style.transform='scale(2)';
    });
    stage.addEventListener('mouseleave',function(){mainImg.style.transform=''});
  }
  show(0);

  /* ---------- state ---------- */
  var qty  = Math.min(10, Math.max(0, parseInt(store.get('kk:qty',0),10)||0));
  var wish = !!store.get('kk:wish',false);
  var mine = store.get('kk:reviews',[]); if(!Array.isArray(mine)) mine=[];

  var SAMPLE = [
    {n:'Meenakshi R.', r:5, h:'Seals well and the whistle is easy to hear', t:'Dal cooks in about three whistles and the lid closes without any struggle. The size is right for the two of us plus a guest now and then.', d:'28 Sep 2026', v:true},
    {n:'Karthik S.', r:5, h:'Good value for daily use', t:'Light to lift even when it is full of rice. The Bakelite handles stay cool enough to hold while it is on the stove.', d:'19 Sep 2026', v:true},
    {n:'Divya P.', r:4, h:'Does the job', t:'Pressure builds quickly and cleaning is simple. The finish is a bit plain but it works exactly as it should.', d:'11 Sep 2026', v:true},
    {n:'Arun V.', r:5, h:'Perfect size for a small family', t:'I bought this for my flat. Three litres is enough for a curry and rice on the same day. The outer lid is easy to line up.', d:'2 Sep 2026', v:true},
    {n:'Lakshmi N.', r:4, h:'Solid, but wash the gasket often', t:'Cooks evenly and the handles feel sturdy. Wash the rubber gasket after every use so it keeps its grip.', d:'24 Aug 2026', v:false},
    {n:'Suresh B.', r:3, h:'Okay for the price', t:'Works fine, though the aluminium shows marks if you scrub hard. Use a soft sponge and it stays tidy.', d:'17 Aug 2026', v:true},
    {n:'Priya T.', r:5, h:'Arrived well packed', t:'Came in a neat box with the gasket and whistle already fitted. Used it the same evening for chickpeas.', d:'9 Aug 2026', v:true},
    {n:'Ramesh K.', r:2, h:'Handle felt loose on arrival', t:'The short handle needed tightening with a screwdriver when it arrived. After that it has been fine.', d:'30 Jul 2026', v:false}
  ];
  var all = function(){return mine.concat(SAMPLE)};
  var persist = function(){store.set('kk:qty',qty);store.set('kk:wish',wish);store.set('kk:reviews',mine)};

  /* ---------- toast ---------- */
  var tt; function toast(msg){var t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('show')},2200)}

  /* ---------- price ---------- */
  $('#price').textContent = inr(PRICE);
  $('#mrp').textContent = 'MRP '+inr(MRP);
  $('#off').textContent = Math.round((MRP-PRICE)/MRP*100)+'% off';

  /* ---------- buy + counts ---------- */
  var stepper = function(small){
    return '<div class="step'+(small?' sm':'')+'"><button data-act="dec" aria-label="Decrease quantity">\u2212</button><output aria-live="polite">'+qty+'</output><button data-act="inc" aria-label="Increase quantity"'+(qty>=10?' disabled':'')+'>+</button></div>';
  };
  function renderBuy(){
    $('#buy').innerHTML = qty===0
      ? '<button class="btn add" data-act="add"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9h18l-2 10.200a2 2 0 0 1-2 1.600H7a2 2 0 0 1-2-1.600L3 9z"/><path d="M8 9l3-5M16 9l-3-5"/></svg>Add to basket</button>'
      : stepper(false)+'<button class="btn ghost" data-act="open-cart">View basket</button>';
    var wb=$('#wishBtn'); wb.setAttribute('aria-pressed',wish?'true':'false');
    $('#wishLabel').textContent = wish?'Saved to wishlist':'Save to wishlist';
    var cb=$('#cartBadge'); cb.textContent=qty; cb.classList.toggle('on',qty>0);
    $('#wishBadge').classList.toggle('on',wish);
  }

  /* ---------- drawer ---------- */
  var mode='cart', lastFocus=null;
  function renderDrawer(){
    var title=$('#dtitle'), body=$('#dbody'), foot=$('#dfoot');
    var item = function(extra){return '<div class="ditem"><img src="'+IMAGES[0].s+'" alt=""><div><p class="dn">'+esc(NAME)+'</p><p class="dp">'+inr(PRICE)+'<s>'+inr(MRP)+'</s></p>'+extra+'</div></div>'};
    if(mode==='cart'){
      title.textContent='Your basket';
      if(qty===0){
        body.innerHTML='<div class="dempty"><b>Your basket is empty</b>Add the pressure cooker to see it here.</div>'; foot.innerHTML='';
      } else {
        body.innerHTML=item('<div class="dlinks">'+stepper(true)+'<button class="link" data-act="remove">Remove</button></div>');
        foot.innerHTML='<div class="line2"><span>Item total ('+qty+(qty>1?' items':' item')+')</span><span>'+inr(MRP*qty)+'</span></div>'
          +'<div class="line2 s"><span>Discount</span><span>\u2212'+inr((MRP-PRICE)*qty)+'</span></div>'
          +'<div class="line2 t"><span>To pay</span><span>'+inr(PRICE*qty)+'</span></div>'
          +'<button class="btn add" data-act="checkout">Checkout</button>';
      }
    } else {
      title.textContent='Your wishlist';
      if(!wish){
        body.innerHTML='<div class="dempty"><b>Nothing saved yet</b>Tap the heart on a product to keep it here.</div>'; foot.innerHTML='';
      } else {
        body.innerHTML=item('<div class="dlinks"><button class="btn add" style="min-height:38px;padding:6px 16px;font-size:14px;flex:none" data-act="move">Move to basket</button><button class="link" data-act="wish">Remove</button></div>'); foot.innerHTML='';
      }
    }
  }
  function openDrawer(m){
    mode=m; lastFocus=document.activeElement; renderDrawer();
    $('#drawer').classList.add('open'); $('#scrim').classList.add('open'); $('#drawer').setAttribute('aria-hidden','false');
    setTimeout(function(){$('#dclose').focus()},50);
  }
  function closeDrawer(){
    $('#drawer').classList.remove('open'); $('#scrim').classList.remove('open'); $('#drawer').setAttribute('aria-hidden','true');
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $('#dclose').addEventListener('click',closeDrawer);
  $('#scrim').addEventListener('click',closeDrawer);
  document.addEventListener('keydown',function(e){if(e.key==='Escape' && $('#drawer').classList.contains('open')) closeDrawer()});
  $('#openCart').addEventListener('click',function(){openDrawer('cart')});
  $('#openWish').addEventListener('click',function(){openDrawer('wish')});

  /* ---------- actions ---------- */
  function refresh(){renderBuy(); if($('#drawer').classList.contains('open')) renderDrawer(); persist()}
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-act]'); if(!b) return;
    var a=b.dataset.act;
    if(a==='add'){qty=1; toast('Added to basket')}
    else if(a==='inc'){if(qty<10){qty++}else{toast('You can add up to 10 of this item')}}
    else if(a==='dec'){qty=Math.max(0,qty-1); if(qty===0) toast('Removed from basket')}
    else if(a==='remove'){qty=0; toast('Removed from basket')}
    else if(a==='wish'){wish=!wish; toast(wish?'Saved to wishlist':'Removed from wishlist')}
    else if(a==='move'){qty=Math.max(qty,1); wish=false; toast('Moved to basket'); mode='cart'}
    else if(a==='open-cart'){openDrawer('cart'); return}
    else if(a==='checkout'){toast('Checkout is not part of this design demo'); return}
    refresh();
  });
  $('#searchForm').addEventListener('submit',function(e){e.preventDefault(); toast('Search is not part of this design demo')});

  /* ---------- reviews ---------- */
  function renderSummary(){
    var list=all(), n=list.length, sum=list.reduce(function(s,r){return s+r.r},0), avg=sum/n;
    var avgTxt=avg.toFixed(1);
    $('#chipAvg').innerHTML=avgTxt+' \u2605';
    $('#topStars').innerHTML=stars(avg);
    $('#topCount').textContent=n+' ratings and reviews';
    $('#avgNum').textContent=avgTxt;
    $('#avgStars').innerHTML=stars(avg);
    $('#avgCount').textContent='Based on '+n+' reviews';
    var html='';
    for(var s=5;s>=1;s--){
      var c=list.filter(function(r){return r.r===s}).length;
      html+='<div class="bar"><span>'+s+' \u2605</span><i><b style="width:'+(c/n*100)+'%"></b></i><span>'+c+'</span></div>';
    }
    $('#bars').innerHTML=html;
  }
  function renderReviews(){
    var f=$('#rf').value, list=all().filter(function(r){return f==='all'||r.r===+f});
    $('#shown').textContent='Showing '+list.length+(list.length===1?' review':' reviews');
    $('#revlist').innerHTML = list.length ? list.map(function(r){
      return '<article class="rev"><header>'+stars(r.r)+'<h3>'+esc(r.h)+'</h3></header><p>'+esc(r.t)+'</p><div class="meta"><span>'+esc(r.n)+'</span><span>'+esc(r.d)+'</span>'+(r.v?'<span class="vtag">Verified buyer</span>':'')+'</div></article>';
    }).join('') : '<div class="empty">No reviews with this rating yet.</div>';
  }
  $('#rf').addEventListener('change',renderReviews);

  var rating=0, pick=$('#pick');
  pick.innerHTML=[1,2,3,4,5].map(function(i){return '<button type="button" data-v="'+i+'" aria-label="'+i+' star'+(i>1?'s':'')+'" aria-pressed="false">\u2605</button>'}).join('');
  function paintPick(){pick.querySelectorAll('button').forEach(function(b){var on=+b.dataset.v<=rating;b.classList.toggle('on',on);b.setAttribute('aria-pressed',+b.dataset.v===rating?'true':'false')})}
  pick.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;rating=+b.dataset.v;paintPick()});

  var form=$('#form');
  function toggleForm(open){
    form.classList.toggle('open',open); $('#writeBtn').setAttribute('aria-expanded',open?'true':'false');
    if(open){form.scrollIntoView({block:'nearest'});$('#rname').focus()}
  }
  $('#writeBtn').addEventListener('click',function(){toggleForm(!form.classList.contains('open'))});
  $('#cancelRev').addEventListener('click',function(){toggleForm(false)});
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var name=$('#rname').value.trim(), title=$('#rtitle').value.trim(), text=$('#rtext').value.trim();
    var err=$('#ferr');
    if(!rating){err.textContent='Choose a star rating.';return}
    if(!name){err.textContent='Enter your name.';$('#rname').focus();return}
    if(!title){err.textContent='Add a short title for your review.';$('#rtitle').focus();return}
    if(text.length<10){err.textContent='Write at least 10 characters in your review.';$('#rtext').focus();return}
    err.textContent='';
    var d=new Date(); var ds=d.getDate()+' '+d.toLocaleString('en-GB',{month:'short'})+' '+d.getFullYear();
    mine.unshift({n:name,r:rating,h:title,t:text,d:ds,v:false});
    persist(); form.reset(); rating=0; paintPick(); toggleForm(false);
    $('#rf').value='all'; renderSummary(); renderReviews(); toast('Thanks, your review is posted');
  });

  /* ---------- sub nav highlight ---------- */
  var links=[].slice.call(document.querySelectorAll('.subnav a'));
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){links.forEach(function(l){l.setAttribute('aria-current', l.getAttribute('href')==='#'+en.target.id?'true':'false')})}
      });
    },{rootMargin:'-35% 0px -60% 0px'});
    ['details','specs','reviews'].forEach(function(id){io.observe(document.getElementById(id))});
  }

  renderBuy(); renderSummary(); renderReviews(); paintPick();
})();
