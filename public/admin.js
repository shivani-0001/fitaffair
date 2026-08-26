let KEY=sessionStorage.getItem("fa-admin-key")||"", DATA=null;
const $=x=>document.querySelector(x);
function login(){
  KEY=$("#adminKey").value.trim(); if(!KEY)return;
  sessionStorage.setItem("fa-admin-key",KEY); loadAdmin();
}
function logout(){sessionStorage.removeItem("fa-admin-key");location.reload()}
async function api(url,opts={}){
  opts.headers={...(opts.headers||{}),"x-admin-key":KEY};
  const r=await fetch(url,opts); const d=await r.json().catch(()=>({}));
  if(r.status===401){sessionStorage.removeItem("fa-admin-key");location.reload()}
  if(!r.ok)throw new Error(d.error||"Request failed"); return d;
}
async function loadAdmin(){
  try{DATA=await api("/api/admin/data");$("#login").classList.add("hidden");$("#dashboard").classList.remove("hidden");renderAll()}
  catch(e){sessionStorage.removeItem("fa-admin-key");$("#login").classList.remove("hidden")}
}
function renderAll(){renderStats();renderRecent();renderProducts();renderOrders();fillSettings()}
function renderStats(){
  $("#statProducts").textContent=DATA.products.length;
  $("#statOrders").textContent=DATA.orders.length;
  $("#statRevenue").textContent=money(DATA.orders.filter(o=>o.status!=="Cancelled").reduce((a,o)=>a+Number(o.total),0));
  $("#statNew").textContent=DATA.orders.filter(o=>o.status==="New").length;
}
function renderRecent(){
  $("#recentOrders").innerHTML=DATA.orders.slice(0,6).map(orderRow).join("")||"<p style='color:#888'>No orders yet.</p>";
}
function renderProducts(){
  $("#productsTable").innerHTML=`<table class="table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Featured</th><th></th></tr></thead><tbody>
  ${DATA.products.map(p=>`<tr><td><div style="display:flex;gap:10px;align-items:center">${p.image?`<img class="mini" src="${esc(p.image)}">`:""}<b>${esc(p.name)}</b></div></td><td>${esc(p.category)}</td><td>${money(p.price)}</td><td>${p.stock}</td><td>${p.featured?"Yes":"No"}</td><td class="table-actions"><button class="small-btn" onclick="editProduct(${p.id})">Edit</button><button class="small-btn danger" onclick="deleteProduct(${p.id})">Delete</button></td></tr>`).join("")}
  </tbody></table>`;
}
function renderOrders(){
  $("#ordersTable").innerHTML=`<table class="table"><thead><tr><th>#</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>
  ${DATA.orders.map(o=>`<tr><td>#${o.id}</td><td><b>${esc(o.customer_name)}</b><br><small>${esc(o.phone)}</small><br><small>${esc(o.address)}</small></td><td class="order-items">${o.items.map(i=>`${esc(i.name)} × ${i.qty}`).join("<br>")}</td><td><b>${money(o.total)}</b></td><td><select onchange="setOrderStatus(${o.id},this.value)">${["New","Confirmed","Packed","Shipped","Delivered","Cancelled"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select></td><td>${new Date(o.created_at).toLocaleString()}</td></tr>`).join("")}
  </tbody></table>`;
}
function orderRow(o){return `<div style="display:flex;justify-content:space-between;gap:15px;padding:14px 0;border-bottom:1px solid var(--line)"><div><b>#${o.id} · ${esc(o.customer_name)}</b><small style="display:block;color:#888">${esc(o.phone)}</small></div><div><b>${money(o.total)}</b><span class="status" style="margin-left:8px">${o.status}</span></div></div>`}
function showTab(id,btn){document.querySelectorAll(".tab").forEach(x=>x.classList.add("hidden"));$("#"+id).classList.remove("hidden");document.querySelectorAll(".side").forEach(x=>x.classList.remove("active"));btn.classList.add("active")}
function fillSettings(){const s=DATA.settings;const f=$("#settingsForm");for(const [k,v] of Object.entries(s)){const el=f.elements[k];if(!el)continue;if(el.type==="checkbox")el.checked=!!v;else el.value=v}}
$("#settingsForm").addEventListener("submit",async e=>{
 e.preventDefault();const f=new FormData(e.target);const data=Object.fromEntries(f.entries());data.dark_mode=f.get("dark_mode")?1:0;await api("/api/admin/settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});DATA=await api("/api/admin/data");renderAll();alert("Website updated.");
});
function newProduct(){fillProduct({});$("#productDialogTitle").textContent="Add product";$("#productDialog").showModal()}
function fillProduct(p){const f=$("#productForm");f.reset();for(const [k,v] of Object.entries(p)){const el=f.elements[k];if(!el)continue;if(el.type==="checkbox")el.checked=!!v;else el.value=v??""}}
function editProduct(id){const p=DATA.products.find(x=>x.id===id);fillProduct(p);$("#productDialogTitle").textContent="Edit product";$("#productDialog").showModal()}
$("#productForm").addEventListener("submit",async e=>{
 e.preventDefault();const f=e.target;const data=Object.fromEntries(new FormData(f).entries());data.featured=f.elements.featured.checked?1:0;
 const file=$("#imageFile").files[0];if(file){const fd=new FormData();fd.append("image",file);const up=await api("/api/admin/upload",{method:"POST",body:fd});data.image=up.url}
 const id=data.id;delete data.id;await api(id?`/api/admin/products/${id}`:"/api/admin/products",{method:id?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
 $("#productDialog").close();DATA=await api("/api/admin/data");renderAll();alert("Product saved.");
});
async function deleteProduct(id){if(!confirm("Delete this product?"))return;await api(`/api/admin/products/${id}`,{method:"DELETE"});DATA=await api("/api/admin/data");renderAll()}
async function setOrderStatus(id,status){await api(`/api/admin/orders/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});DATA=await api("/api/admin/data");renderStats();renderRecent()}
const money=n=>"₹"+Number(n).toLocaleString("en-IN");
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
if(KEY)loadAdmin();
