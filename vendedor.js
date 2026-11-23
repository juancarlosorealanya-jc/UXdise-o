/* Página del EMPLEADO (vendedor): pedidos por estado, venta de mostrador con boleta y ventas del día */
let P = null, PRODS = [], TICKET = {};
const V = { pedidos, venta, ventas };
const sig = s => ORDEN[Math.min(ORDEN.indexOf(s) + 1, ORDEN.length - 1)];

async function init() {
  P = await guard('vendedor'); if (!P) return;
  $('#who').textContent = P.nombre;
  PRODS = await ok(sb.from('productos').select('*').eq('disponible', true).order('categoria_id').order('id'));
  $$('[data-v]').forEach(a => a.onclick = () => { location.hash = '#' + a.dataset.v; });
  window.addEventListener('hashchange', ir); ir();
}
async function ir() {
  const v = V[location.hash.slice(1)] ? location.hash.slice(1) : 'pedidos';
  $$('[data-v]').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  $('#app').innerHTML = '<p class="empty">Cargando…</p>';
  try { await V[v](); } catch (er) { $('#app').innerHTML = `<div class="err">${e(er.message)}</div>`; }
}

/* ---------- pedidos (tablero por estado) ---------- */
async function pedidos() {
  const ps = await ok(sb.from('pedidos').select('*, pedido_items(nombre,cantidad)').neq('origen', 'mostrador').order('id', { ascending: false }).limit(200));
  $('#app').innerHTML = `<h1>📋 Pedidos</h1><p class="sub">Avanza cada pedido de estado cuando esté listo.</p>
    <div class="kan">${ORDEN.map(k => { const l = ps.filter(p => p.estado === k); return `<div class="col"><h3><span>${ESTADOS[k]}</span><span class="badge">${l.length}</span></h3>
      ${l.map(p => `<div class="kc"><b>#${p.id} · ${e(p.cliente_nombre || 'Cliente')}</b><span class="muted">${p.pedido_items.map(i => i.cantidad + ' x ' + e(i.nombre)).join(', ')}</span>
        <div style="margin:6px 0"><span class="tag gray">${p.tipo === 'domicilio' ? '🛵 Delivery' : '🏪 En tienda'}</span> <b>${money(p.total)}</b></div>
        ${p.tipo === 'domicilio' && p.direccion ? `<small class="muted">📍 ${e(p.direccion)}</small><br>` : ''}
        <div class="row" style="margin-top:8px"><button class="btn out sm" data-bol="${p.id}">🧾</button>${k !== 'entregado' ? `<button class="btn sm grow" data-adv="${p.id}" data-est="${k}">${k === 'en_camino' ? 'Entregado' : 'Listo'} → ${ESTADOS[sig(k)]}</button>` : ''}</div></div>`).join('') || '<small class="muted">Sin pedidos</small>'}</div>`; }).join('')}</div>`;
  $$('[data-adv]').forEach(b => b.onclick = async () => { const { error } = await sb.from('pedidos').update({ estado: sig(b.dataset.est), vendedor_id: P.id }).eq('id', b.dataset.adv); toast(error ? 'No se pudo actualizar' : 'Pedido actualizado ✅'); ir(); });
  $$('[data-bol]').forEach(b => b.onclick = async () => mostrarBoleta(await cargarBoleta(b.dataset.bol), '🧾 Boleta'));
}

