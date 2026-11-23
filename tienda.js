/* Página del CLIENTE: tienda, carrito, pago con boleta y mis pedidos */
let P = null, CATS = [], PRODS = [], CART = JSON.parse(localStorage.getItem('cart') || '{}'), ENTREGA = 'domicilio', CAT = 0, Q = '';
const saveCart = () => { localStorage.setItem('cart', JSON.stringify(CART)); $('#cnt').textContent = Object.values(CART).reduce((a, c) => a + c.qty, 0); };
const lineas = () => Object.entries(CART).map(([id, c]) => ({ p: PRODS.find(x => x.id == id), ...c })).filter(l => l.p);
const subtotal = () => lineas().reduce((a, l) => a + l.p.precio * l.qty, 0);
const envio = () => ENTREGA === 'domicilio' && lineas().length ? 3 : 0;

async function init() {
  P = await guard('cliente'); if (!P) return;
  $('#who').textContent = P.nombre;
  CATS = await ok(sb.from('categorias').select('*').order('id'));
  PRODS = await ok(sb.from('productos').select('*').eq('disponible', true).order('id'));
  saveCart(); vista();
}
function vista() {
  const v = location.hash === '#pedidos' ? 'pedidos' : 'tienda';
  $$('[data-v]').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  v === 'pedidos' ? vistaPedidos() : vistaTienda();
}
window.addEventListener('hashchange', vista);

/* ---------- tienda ---------- */
function vistaTienda() {
  $('#app').innerHTML = `<div class="shop-hero"><div><h2>¡Hola, ${e(P.nombre.split(' ')[0])}! <span>2x1</span> en helados 🎉</h2><p>Elige tus favoritos, paga en línea y recibe tu boleta.</p></div></div>
    <div class="toolbar"><div class="searchbox">🔍<input id="q" placeholder="Buscar sabores…" value="${e(Q)}"></div>
    <div class="chips"><span class="chip ${!CAT ? 'on' : ''}" data-cat="0">Todos</span>${CATS.map(c => `<span class="chip ${CAT == c.id ? 'on' : ''}" data-cat="${c.id}">${c.emoji} ${e(c.nombre)}</span>`).join('')}</div></div>
    <div class="grid-p" id="grid"></div><div style="height:50px"></div>`;
  $('#q').oninput = ev => { Q = ev.target.value; grid(); };
  $$('[data-cat]').forEach(c => c.onclick = () => { CAT = +c.dataset.cat; vistaTienda(); });
  grid();
}
function grid() {
  const ps = PRODS.filter(p => (!CAT || p.categoria_id == CAT) && p.nombre.toLowerCase().includes(Q.toLowerCase()));
  $('#grid').innerHTML = ps.map(p => `<div class="pcard">${pimg(p)}<div class="pbody"><h3>${e(p.nombre)}</h3><p>${e(p.descripcion)}</p>
    <div class="row"><span class="price grow">${money(p.precio)}</span><button class="btn sm" data-opt="${p.id}">Agregar</button></div></div></div>`).join('') || '<p class="empty">No encontramos productos 😕</p>';
  $$('[data-opt]').forEach(b => b.onclick = () => opciones(+b.dataset.opt));
}
function opciones(id) {
  const p = PRODS.find(x => x.id === id);
  const chips = (n, list, def) => `<div class="chips">${list.map(t => `<label class="chip"><input type="radio" name="${n}" value="${t}" ${t === def ? 'checked' : ''}>${t}</label>`).join('')}</div>`;
  const m = openModal(`<div class="row" style="margin-bottom:10px"><div style="width:90px">${pimg(p)}</div><div><h2 style="margin:0">${e(p.nombre)}</h2><span class="price">${money(p.precio)}</span></div></div>
    <p class="muted" style="margin-bottom:12px">${e(p.descripcion)}</p>
    <form class="form"><div><b>Sabor o topping</b>${chips('topping', ['🌿 Menta', '🍫 Chocolate', '✨ Chispas', '🌰 Almendras'], '🌿 Menta')}</div>
    <div><b>Tamaño</b>${chips('tamano', ['Pequeño', 'Mediano', 'Grande'], 'Mediano')}</div>
    <div class="row"><b class="grow">Cantidad</b><div class="stepper"><button type="button" data-d="-1">−</button><b id="q1">1</b><button type="button" class="p" data-d="1">+</button></div></div>
    <button class="btn block">🛒 Agregar al carrito</button></form>`);
  let q = 1; $$('[data-d]', m).forEach(b => b.onclick = () => { q = Math.max(1, q + +b.dataset.d); $('#q1', m).textContent = q; });
  $('form', m).onsubmit = ev => { ev.preventDefault(); const fd = new FormData(ev.target);
    CART[id] = { qty: (CART[id]?.qty || 0) + q, nota: [fd.get('tamano'), fd.get('topping')].join(' · ') }; saveCart(); m.remove(); toast('Agregado al carrito 🛒'); };
}

