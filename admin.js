/* Página del ADMINISTRADOR: resumen, productos, pedidos/boletas y roles de usuarios */
let P = null, CATS = [], FILTRO = '';
const V = { resumen, productos, pedidos, usuarios };

async function init() {
  P = await guard('admin'); if (!P) return;
  $('#who').textContent = P.nombre;
  CATS = await ok(sb.from('categorias').select('*').order('id'));
  $$('[data-v]').forEach(a => a.onclick = () => { location.hash = '#' + a.dataset.v; });
  window.addEventListener('hashchange', ir); ir();
}
async function ir() {
  const v = V[location.hash.slice(1)] ? location.hash.slice(1) : 'resumen';
  $$('[data-v]').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  $('#app').innerHTML = '<p class="empty">Cargando…</p>';
  try { await V[v](); } catch (er) { $('#app').innerHTML = `<div class="err">${e(er.message)}</div>`; }
}

/* ---------- resumen ---------- */
async function resumen() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const ps = await ok(sb.from('pedidos').select('id,estado,total,creado,cliente_nombre,origen').order('id', { ascending: false }).limit(1000));
  const nProd = (await ok(sb.from('productos').select('id'))).length;
  const nCli = (await ok(sb.from('perfiles').select('id').eq('rol', 'cliente'))).length;
  const delHoy = ps.filter(p => new Date(p.creado) >= hoy);
  const dias = [...Array(7)].map((_, i) => { const d = new Date(hoy); d.setDate(d.getDate() - (6 - i)); const n = new Date(d); n.setDate(n.getDate() + 1); return { l: d.toLocaleDateString('es-PE', { weekday: 'short' }), t: ps.filter(p => new Date(p.creado) >= d && new Date(p.creado) < n).reduce((a, p) => a + +p.total, 0) }; });
  const max = Math.max(...dias.map(d => d.t), 1), cnt = k => ps.filter(p => p.estado === k).length;
  $('#app').innerHTML = `<h1>📊 Resumen</h1><p class="sub">Así va la heladería hoy.</p>
    <div class="kpis"><div class="kpi"><span>Ventas de hoy</span><b>${money(delHoy.reduce((a, p) => a + +p.total, 0))}</b></div><div class="kpi"><span>Pedidos de hoy</span><b>${delHoy.length}</b></div><div class="kpi"><span>Productos</span><b>${nProd}</b></div><div class="kpi"><span>Clientes</span><b>${nCli}</b></div></div>
    <div class="two"><div class="panel"><h3>Ventas de los últimos 7 días</h3><div class="bars">${dias.map(d => `<div><b>${d.t ? Math.round(d.t) : ''}</b><i style="height:${Math.max(4, d.t / max * 110)}px"></i>${d.l}</div>`).join('')}</div></div>
    <div class="panel"><h3>Pedidos por estado</h3>${ORDEN.map(k => `<div class="hbar"><div class="t"><span>${ESTADOS[k]}</span><b>${cnt(k)}</b></div><div class="b"><i style="width:${ps.length ? cnt(k) / ps.length * 100 : 0}%"></i></div></div>`).join('')}</div></div>
    <div class="panel"><h3>Últimos pedidos</h3><div class="tw"><table><tr><th>N.°</th><th>Cliente</th><th>Total</th><th>Estado</th></tr>${ps.slice(0, 6).map(p => `<tr><td>#${p.id}</td><td>${e(p.cliente_nombre || '—')}</td><td>${money(p.total)}</td><td>${tagE(p.estado)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Aún no hay pedidos</td></tr>'}</table></div></div>`;
}

