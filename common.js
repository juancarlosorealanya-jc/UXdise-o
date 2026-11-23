/* Funciones compartidas: Supabase, sesión, modales, boleta y envío por correo */
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ESTADOS = { pendiente: 'Pendiente', preparando: 'Preparando', en_camino: 'En camino', entregado: 'Entregado' };
const ORDEN = Object.keys(ESTADOS);
const PAGOS = { efectivo: 'Efectivo', yape: 'Yape / Plin', tarjeta: 'Tarjeta' };
const HOME = { cliente: 'tienda.html', admin: 'admin.html', vendedor: 'vendedor.html' };

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => 'S/ ' + Number(n || 0).toFixed(2);
const fecha = d => new Date(d).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
const ok = async q => { const { data, error } = await q; if (error) throw error; return data; };
const tagE = s => `<span class="tag ${s}">${ESTADOS[s] || s}</span>`;
const thumb = p => `<span class="thumb">${p.imagen ? `<img src="${e(p.imagen)}" alt="">` : e(p.emoji || '🍦')}</span>`;
const pimg = p => `<div class="pimg">${p.imagen ? `<img src="${e(p.imagen)}" alt="${e(p.nombre)}">` : e(p.emoji || '🍦')}</div>`;
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2400); }
function openModal(html, cls = '', wrapCls = '') {
  const w = document.createElement('div'); w.className = 'modal-wrap ' + wrapCls;
  w.innerHTML = `<div class="modal ${cls}"><button class="x" data-close>✕</button>${html}</div>`;
  w.addEventListener('mousedown', ev => { if (ev.target === w) w.remove(); });
  w.addEventListener('click', ev => { if (ev.target.closest('[data-close]')) w.remove(); });
  document.body.appendChild(w); return w;
}
const closeModals = () => $$('.modal-wrap').forEach(m => m.remove());
function configFalta() { return SUPABASE_URL.includes('TU-PROYECTO'); }
function avisoConfig() {
  document.body.insertAdjacentHTML('afterbegin', '<div class="err" style="margin:0;border-radius:0;text-align:center">⚙️ Falta configurar Supabase: abre <b>assets/js/config.js</b> y pega tu URL y tu clave anon.</div>');
}

/* ---------- sesión y roles ---------- */
async function getPerfil() {
  // getUser() fuerza la validación con el servidor y asegura que la sesión esté activa
  const { data: { user }, error: authError } = await sb.auth.getUser();
  if (authError || !user) return null;
  
  // Ahora sí, consultamos la tabla con la seguridad de que estamos autenticados
  const { data, error } = await sb.from('perfiles').select('*').eq('id', user.id).single();
  
  if (error) {
    console.error("Error al buscar el perfil en Supabase:", error);
    return null;
  }
  return data;
}
// Protege una página: si no hay sesión → portada; si el rol no corresponde → su página
async function guard(rol) {
  if (configFalta()) { avisoConfig(); return null; }
  const p = await getPerfil();
  if (!p) { location.href = 'index.html?login=1'; return null; }
  if (p.rol !== rol) { location.href = HOME[p.rol]; return null; }
  return p;
}
async function logout() { await sb.auth.signOut(); localStorage.removeItem('cart'); location.href = 'index.html'; }
document.addEventListener('click', ev => { if (ev.target.closest('[data-logout]')) logout(); });