/* ---------- carrito ---------- */
function carrito() {
  const ls = lineas();
  const m = openModal(`<h2>🛒 Mi carrito</h2>${ls.length ? `
    ${ls.map(l => `<div class="line">${thumb(l.p)}<div class="grow"><b>${e(l.p.nombre)}</b><br><small class="muted">${e(l.nota || '')} · ${money(l.p.precio)}</small></div>
      <div class="stepper"><button data-m="${l.p.id}">−</button><b>${l.qty}</b><button class="p" data-p="${l.p.id}">+</button></div><button class="stepper" style="border:0;background:none;cursor:pointer;font-size:18px" data-x="${l.p.id}">🗑</button></div>`).join('')}
    <h3 style="margin:16px 0 8px">Método de entrega</h3>
    <label class="pay"><input type="radio" name="ent" value="domicilio" ${ENTREGA === 'domicilio' ? 'checked' : ''}>🛵 <span><b>A domicilio</b><br><small class="muted">+ S/ 3.00 de delivery</small></span></label>
    <label class="pay" style="margin-top:8px"><input type="radio" name="ent" value="tienda" ${ENTREGA === 'tienda' ? 'checked' : ''}>🏪 <span><b>Recoger en tienda</b><br><small class="muted">Sin costo</small></span></label>
    <div style="margin:16px 0"><div class="tot"><span>Subtotal</span><span>${money(subtotal())}</span></div><div class="tot"><span>Delivery</span><span>${money(envio())}</span></div><div class="tot big"><span>Total</span><span>${money(subtotal() + envio())}</span></div></div>
    <button class="btn block" id="pagar">Ir a pagar →</button>` : '<div class="empty">Tu carrito está vacío 🍦<br><br><button class="btn" data-close>Ver helados</button></div>'}`, '', 'drawer-wrap');
  const re = () => { m.remove(); carrito(); };
  $$('[data-p]', m).forEach(b => b.onclick = () => { CART[b.dataset.p].qty++; saveCart(); re(); });
  $$('[data-m]', m).forEach(b => b.onclick = () => { if (--CART[b.dataset.m].qty < 1) delete CART[b.dataset.m]; saveCart(); re(); });
  $$('[data-x]', m).forEach(b => b.onclick = () => { delete CART[b.dataset.x]; saveCart(); re(); });
  $$('[name=ent]', m).forEach(r => r.onchange = () => { ENTREGA = r.value; re(); });
  $('#pagar', m)?.addEventListener('click', () => { m.remove(); pago(); });
}
$('#btnCart').onclick = carrito;

