// SNK Grocery Customer App
const API = '';
const CATS = [
  {id:'all',name:'All',icon:'🛒'},{id:'vegetables',name:'Veggies',icon:'🥬'},
  {id:'fruits',name:'Fruits',icon:'🍎'},{id:'dairy',name:'Dairy',icon:'🥛'},
  {id:'staples',name:'Staples',icon:'🌾'},{id:'snacks',name:'Snacks',icon:'🍪'},
  {id:'beverages',name:'Drinks',icon:'🥤'},{id:'personal',name:'Care',icon:'🧴'}
];
const FLOW = ['New','Confirmed','Packing','Out for Delivery','Delivered'];
const SCOLOR = {New:'bg-blue-100 text-blue-700',Confirmed:'bg-indigo-100 text-indigo-700',Packing:'bg-yellow-100 text-yellow-800','Out for Delivery':'bg-orange-100 text-orange-700',Delivered:'bg-green-100 text-green-700',Cancelled:'bg-red-100 text-red-700'};

let PRODUCTS = [], SETTINGS = {}, cart = JSON.parse(localStorage.getItem('snk_cart')||'[]');
let user = JSON.parse(localStorage.getItem('snk_user')||'null');
let wishlist = [], cat = 'all', search = '', deliveryLat = null, deliveryLng = null;
let reviewPid = null, reviewStars = 5, trackMap = null;

const $ = id => document.getElementById(id);
const fmt = n => '₹' + Number(n).toLocaleString('en-IN');
const getP = id => PRODUCTS.find(p => p.id == id);

async function init() {
  try {
    const [pr, st] = await Promise.all([fetch(API+'/api/products').then(r=>r.json()), fetch(API+'/api/settings').then(r=>r.json())]);
    PRODUCTS = pr.filter(p => p.available); SETTINGS = st;
  } catch(e) {
    PRODUCTS = []; SETTINGS = {min_order:99,delivery_charge:30,free_delivery_above:299,offer_percent:10,offer_min:499,offer_text:'10% OFF above ₹499',helpline:'9876543210',email:'support@snkgrocery.in'};
  }
  updatePromo(); updateHelp(); renderCats(); renderProducts(); updateBadges();
  if (user) loadWishlist();
  if (!sessionStorage.getItem('offer_shown') && SETTINGS.offer_text) {
    setTimeout(() => { $('offer-popup-text').textContent = SETTINGS.offer_text; $('offer-popup').classList.remove('hidden'); sessionStorage.setItem('offer_shown','1'); }, 800);
  }
  if (!user) setTimeout(() => openLogin(), 1500);
}

function updatePromo() {
  const min = SETTINGS.min_order || 99;
  const free = SETTINGS.free_delivery_above || 299;
  $('promo-strip').innerHTML = `Min order ${fmt(min)} • Free delivery above ${fmt(free)} • ${SETTINGS.offer_text||''}`;
}
function updateHelp() {
  const ph = SETTINGS.helpline || '9876543210';
  const em = SETTINGS.email || 'support@snkgrocery.in';
  $('help-phone').href = 'tel:'+ph; $('help-phone-text').textContent = ph;
  $('help-email').href = 'mailto:'+em; $('help-email-text').textContent = em;
}

function calcCharges(sub) {
  const min = +SETTINGS.min_order || 99;
  const delBase = +SETTINGS.delivery_charge || 30;
  const freeAbove = +SETTINGS.free_delivery_above || 299;
  const offPct = +SETTINGS.offer_percent || 0;
  const offMin = +SETTINGS.offer_min || 9999;
  let delivery = sub >= freeAbove ? 0 : delBase;
  let discount = sub >= offMin ? Math.round(sub * offPct / 100) : 0;
  let total = sub + delivery - discount;
  return { sub, delivery, discount, total, min, ok: sub >= min };
}