/* ---------- boleta ficticia ---------- */
function letras(n) {
  const u = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const d = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const c = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  const cen = x => { if (x === 100) return 'CIEN'; let s = c[Math.floor(x / 100)], r = x % 100; if (r < 30) s += (s && r ? ' ' : '') + u[r]; else { s += (s ? ' ' : '') + d[Math.floor(r / 10)]; if (r % 10) s += ' Y ' + u[r % 10]; } return s.trim(); };
  const mil = x => { if (x < 1000) return cen(x); const m = Math.floor(x / 1000), r = x % 1000; return (m === 1 ? 'MIL' : cen(m) + ' MIL') + (r ? ' ' + cen(r) : ''); };
  const ent = Math.floor(n + 1e-9), cts = Math.round((n - ent) * 100);
  return (ent === 0 ? 'CERO' : mil(ent)) + ' CON ' + String(cts).padStart(2, '0') + '/100 SOLES';
}
function armarBoleta(p, its) {
  return { id: p.id, numero: EMPRESA.serie + '-' + String(p.id).padStart(6, '0'), fecha: p.creado, cliente: p.cliente_nombre || 'Cliente varios',
    documento: p.documento || '-', email: p.email_boleta || '', items: its, envio: +p.envio, total: +p.total, pago: p.pago, tipo: p.tipo,
    direccion: p.direccion || '', atendido: p.vendedor?.nombre || (p.origen === 'web' ? 'Venta web' : '') };
}
async function cargarBoleta(id) {
  const p = await ok(sb.from('pedidos').select('*, vendedor:perfiles!vendedor_id(nombre)').eq('id', id).single());
  const its = await ok(sb.from('pedido_items').select('*').eq('pedido_id', id));
  return armarBoleta(p, its);
}
// HTML con estilos "en línea" para que se vea igual en pantalla, al imprimir y en el correo
function boletaHTML(b) {
  const base = b.total / (1 + EMPRESA.igv), igv = b.total - base, td = 'padding:5px 4px;border-bottom:1px dashed #cfe9e6;font-size:12px';
  const filas = b.items.map(i => `<tr><td style="${td}">${i.cantidad}</td><td style="${td}">${e(i.nombre)}${i.nota ? `<br><span style="color:#5D7C86;font-size:11px">${e(i.nota)}</span>` : ''}</td><td style="${td};text-align:right">${(+i.precio).toFixed(2)}</td><td style="${td};text-align:right">${(i.precio * i.cantidad).toFixed(2)}</td></tr>`).join('')
    + (b.envio > 0 ? `<tr><td style="${td}">1</td><td style="${td}">Servicio de delivery</td><td style="${td};text-align:right">${b.envio.toFixed(2)}</td><td style="${td};text-align:right">${b.envio.toFixed(2)}</td></tr>` : '');
  const r = (k, v) => `<tr><td style="font-size:12px;color:#5D7C86;padding:2px 0">${k}</td><td style="font-size:12px;text-align:right;font-weight:600">${v}</td></tr>`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:420px;margin:0 auto;border:1px solid #cfe9e6;border-radius:14px;padding:20px;background:#fff;color:#0B2E3A">
  <div style="text-align:center"><div style="font-size:30px">🍦</div><div style="font-weight:800;font-size:18px;color:#0AA6A0">${e(EMPRESA.razon)}</div>
  <div style="font-size:12px;color:#5D7C86;line-height:1.5">RUC ${e(EMPRESA.ruc)}<br>${e(EMPRESA.direccion)}<br>Tel. ${e(EMPRESA.telefono)}</div></div>
  <div style="margin:14px 0;padding:10px;border:2px solid #0E7FB8;border-radius:10px;text-align:center"><div style="font-weight:800;color:#0E7FB8;font-size:13px">BOLETA DE VENTA ELECTRÓNICA</div><div style="font-weight:800;font-size:17px">${b.numero}</div></div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px">${r('Fecha de emisión', fecha(b.fecha))}${r('Cliente', e(b.cliente))}${r('DNI / Documento', e(b.documento))}${r('Tipo de entrega', b.tipo === 'domicilio' ? 'Delivery' : 'En tienda')}${b.direccion ? r('Dirección', e(b.direccion)) : ''}${r('Forma de pago', PAGOS[b.pago] || b.pago)}${b.atendido ? r('Atendido por', e(b.atendido)) : ''}</table>
  <table style="width:100%;border-collapse:collapse"><tr style="background:#eefaf8"><th style="font-size:11px;text-align:left;padding:6px 4px">CANT</th><th style="font-size:11px;text-align:left;padding:6px 4px">DESCRIPCIÓN</th><th style="font-size:11px;text-align:right;padding:6px 4px">P.UNIT</th><th style="font-size:11px;text-align:right;padding:6px 4px">IMPORTE</th></tr>${filas}</table>
  <table style="width:100%;border-collapse:collapse;margin-top:10px">${r('Op. gravada', 'S/ ' + base.toFixed(2))}${r('IGV (' + Math.round(EMPRESA.igv * 100) + '%)', 'S/ ' + igv.toFixed(2))}
  <tr><td style="font-weight:800;font-size:17px;padding-top:6px;color:#0AA6A0">TOTAL</td><td style="font-weight:800;font-size:17px;text-align:right;padding-top:6px;color:#0AA6A0">S/ ${b.total.toFixed(2)}</td></tr></table>
  <div style="font-size:11px;margin-top:10px;font-weight:700">SON: ${letras(b.total)}</div>
  <div style="font-size:10px;color:#8aa3aa;text-align:center;margin-top:14px;line-height:1.4">Representación impresa de la boleta de venta electrónica.<br>Documento ficticio con fines académicos, sin validez tributaria.<br>¡Gracias por tu compra! 💙</div></div>`;
}
const emailConfigurado = () => !!(EMAILJS.serviceId && EMAILJS.templateId && EMAILJS.publicKey);
async function enviarBoleta(b, correo) {
  if (!/^\S+@\S+\.\S+$/.test(correo || '')) throw new Error('Escribe un correo válido');
  if (emailConfigurado()) {
    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: EMAILJS.serviceId, template_id: EMAILJS.templateId, user_id: EMAILJS.publicKey,
        template_params: { to_email: correo, to_name: b.cliente, boleta_numero: b.numero, total: money(b.total), empresa: EMPRESA.nombre, html_boleta: boletaHTML(b) } }) });
    if (!r.ok) throw new Error('No se pudo enviar el correo (' + (await r.text()) + ')');
    return 'enviado';
  }
  // Sin EmailJS: abre el programa de correo con el resumen
  const txt = `${EMPRESA.razon} - RUC ${EMPRESA.ruc}\nBOLETA ${b.numero}\nFecha: ${fecha(b.fecha)}\nCliente: ${b.cliente}\n\n` +
    b.items.map(i => `${i.cantidad} x ${i.nombre}  ${money(i.precio * i.cantidad)}`).join('\n') + (b.envio ? `\nDelivery  ${money(b.envio)}` : '') +
    `\n\nTOTAL: ${money(b.total)}\nSON: ${letras(b.total)}\n\nGracias por tu compra.\n(Documento ficticio con fines académicos)`;
  location.href = 'mailto:' + correo + '?subject=' + encodeURIComponent('Boleta ' + b.numero + ' - ' + EMPRESA.nombre) + '&body=' + encodeURIComponent(txt);
  return 'mailto';
}
function imprimirBoleta(b) {
  const w = window.open('', '_blank'); if (!w) return toast('Permite las ventanas emergentes para imprimir');
  w.document.write(`<html><head><title>Boleta ${b.numero}</title></head><body style="margin:20px">${boletaHTML(b)}</body></html>`); w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
}
// Ventana con la boleta, botón imprimir y envío al correo
function mostrarBoleta(b, titulo = 'Tu boleta', mensaje = '') {
  const m = openModal(`<h2>${titulo}</h2>${mensaje}<div style="margin:12px 0">${boletaHTML(b)}</div>
    <div class="form"><label class="field">Enviar boleta a este correo<input type="email" id="bolMail" placeholder="correo@ejemplo.com" value="${e(b.email)}"></label>
    <div id="bolMsg"></div>
    <div class="row wrap"><button class="btn grow" id="bolSend">✉ Enviar a mi correo</button><button class="btn out" id="bolPrint">🖨 Imprimir / PDF</button></div>
    ${emailConfigurado() ? '' : '<small class="muted">Aún no se configuró EmailJS: el botón abrirá tu programa de correo con la boleta.</small>'}</div>`, 'wide');
  $('#bolPrint', m).onclick = () => imprimirBoleta(b);
  $('#bolSend', m).onclick = async ev => {
    const btn = ev.target; btn.disabled = true; const msg = $('#bolMsg', m);
    try { const r = await enviarBoleta(b, $('#bolMail', m).value.trim()); msg.innerHTML = r === 'enviado' ? '<div class="okmsg">✅ Boleta enviada a tu correo</div>' : '<div class="okmsg">Se abrió tu programa de correo</div>'; }
    catch (er) { msg.innerHTML = `<div class="err">${e(er.message)}</div>`; } finally { btn.disabled = false; }
  };
  return m;
}
