let store={settings:{},products:[]}, cart=JSON.parse(localStorage.getItem("fa-cart")||"[]");

const money=n=>"₹"+Number(n).toLocaleString("en-IN");
async function loadStore(){
  const r=await fetch("/api/store"); store=await r.json();
  applySettings(); renderFilters(); renderProducts(); renderCart();
}
function applySettings(){
  const s=store.settings;
  document.documentElement.style.setProperty("--accent",s.accent||"#8B5CF6");
  document.title=s.brand_name;
  $("#announcement").textContent=s.announcement;
  $("#brandName").textContent=s.brand_name.split(" Nutrition")[0] || s.brand_name;
  $("#footerBrand").textContent=s.brand_name;
  $("#phoneLink").textContent=s.phone;
  $("#phoneLink").href="tel:"+s.phone.replace(/\s/g,"");
  $("#heroBadge").textContent=s.hero_badge;
  $("#heroTitle").innerHTML=(s.hero_title||"").replace(/\.(?=\s|$)/g,".<br>");
  $("#heroSubtitle").textContent=s.hero_subtitle;
  $("#year").textContent=new Date().getFullYear();
}
function renderFilters(){
  const cats=["All",...new Set(store.products.map(p=>p.category))];
  $("#filters").innerHTML=cats.map((c,i)=>`<button class="filter ${i===0?"active":""}" onclick="filterProducts('${esc(c)}',this)">${esc(c)}</button>`).join("");
}
function filterProducts(cat,btn){
  document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active")); btn.classList.add("active");
  renderProducts(cat);
}
function renderProducts(cat="All"){
  const list=cat==="All"?store.products:store.products.filter(p=>p.category===cat);
  $("#productGrid").innerHTML=list.map(p=>`
  <article class="product">
    <div class="product-img">
      ${p.badge?`<span class="badge">${esc(p.badge)}</span>`:""}
      ${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}">`:`<div class="fake-product"><div>FA<br>${esc(p.category).toUpperCase()}<small>PREMIUM</small></div></div>`}
    </div>
    <div class="product-info">
      <h3>${esc(p.name)}</h3><p>${esc(p.description||"Premium nutrition product from Fitt Affair Nutrition.")}</p>
      <div class="price"><strong>${money(p.price)}</strong>${p.old_price?`<del>${money(p.old_price)}</del>`:""}</div>
      <button class="btn primary add" onclick="addToCart(${p.id})">Add to bag</button>
    </div>
  </article>`).join("");
}
function addToCart(id){ const x=cart.find(i=>i.id===id); if(x)x.qty++; else cart.push({id,qty:1}); saveCart(); renderCart(); toggleCart(true); }
function saveCart(){localStorage.setItem("fa-cart",JSON.stringify(cart))}
function renderCart(){
  $("#cartCount").textContent=cart.reduce((a,x)=>a+x.qty,0);
  let total=0;
  $("#cartItems").innerHTML=cart.length?cart.map(i=>{
    const p=store.products.find(x=>x.id===i.id); if(!p)return "";
    total+=p.price*i.qty;
    return `<div class="cart-line"><div><b>${esc(p.name)}</b><small>${money(p.price)} each</small></div><div class="qty"><button onclick="changeQty(${p.id},-1)">−</button><span>${i.qty}</span><button onclick="changeQty(${p.id},1)">+</button></div></div>`;
  }).join(""):`<p style="color:#888">Your bag is empty.</p>`;
  $("#cartTotal").textContent=money(total);
}
function changeQty(id,d){const x=cart.find(i=>i.id===id);if(!x)return;x.qty+=d;if(x.qty<=0)cart=cart.filter(i=>i.id!==id);saveCart();renderCart()}
function toggleCart(force){$("#cart").classList.toggle("open",force===true?!0:force===false?!1:!$("#cart").classList.contains("open"));$("#overlay").classList.toggle("show",$("#cart").classList.contains("open"))}
function openCheckout(){if(!cart.length)return alert("Add a product first.");checkoutDialog.showModal()}
$("#checkoutForm").addEventListener("submit",async e=>{
 e.preventDefault(); const f=new FormData(e.target);
 const payload={customer_name:f.get("customer_name"),phone:f.get("phone"),address:f.get("address"),items:cart};
 const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 const data=await r.json(); if(!r.ok)return alert(data.error||"Order failed");
 cart=[];saveCart();renderCart();checkoutDialog.close();toggleCart(false);e.target.reset();
 alert(`Order #${data.orderId} placed successfully. Total: ${money(data.total)}`);
});
function $(x){return document.querySelector(x)}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
loadStore();