/* ---------- productos ---------- */
async function productos() {
  const ps = await ok(sb.from('productos').select('*, categorias(nombre)').order('id', { ascending: false }));
  $('#app').innerHTML = `<div class="row wrap"><div class="grow"><h1>🍦 Productos</h1><p class="sub">Agrega, edita o elimina productos del menú.</p></div><button class="btn" id="nuevo">＋ Nuevo producto</button></div>
    <div class="panel tw"><table><tr><th></th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Disponible</th><th></th></tr>
    ${ps.map(p => `<tr><td>${thumb(p)}</td><td><b>${e(p.nombre)}</b><br><small class="muted">${e(p.descripcion)}</small></td><td>${e(p.categorias?.nombre)}</td><td><b>${money(p.precio)}</b></td>
      <td><label class="switch"><input type="checkbox" data-disp="${p.id}" ${p.disponible ? 'checked' : ''}><i></i></label></td>
      <td style="white-space:nowrap"><button class="btn out sm" data-ed="${p.id}">✏ Editar</button> <button class="btn danger sm" data-del="${p.id}">🗑</button></td></tr>`).join('')}</table></div>`;
  $('#nuevo').onclick = () => formProducto();
  $$('[data-ed]').forEach(b => b.onclick = () => formProducto(ps.find(p => p.id == b.dataset.ed)));
  $$('[data-del]').forEach(b => b.onclick = async () => { if (!confirm('¿Seguro que quieres eliminar este producto?')) return; const { error } = await sb.from('productos').delete().eq('id', b.dataset.del); error ? toast('No se pudo eliminar') : (toast('Producto eliminado'), ir()); });
  $$('[data-disp]').forEach(c => c.onchange = async () => { const { error } = await sb.from('productos').update({ disponible: c.checked }).eq('id', c.dataset.disp); toast(error ? 'Error al actualizar' : c.checked ? 'Producto disponible' : 'Producto agotado'); });
}
function formProducto(p = { nombre: '', descripcion: '', precio: '', categoria_id: CATS[0]?.id, emoji: '🍦', imagen: '', disponible: true }) {
  const m = openModal(`<h2>${p.id ? '✏ Editar' : '＋ Nuevo'} producto</h2><div id="pmsg"></div>
    <form class="form"><label class="upload">📷 <b>Subir foto del producto</b><br><small>PNG, JPG o WEBP · máximo 5 MB</small><input type="file" name="foto" accept="image/*" style="margin-top:8px"></label>
    <label class="field">Nombre<input name="nombre" required value="${e(p.nombre)}" placeholder="Ej. Cono de vainilla"></label>
    <div class="grid2"><label class="field">Precio (S/)<input name="precio" inputmode="decimal" required value="${e(p.precio)}" placeholder="0.00"></label><label class="field">Emoji (si no hay foto)<input name="emoji" maxlength="4" value="${e(p.emoji)}"></label></div>
    <div class="field">Categoría<div class="chips">${CATS.map(c => `<label class="chip"><input type="radio" name="categoria_id" value="${c.id}" ${p.categoria_id == c.id ? 'checked' : ''}>${c.emoji} ${e(c.nombre)}</label>`).join('')}</div></div>
    <label class="field">Descripción<input name="descripcion" value="${e(p.descripcion)}" placeholder="Sabor, ingredientes y tamaño"></label>
    <label class="check"><input type="checkbox" name="disponible" ${p.disponible ? 'checked' : ''}> Disponible para la venta</label>
    <button class="btn block">💾 Guardar producto</button></form>`);
  $('form', m).onsubmit = async ev => {
    ev.preventDefault(); const fd = new FormData(ev.target), btn = $('button.btn', m), err = t => { $('#pmsg', m).innerHTML = `<div class="err">${e(t)}</div>`; btn.disabled = false; };
    btn.disabled = true; const pr = parseFloat(String(fd.get('precio')).replace(',', '.')), n = fd.get('nombre').trim(); let img = p.imagen || '';
    if (!n || !(pr > 0)) return err('Completa el nombre y un precio mayor a 0');
    const file = fd.get('foto');
    if (file && file.size) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext) || file.size > 5 * 1024 * 1024) return err('La foto debe ser JPG, PNG o WEBP de máximo 5 MB');
      const path = crypto.randomUUID() + '.' + ext, up = await sb.storage.from('productos').upload(path, file); if (up.error) return err(up.error.message);
      img = sb.storage.from('productos').getPublicUrl(path).data.publicUrl;
    }
    const row = { nombre: n, descripcion: fd.get('descripcion').trim(), precio: pr, categoria_id: +fd.get('categoria_id'), emoji: fd.get('emoji').trim() || '🍦', imagen: img, disponible: fd.has('disponible') };
    const { error } = p.id ? await sb.from('productos').update(row).eq('id', p.id) : await sb.from('productos').insert(row);
    if (error) return err(error.message); m.remove(); toast('Producto guardado ✅'); ir();
  };
}

/* ---------- pedidos y boletas ---------- */
async function pedidos() {
  let q = sb.from('pedidos').select('*').order('id', { ascending: false }).limit(300); if (FILTRO) q = q.eq('estado', FILTRO);
  const ps = await ok(q);
  $('#app').innerHTML = `<h1>🧾 Pedidos y boletas</h1><p class="sub">Todas las ventas, con su boleta electrónica.</p>
    <div class="chips" style="margin-bottom:16px"><span class="chip ${!FILTRO ? 'on' : ''}" data-f="">Todos</span>${ORDEN.map(k => `<span class="chip ${FILTRO === k ? 'on' : ''}" data-f="${k}">${ESTADOS[k]}</span>`).join('')}</div>
    <div class="panel tw"><table><tr><th>Boleta</th><th>Fecha</th><th>Cliente</th><th>Origen</th><th>Pago</th><th>Total</th><th>Estado</th><th></th></tr>
    ${ps.map(p => `<tr><td><b>${EMPRESA.serie}-${String(p.id).padStart(6, '0')}</b></td><td>${fecha(p.creado)}</td><td>${e(p.cliente_nombre || '—')}</td><td>${p.origen === 'web' ? '🌐 Web' : '🏪 Mostrador'}</td><td>${PAGOS[p.pago]}</td><td><b>${money(p.total)}</b></td>
      <td><select class="inp" style="padding:6px 10px;width:auto" data-est="${p.id}">${ORDEN.map(k => `<option value="${k}" ${p.estado === k ? 'selected' : ''}>${ESTADOS[k]}</option>`).join('')}</select></td>
      <td><button class="btn sm" data-bol="${p.id}">🧾 Boleta</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">No hay pedidos</td></tr>'}</table></div>`;
  $$('[data-f]').forEach(c => c.onclick = () => { FILTRO = c.dataset.f; ir(); });
  $$('[data-est]').forEach(s => s.onchange = async () => { const { error } = await sb.from('pedidos').update({ estado: s.value }).eq('id', s.dataset.est); toast(error ? 'No se pudo actualizar' : 'Estado actualizado ✅'); });
  $$('[data-bol]').forEach(b => b.onclick = async () => mostrarBoleta(await cargarBoleta(b.dataset.bol), '🧾 Boleta'));
}