/* ---------- nueva venta (mostrador) ---------- */
async function venta() {
  $('#app').innerHTML = `<h1>💰 Nueva venta</h1><p class="sub">Toca un producto para agregarlo y emite la boleta.</p>
    <div class="pos"><div class="grid-p" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">${PRODS.map(p => `<div class="pcard" style="cursor:pointer" data-add="${p.id}"><div class="pimg" style="height:90px;font-size:48px">${p.imagen ? `<img src="${e(p.imagen)}" alt="">` : e(p.emoji)}</div><div class="pbody"><h3 style="font-size:15px">${e(p.nombre)}</h3><span class="price">${money(p.precio)}</span></div></div>`).join('')}</div>
    <div class="panel ticket"><h3>🧾 Ticket</h3><div id="tk"></div>
      <form id="fv" class="form" style="margin-top:12px"><input class="inp" name="cliente" placeholder="Nombre del cliente (opcional)"><div class="grid2"><input class="inp" name="dni" placeholder="DNI (opcional)" inputmode="numeric" maxlength="8"><input class="inp" name="email" type="email" placeholder="Correo (opcional)"></div>
      <div class="chips">${Object.entries(PAGOS).map(([k, n]) => `<label class="chip"><input type="radio" name="pago" value="${k}" ${k === 'efectivo' ? 'checked' : ''}>${n}</label>`).join('')}</div>
      <div id="vmsg"></div><button class="btn block">🧾 Emitir boleta</button></form></div></div>`;
  $$('[data-add]').forEach(c => c.onclick = () => { TICKET[c.dataset.add] = (TICKET[c.dataset.add] || 0) + 1; ticket(); });
  $('#fv').onsubmit = async ev => {
    ev.preventDefault(); const fd = new FormData(ev.target), its = Object.entries(TICKET).map(([id, q]) => ({ id: +id, cantidad: q, nota: '' }));
    if (!its.length) { $('#vmsg').innerHTML = '<div class="err">Agrega al menos un producto</div>'; return; }
    const btn = $('button.btn', ev.target); btn.disabled = true;
    try {
      const id = await ok(sb.rpc('crear_pedido', { p_tipo: 'tienda', p_direccion: '', p_pago: fd.get('pago'), p_origen: 'mostrador', p_items: its, p_cliente: fd.get('cliente') || '', p_documento: fd.get('dni') || '', p_email: fd.get('email') || '' }));
      TICKET = {}; const b = await cargarBoleta(id); mostrarBoleta(b, '✅ Venta registrada'); venta();
    } catch (er) { btn.disabled = false; $('#vmsg').innerHTML = `<div class="err">${e(er.message)}</div>`; }
  };
  ticket();
}
function ticket() {
  const ls = Object.entries(TICKET).map(([id, q]) => ({ p: PRODS.find(x => x.id == id), q })).filter(l => l.p);
  const t = ls.reduce((a, l) => a + l.p.precio * l.q, 0);
  $('#tk').innerHTML = (ls.map(l => `<div class="line"><div class="grow"><b>${e(l.p.nombre)}</b><br><small class="muted">${money(l.p.precio)}</small></div><div class="stepper"><button data-m="${l.p.id}">−</button><b>${l.q}</b><button class="p" data-p="${l.p.id}">+</button></div></div>`).join('') || '<p class="empty" style="padding:14px">Ticket vacío</p>') + `<div class="tot big"><span>Total</span><span>${money(t)}</span></div>`;
  $$('[data-p]', $('#tk')).forEach(b => b.onclick = () => { TICKET[b.dataset.p]++; ticket(); });
  $$('[data-m]', $('#tk')).forEach(b => b.onclick = () => { if (--TICKET[b.dataset.m] < 1) delete TICKET[b.dataset.m]; ticket(); });
}

/* ---------- ventas del día ---------- */
async function ventas() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const ps = await ok(sb.from('pedidos').select('*').gte('creado', hoy.toISOString()).order('id', { ascending: false }));
  $('#app').innerHTML = `<h1>🧾 Ventas del día</h1><p class="sub">Todas las boletas emitidas hoy.</p>
    <div class="kpis"><div class="kpi"><span>Boletas emitidas</span><b>${ps.length}</b></div><div class="kpi"><span>Total vendido</span><b>${money(ps.reduce((a, p) => a + +p.total, 0))}</b></div></div>
    <div class="panel tw"><table><tr><th>Boleta</th><th>Hora</th><th>Cliente</th><th>Origen</th><th>Pago</th><th>Total</th><th></th></tr>
    ${ps.map(p => `<tr><td><b>${EMPRESA.serie}-${String(p.id).padStart(6, '0')}</b></td><td>${new Date(p.creado).toLocaleTimeString('es-PE', { timeStyle: 'short' })}</td><td>${e(p.cliente_nombre || '—')}</td><td>${p.origen === 'web' ? '🌐 Web' : '🏪 Mostrador'}</td><td>${PAGOS[p.pago]}</td><td><b>${money(p.total)}</b></td><td><button class="btn sm" data-bol="${p.id}">🧾 Ver</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Aún no hay ventas hoy</td></tr>'}</table></div>`;
  $$('[data-bol]').forEach(b => b.onclick = async () => mostrarBoleta(await cargarBoleta(b.dataset.bol), '🧾 Boleta'));
}
init().catch(er => { $('#app').innerHTML = `<div class="err">${e(er.message)}</div>`; });