function saveCart() { localStorage.setItem('snk_cart', JSON.stringify(cart)); updateBadges(); }
function updateBadges() {
  const n = cart.reduce((s,c)=>s+c.qty,0);
  const b = $('cart-badge');
  if (n>0){ b.textContent=n>99?'99+':n; b.classList.remove('hidden'); b.classList.add('flex'); }
  else { b.classList.add('hidden'); b.classList.remove('flex'); }
  const wb = $('wish-badge');
  if (wishlist.length){ wb.textContent=wishlist.length; wb.classList.remove('hidden'); wb.classList.add('flex'); }
  else { wb.classList.add('hidden'); }
}

function renderCats() {
  $('categories').innerHTML = CATS.map(c => `
    <button data-c="${c.id}" class="cat flex-shrink-0 flex flex-col items-center gap-0.5 min-w-[60px] py-1.5 px-1 rounded-xl text-[10px] font-medium
      ${cat===c.id?'bg-brand-600 text-white':'bg-white border text-gray-700'}">
      <span class="text-lg">${c.icon}</span>${c.name}
    </button>`).join('');
  document.querySelectorAll('.cat').forEach(b => b.onclick = () => { cat=b.dataset.c; renderCats(); renderProducts(); });
}

function renderProducts() {
  let list = PRODUCTS.slice();
  if (cat !== 'all') list = list.filter(p => p.category === cat);
  if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  $('product-count').textContent = list.length + ' items';
  const g = $('products-grid'), empty = $('no-results');
  if (!list.length){ g.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  g.innerHTML = list.map(p => {
    const inC = cart.find(c=>c.id==p.id); const qty = inC?inC.qty:0;
    const disc = p.mrp>p.price ? Math.round((1-p.price/p.mrp)*100) : 0;
    const wished = wishlist.some(w => w.product_id == p.id);
    return `<div class="bg-white rounded-xl border overflow-hidden shadow-sm flex flex-col">
      <div class="relative bg-gray-50 aspect-square flex items-center justify-center text-3xl">
        ${p.emoji}
        ${disc?`<span class="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1 rounded">${disc}%</span>`:''}
        <button onclick="toggleWish(${p.id})" class="absolute top-1 right-1 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center ${wished?'text-red-500':'text-gray-300'}">
          <i class="fas fa-heart text-xs"></i>
        </button>
      </div>
      <div class="p-2 flex-1 flex flex-col">
        <h3 class="text-[12px] font-medium leading-snug line-clamp-2">${p.name}</h3>
        <p class="text-[10px] text-gray-400">${p.unit} · ⭐ ${p.rating||'-'} (${p.rating_count||0})</p>
        <div class="mt-auto pt-1.5">
          <div class="flex items-baseline gap-1"><span class="font-bold text-sm">${fmt(p.price)}</span>
            ${p.mrp>p.price?`<span class="text-[10px] text-gray-400 line-through">${fmt(p.mrp)}</span>`:''}</div>
          ${qty===0
            ? `<button onclick="addCart(${p.id})" class="w-full mt-1.5 py-1 rounded-lg text-[11px] font-bold bg-brand-50 text-brand-700 border border-brand-200">ADD</button>`
            : `<div class="flex items-center justify-between bg-brand-600 text-white rounded-lg mt-1.5">
                <button onclick="chgQty(${p.id},-1)" class="px-2.5 py-1 font-bold">−</button>
                <span class="text-xs font-bold">${qty}</span>
                <button onclick="chgQty(${p.id},1)" class="px-2.5 py-1 font-bold">+</button></div>`}
          <button onclick="openReview(${p.id},'${p.name.replace(/'/g,"")}')" class="w-full mt-1 text-[10px] text-gray-400">Rate / Review</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function addCart(id){ const i=cart.find(c=>c.id==id); if(i)i.qty++; else cart.push({id,qty:1}); saveCart(); renderProducts(); }
function chgQty(id,d){ const i=cart.find(c=>c.id==id); if(!i)return; i.qty+=d; if(i.qty<=0)cart=cart.filter(c=>c.id!=id); saveCart(); renderProducts(); renderCart(); }

function renderCart(){
  const el=$('cart-items'), btn=$('btn-checkout');
  if(!cart.length){ el.innerHTML='<div class="text-center py-10 text-gray-400 text-sm">Cart is empty</div>'; btn.disabled=true; updateCartTotals(0); return; }
  btn.disabled=false;
  el.innerHTML=cart.map(c=>{
    const p=getP(c.id); if(!p)return'';
    return `<div class="flex gap-2.5 py-2.5 border-b border-gray-50">
      <div class="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-xl">${p.emoji}</div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate">${p.name}</p>
        <p class="text-[10px] text-gray-400">${p.unit} · ${fmt(p.price)}</p>
        <div class="flex justify-between items-center mt-1">
          <div class="flex items-center bg-gray-100 rounded-lg">
            <button onclick="chgQty(${p.id},-1)" class="px-2 py-0.5 text-sm font-bold">−</button>
            <span class="text-xs font-bold w-5 text-center">${c.qty}</span>
            <button onclick="chgQty(${p.id},1)" class="px-2 py-0.5 text-sm font-bold">+</button>
          </div>
          <span class="text-sm font-semibold">${fmt(p.price*c.qty)}</span>
        </div>
      </div></div>`;
  }).join('');
  const sub = cart.reduce((s,c)=>{const p=getP(c.id);return s+(p?p.price*c.qty:0);},0);
  updateCartTotals(sub);
}

function updateCartTotals(sub){
  const ch = calcCharges(sub);
  $('c-sub').textContent=fmt(ch.sub); $('c-del').textContent=ch.delivery?fmt(ch.delivery):'FREE';
  $('c-disc').textContent='-'+fmt(ch.discount); $('c-total').textContent=fmt(ch.total);
  $('c-disc-row').classList.toggle('hidden', !ch.discount);
  const msg=$('c-min-msg');
  if(!ch.ok){ msg.textContent=`Add ${fmt(ch.min-ch.sub)} more for minimum order`; msg.classList.remove('hidden'); $('btn-checkout').disabled=true; }
  else { msg.classList.add('hidden'); }
}

function openCart(){ renderCart(); $('cart-overlay').classList.remove('hidden'); $('cart-drawer').classList.remove('translate-y-full'); }
function closeCart(){ $('cart-overlay').classList.add('hidden'); $('cart-drawer').classList.add('translate-y-full'); }

function openCheckout(){
  if(!cart.length)return;
  if(!user){ openLogin(); return; }
  closeCart();
  const sub=cart.reduce((s,c)=>{const p=getP(c.id);return s+(p?p.price*c.qty:0);},0);
  const ch=calcCharges(sub);
  if(!ch.ok){ alert('Minimum order is '+fmt(ch.min)); return; }
  $('co-sub').textContent=fmt(ch.sub); $('co-del').textContent=ch.delivery?fmt(ch.delivery):'FREE';
  $('co-disc').textContent='-'+fmt(ch.discount); $('co-total').textContent=fmt(ch.total);
  document.querySelector('[name=phone]').value=user.phone||'';
  document.querySelector('[name=name]').value=user.name||'';
  $('checkout-modal').classList.remove('hidden');
}
function closeCheckout(){ $('checkout-modal').classList.add('hidden'); }

function useMyLocation(){
  const st=$('loc-status'); st.textContent='Getting location...';
  if(!navigator.geolocation){ st.textContent='Location not supported'; return; }
  navigator.geolocation.getCurrentPosition(pos=>{
    deliveryLat=pos.coords.latitude; deliveryLng=pos.coords.longitude;
    st.textContent=`📍 Location captured (${deliveryLat.toFixed(4)}, ${deliveryLng.toFixed(4)})`;
    const ta=document.querySelector('[name=address]');
    if(!ta.value) ta.value='Current location, Gundlupet';
  }, err=>{ st.textContent='Permission denied or unavailable. Please type address.'; }, {enableHighAccuracy:true,timeout:10000});
}

async function placeOrder(e){
  e.preventDefault();
  const fd=new FormData(e.target);
  const name=fd.get('name').trim(), phone=fd.get('phone').trim(), address=fd.get('address').trim();
  if(!/^\d{10}$/.test(phone)){ alert('Enter valid 10-digit mobile'); return; }
  user={name,phone}; localStorage.setItem('snk_user',JSON.stringify(user));
  const sub=cart.reduce((s,c)=>{const p=getP(c.id);return s+(p?p.price*c.qty:0);},0);
  const ch=calcCharges(sub);
  const items=cart.map(c=>{const p=getP(c.id);return {id:p.id,name:p.name,unit:p.unit,price:p.price,qty:c.qty};});
  const body={name,phone,address,lat:deliveryLat,lng:deliveryLng,payment:'COD',subtotal:ch.sub,delivery_charge:ch.delivery,discount:ch.discount,total:ch.total,items};
  try{
    const res=await fetch(API+'/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await res.json();
    cart=[]; saveCart(); closeCheckout(); e.target.reset();
    $('success-oid').textContent=data.order_id; $('success-modal').classList.remove('hidden');
  }catch(err){ alert('Could not place order. Is the server running?'); }
}
function closeSuccess(){ $('success-modal').classList.add('hidden'); showPage('home'); }
function goOrders(){ $('success-modal').classList.add('hidden'); showPage('orders'); }

async function loadOrders(){
  const el=$('orders-list');
  if(!user){ el.innerHTML='<p class="text-center text-gray-400 text-sm py-10">Please login to see orders</p>'; return; }
  el.innerHTML='<p class="text-center text-gray-400 text-sm py-6">Loading...</p>';
  try{
    const orders=await fetch(API+'/api/orders?phone='+user.phone).then(r=>r.json());
    if(!orders.length){ el.innerHTML='<p class="text-center text-gray-400 text-sm py-10">No orders yet</p>'; return; }
    el.innerHTML=orders.map(o=>`
      <div class="bg-white rounded-xl border p-3 mb-2.5 shadow-sm">
        <div class="flex justify-between mb-1">
          <span class="font-bold text-sm text-brand-800">${o.order_id}</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${SCOLOR[o.status]||'bg-gray-100'}">${o.status}</span>
        </div>
        <p class="text-[11px] text-gray-400">${new Date(o.created_at).toLocaleString('en-IN')}</p>
        <p class="text-xs text-gray-600 mt-1">${fmt(o.total)} · ${(o.items||[]).length} items</p>
        <button onclick='openTrack(${JSON.stringify(o).replace(/'/g,"&#39;")})' class="w-full mt-2 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700">Track Order</button>
      </div>`).join('');
  }catch(e){ el.innerHTML='<p class="text-center text-red-400 text-sm">Could not load orders</p>'; }
}

function openTrack(o){
  const idx=FLOW.indexOf(o.status);
  const timeline=FLOW.map((s,i)=>{
    const done=i<=idx && o.status!=='Cancelled';
    return `<div class="flex gap-3 pb-4 relative">
      ${i<FLOW.length-1?`<div class="absolute left-[11px] top-6 bottom-0 w-0.5 ${done?'bg-brand-500':'bg-gray-200'}"></div>`:''}
      <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${done?'bg-brand-600 text-white':'bg-gray-200 text-gray-400'}">${done?'✓':i+1}</div>
      <div><p class="text-sm font-semibold ${i===idx?'text-brand-700':done?'text-gray-800':'text-gray-400'}">${s}</p></div>
    </div>`;
  }).join('');
  let items=o.items||[];
  $('track-content').innerHTML=`
    <p class="text-xs text-gray-400">Order ID</p><p class="font-bold text-brand-800 mb-3">${o.order_id}</p>
    ${timeline}
    <div class="border-t pt-3 mt-2">
      <p class="text-xs font-semibold text-gray-500 mb-1">ITEMS</p>
      ${items.map(i=>`<div class="flex justify-between text-sm py-0.5"><span>${i.qty}× ${i.name}</span><span>${fmt(i.price*i.qty)}</span></div>`).join('')}
      <div class="flex justify-between font-bold text-sm border-t mt-1 pt-1"><span>Total</span><span>${fmt(o.total)}</span></div>
    </div>
    <p class="text-xs text-gray-500 mt-3">${o.name} · ${o.phone}<br>${o.address}</p>`;
  $('track-modal').classList.remove('hidden');
  // Live location if out for delivery
  const mapEl=$('track-map');
  if(o.status==='Out for Delivery'){
    mapEl.classList.remove('hidden');
    setTimeout(()=>loadDeliveryLocation(o.order_id, o.lat, o.lng), 300);
  } else mapEl.classList.add('hidden');
}
function closeTrack(){ $('track-modal').classList.add('hidden'); if(trackMap){trackMap.remove();trackMap=null;} }

async function loadDeliveryLocation(oid, custLat, custLng){
  const mapEl=$('track-map');
  try{
    const loc=await fetch(API+'/api/orders/'+oid+'/location').then(r=>r.json());
    const lat=parseFloat(loc.lat)||parseFloat(custLat)||11.819;
    const lng=parseFloat(loc.lng)||parseFloat(custLng)||76.688;
    if(trackMap) trackMap.remove();
    trackMap=L.map(mapEl).setView([lat,lng],15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(trackMap);
    L.marker([lat,lng]).addTo(trackMap).bindPopup('Delivery partner').openPopup();
    if(custLat&&custLng) L.marker([parseFloat(custLat),parseFloat(custLng)],{title:'You'}).addTo(trackMap);
  }catch(e){ mapEl.innerHTML='<p class="text-center text-xs text-gray-400 py-8">Location not available yet</p>'; }
}

// Wishlist
async function loadWishlist(){
  if(!user) return;
  try{ wishlist=await fetch(API+'/api/wishlist?phone='+user.phone).then(r=>r.json()); }catch(e){ wishlist=[]; }
  updateBadges();
}
async function toggleWish(pid){
  if(!user){ openLogin(); return; }
  const exists=wishlist.some(w=>w.product_id==pid);
  if(exists){
    await fetch(API+`/api/wishlist?phone=${user.phone}&product_id=${pid}`,{method:'DELETE'});
    wishlist=wishlist.filter(w=>w.product_id!=pid);
  } else {
    await fetch(API+'/api/wishlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:user.phone,product_id:pid})});
    wishlist.push({phone:user.phone,product_id:String(pid)});
  }
  updateBadges(); renderProducts(); if(!$('page-wishlist').classList.contains('hidden')) renderWishlist();
}
function renderWishlist(){
  const ids=wishlist.map(w=>+w.product_id);
  const list=PRODUCTS.filter(p=>ids.includes(p.id));
  const g=$('wishlist-grid');
  if(!list.length){ g.innerHTML='<p class="col-span-2 text-center text-gray-400 text-sm py-10">Wishlist is empty</p>'; return; }
  g.innerHTML=list.map(p=>`
    <div class="bg-white rounded-xl border p-2 shadow-sm">
      <div class="text-3xl text-center py-3">${p.emoji}</div>
      <p class="text-xs font-medium truncate">${p.name}</p>
      <p class="text-sm font-bold">${fmt(p.price)}</p>
      <div class="flex gap-1 mt-1">
        <button onclick="addCart(${p.id})" class="flex-1 py-1 text-[10px] font-bold bg-brand-50 text-brand-700 rounded-lg">ADD</button>
        <button onclick="toggleWish(${p.id})" class="px-2 text-red-500"><i class="fas fa-heart"></i></button>
      </div>
    </div>`).join('');
}

// Login
function openLogin(){ $('login-modal').classList.remove('hidden'); if(user){$('login-phone').value=user.phone;$('login-name').value=user.name||'';} }
function closeLogin(){ $('login-modal').classList.add('hidden'); }
function doLogin(){
  const phone=$('login-phone').value.trim(), name=$('login-name').value.trim();
  if(!/^\d{10}$/.test(phone)){ alert('Enter valid 10-digit mobile'); return; }
  user={phone,name:name||'Customer'}; localStorage.setItem('snk_user',JSON.stringify(user));
  closeLogin(); loadWishlist(); showPage('account');
}
function logout(){ user=null; localStorage.removeItem('snk_user'); wishlist=[]; updateBadges(); showPage('account'); }

function renderAccount(){
  const el=$('account-content');
  if(user){
    el.innerHTML=`
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-lg">${(user.name||'U')[0]}</div>
        <div><p class="font-bold">${user.name||'Customer'}</p><p class="text-xs text-gray-500">${user.phone}</p></div>
      </div>
      <button onclick="logout()" class="w-full py-2.5 rounded-xl border text-sm font-medium text-red-600">Logout</button>
      <a href="admin.html" class="block mt-3 text-center text-xs text-gray-400">Admin Panel</a>
      <a href="delivery.html" class="block mt-1 text-center text-xs text-gray-400">Delivery Partner Login</a>`;
  } else {
    el.innerHTML=`<p class="text-sm text-gray-500 mb-3">Login to track orders, use wishlist & more.</p>
      <button onclick="openLogin()" class="w-full bg-brand-600 text-white py-2.5 rounded-xl font-semibold">Login / Sign up</button>`;
  }
}

// Reviews
function openReview(pid, name){
  if(!user){ openLogin(); return; }
  reviewPid=pid; reviewStars=5;
  $('review-pname').textContent=name;
  document.querySelectorAll('#star-row i').forEach((s,i)=>{ s.classList.toggle('text-yellow-400',i<5); s.classList.toggle('text-gray-300',i>=5); });
  $('review-modal').classList.remove('hidden');
}
function closeReview(){ $('review-modal').classList.add('hidden'); }
document.querySelectorAll('#star-row i').forEach(star=>{
  star.onclick=()=>{ reviewStars=+star.dataset.v;
    document.querySelectorAll('#star-row i').forEach((s,i)=>{ s.classList.toggle('text-yellow-400',i<reviewStars); s.classList.toggle('text-gray-300',i>=reviewStars); });
  };
});
async function submitReview(){
  await fetch(API+'/api/ratings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    product_id:reviewPid, product_name:$('review-pname').textContent, phone:user.phone, name:user.name, rating:reviewStars, comment:$('review-comment').value
  })});
  closeReview(); $('review-comment').value='';
  const pr=await fetch(API+'/api/products').then(r=>r.json()); PRODUCTS=pr.filter(p=>p.available); renderProducts();
  alert('Thank you for your review!');
}

function closeOffer(){ $('offer-popup').classList.add('hidden'); }

function showPage(page){
  ['home','orders','wishlist','help','account'].forEach(p=>$(`page-${p}`).classList.toggle('hidden',p!==page));
  document.querySelectorAll('.nav-btn').forEach(b=>{
    const on=b.dataset.page===page; b.classList.toggle('text-brand-600',on); b.classList.toggle('text-gray-400',!on);
  });
  if(page==='orders') loadOrders();
  if(page==='wishlist'){ loadWishlist().then(renderWishlist); }
  if(page==='account') renderAccount();
  if(page==='home'){ renderCats(); renderProducts(); }
}

// Events
$('btn-search').onclick=()=>{ const b=$('search-bar'); b.classList.toggle('hidden'); if(!b.classList.contains('hidden'))$('search-input').focus(); };
$('search-input').oninput=e=>{ search=e.target.value.trim(); renderProducts(); };
$('btn-cart').onclick=openCart;
$('btn-wish').onclick=()=>showPage('wishlist');
$('checkout-form').onsubmit=placeOrder;
document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>showPage(b.dataset.page));

init();