/* ---------- usuarios y roles ---------- */
async function usuarios() {
  const us = await ok(sb.from('perfiles').select('*').order('creado', { ascending: false }));
  $('#app').innerHTML = `<div class="row wrap"><div class="grow"><h1>👥 Usuarios y roles</h1><p class="sub">El rol decide a qué página entra cada persona al iniciar sesión con su correo.</p></div>
    <button class="btn" id="regVend">＋ Registrar empleado</button><button class="btn yellow" id="regAdm">＋ Registrar administrador</button></div>
    <div class="panel tw"><table><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Rol</th></tr>
    ${us.map(u => `<tr><td><b>${e(u.nombre || '—')}</b></td><td>${e(u.email)}</td><td>${e(u.telefono || '—')}</td><td>
      <select class="inp" style="padding:6px 10px;width:auto" data-rol="${u.id}" ${u.id === P.id ? 'disabled title="No puedes cambiar tu propio rol"' : ''}>
      <option value="cliente" ${u.rol === 'cliente' ? 'selected' : ''}>Cliente</option><option value="vendedor" ${u.rol === 'vendedor' ? 'selected' : ''}>Empleado</option><option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Administrador</option></select></td></tr>`).join('')}</table></div>
    <div class="okmsg">💡 Los clientes se registran solos desde la portada. Los empleados y administradores los registras tú aquí. Si ya tienen cuenta de cliente, cámbiales el rol en la lista.</div>`;
  $('#regVend').onclick = () => registrarPersonal('vendedor'); $('#regAdm').onclick = () => registrarPersonal('admin');
  $$('[data-rol]').forEach(s => s.onchange = async () => { const { error } = await sb.from('perfiles').update({ rol: s.value }).eq('id', s.dataset.rol); toast(error ? 'No se pudo cambiar el rol' : 'Rol actualizado ✅'); });
}

/* Registrar personal: se crea la cuenta con un cliente temporal (así NO se cierra la sesión del administrador) y luego se asigna el rol */
function registrarPersonal(rol) {
  const nom = rol === 'admin' ? 'administrador' : 'empleado';
  const m = openModal(`<h2>＋ Registrar ${nom}</h2><div id="rmsg"></div>
    <form class="form"><label class="field">Nombre completo<input name="nombre" required></label>
    <label class="field">Correo electrónico<input type="email" name="email" required></label>
    <div class="grid2"><label class="field">Teléfono<input name="telefono" inputmode="tel"></label><span></span></div>
    <div class="grid2"><label class="field">Contraseña<input type="password" name="password" minlength="6" required></label><label class="field">Repetir contraseña<input type="password" name="password2" minlength="6" required></label></div>
    <small class="muted">Esta persona entrará con su correo y contraseña y verá solo la página de ${nom}.</small>
    <button class="btn block">Registrar ${nom}</button></form>`);
  $('form', m).onsubmit = async ev => {
    ev.preventDefault(); const fd = new FormData(ev.target), btn = $('button.btn', m), err = t => { $('#rmsg', m).innerHTML = `<div class="err">${e(t)}</div>`; btn.disabled = false; };
    if (fd.get('password') !== fd.get('password2')) return err('Las contraseñas no coinciden');
    btn.disabled = true; const nombre = fd.get('nombre').trim(), tel = (fd.get('telefono') || '').trim();
    const temp = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await temp.auth.signUp({ email: fd.get('email').trim(), password: fd.get('password'), options: { data: { nombre, telefono: tel } } });
    if (error) return err(error.message);
    if (!data.user || data.user.identities?.length === 0) return err('Ese correo ya está registrado. Búscalo en la lista y cámbiale el rol.');
    const { error: e2 } = await sb.from('perfiles').update({ rol, nombre, telefono: tel }).eq('id', data.user.id);
    if (e2) return err('Se creó la cuenta pero no se pudo asignar el rol: ' + e2.message);
    m.remove(); toast(`${nom[0].toUpperCase() + nom.slice(1)} registrado ✅`); ir();
  };
}
init().catch(er => { $('#app').innerHTML = `<div class="err">${e(er.message)}</div>`; });