/* ---------- pago + boleta ---------- */
function pago() {
  const ls = lineas(); if (!ls.length) return;
  const m = openModal(`<h2>💳 Finalizar compra</h2><div id="pmsg"></div>
    <form class="form">
      <div class="grid2"><label class="field">Nombre<input value="${e(P.nombre)}" disabled></label><label class="field">DNI (para la boleta)<input name="dni" inputmode="numeric" maxlength="8" value="${e(localStorage.getItem('dni') || '')}" placeholder="Opcional"></label></div>
      <label class="field">Correo para recibir la boleta<input type="email" name="email" required value="${e(P.email)}"></label>
      ${ENTREGA === 'domicilio' ? '<label class="field">Dirección de entrega<input name="direccion" required placeholder="Calle, número, distrito" value="Calle 123 #45-67, Ciudad"></label>' : '<div class="okmsg">🏪 Recogerás tu pedido en nuestra heladería</div>'}
      <b>Forma de pago</b>
      ${Object.entries(PAGOS).map(([k, n]) => `<label class="pay"><input type="radio" name="pago" value="${k}" ${k === 'efectivo' ? 'checked' : ''}>${{ efectivo: '💵', yape: '📱', tarjeta: '💳' }[k]} <b>${n}</b></label>`).join('')}
      <div id="tarjeta" hidden class="form"><small class="muted">Pago simulado: no se guarda ningún dato de tarjeta.</small>
        <input class="inp" placeholder="Número de tarjeta" inputmode="numeric" maxlength="19"><div class="grid2"><input class="inp" placeholder="MM/AA" maxlength="5"><input class="inp" placeholder="CVV" maxlength="4" inputmode="numeric"></div></div>
      <div id="yape" hidden class="okmsg">📱 Yapea al <b>${e(EMPRESA.telefono)}</b> a nombre de ${e(EMPRESA.nombre)} (simulado).</div>
      <div><div class="tot"><span>Subtotal</span><span>${money(subtotal())}</span></div><div class="tot"><span>Delivery</span><span>${money(envio())}</span></div><div class="tot big"><span>Total</span><span>${money(subtotal() + envio())}</span></div></div>
      <label class="check"><input type="checkbox" name="enviar" checked> Enviarme la boleta por correo</label>
      <button class="btn block">Pagar ${money(subtotal() + envio())}</button></form>`, 'wide');
  const f = $('form', m);
  $$('[name=pago]', f).forEach(r => r.onchange = () => { $('#tarjeta', f).hidden = r.value !== 'tarjeta' || !r.checked; $('#yape', f).hidden = r.value !== 'yape' || !r.checked; if (r.checked) { $('#tarjeta', f).hidden = r.value !== 'tarjeta'; $('#yape', f).hidden = r.value !== 'yape'; } });
  f.onsubmit = async ev => {
    ev.preventDefault(); const fd = new FormData(f), btn = $('button.btn', f); btn.disabled = true; btn.textContent = 'Procesando pago…';
    try {
      await new Promise(r => setTimeout(r, 900));                       // simulación del pago
      const its = lineas().map(l => ({ id: l.p.id, cantidad: l.qty, nota: l.nota }));
      const id = await ok(sb.rpc('crear_pedido', { p_tipo: ENTREGA, p_direccion: ENTREGA === 'domicilio' ? fd.get('direccion').trim() : '', p_pago: fd.get('pago'), p_origen: 'web', p_items: its, p_documento: (fd.get('dni') || '').trim(), p_email: fd.get('email').trim() }));
      if (fd.get('dni')) localStorage.setItem('dni', fd.get('dni'));
      CART = {}; saveCart(); closeModals();
      const b = await cargarBoleta(id); let aviso = '<div class="okmsg">✅ ¡Pago realizado! Tu pedido ya se está preparando.</div>';
      if (fd.get('enviar') && emailConfigurado()) { try { await enviarBoleta(b, b.email); aviso += `<div class="okmsg" style="margin-top:8px">✉ Enviamos la boleta a ${e(b.email)}</div>`; } catch (er) { aviso += `<div class="err" style="margin-top:8px">${e(er.message)}</div>`; } }
      mostrarBoleta(b, '🧾 Tu boleta electrónica', aviso);
      location.hash = '#pedidos';
    } catch (er) { btn.disabled = false; btn.textContent = 'Pagar'; $('#pmsg', m).innerHTML = `<div class="err">${e(er.message)}</div>`; }
  };
}

/* ---------- mis pedidos ---------- */
async function vistaPedidos() {
  $('#app').innerHTML = '<p class="empty">Cargando pedidos…</p>';
  const ps = await ok(sb.from('pedidos').select('*, pedido_items(nombre,cantidad)').eq('cliente_id', P.id).order('id', { ascending: false }));
  $('#app').innerHTML = `<h1 style="margin:26px 0 16px">🧾 Mis pedidos</h1>` + (ps.map(p => {
    const c = ORDEN.indexOf(p.estado);
    return `<div class="ped"><div class="row wrap"><b class="grow">Pedido #${p.id} · ${fecha(p.creado)}</b>${tagE(p.estado)}</div>
      <p class="muted" style="margin:6px 0">${p.pedido_items.map(i => i.cantidad + ' x ' + e(i.nombre)).join(', ')}</p>
      <div class="track">${ORDEN.map((s, i) => `<div class="${i < c || p.estado === 'entregado' ? 'done' : i === c ? 'now' : ''}"><span>${i < c || p.estado === 'entregado' ? '✓' : i + 1}</span>${ESTADOS[s]}</div>`).join('')}</div>
      <div class="row wrap" style="margin-top:10px"><b class="price grow">${money(p.total)}</b><button class="btn sm" data-bol="${p.id}">🧾 Ver boleta</button></div></div>`;
  }).join('') || '<div class="empty">Aún no tienes pedidos 🍦<br><br><a class="btn" href="#tienda">Ir a la tienda</a></div>');
  $$('[data-bol]').forEach(b => b.onclick = async () => mostrarBoleta(await cargarBoleta(b.dataset.bol)));
}
init().catch(er => { $('#app').innerHTML = `<div class="err">${e(er.message)}</div>`; });
