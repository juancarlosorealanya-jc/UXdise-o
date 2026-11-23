/* Portada: datos de la empresa, catálogo público y login que detecta el rol por el correo */
$$('[data-emp]').forEach(el => el.textContent = EMPRESA[el.dataset.emp] || '');
let PERFIL = null;

async function init() {
  if (configFalta()) { avisoConfig(); $('#grid').innerHTML = '<p class="empty">Conecta Supabase para ver los productos.</p>'; return; }
  PERFIL = await getPerfil();
  navUsuario();
  try {
    const ps = await ok(sb.from('productos').select('*').eq('disponible', true).order('id').limit(8));
    $('#grid').innerHTML = ps.map(p => `<div class="pcard">${pimg(p)}<div class="pbody"><h3>${e(p.nombre)}</h3><p>${e(p.descripcion)}</p><div class="row"><span class="price grow">${money(p.precio)}</span></div></div></div>`).join('') || '<p class="empty">Pronto tendremos productos 🍦</p>';
  } catch (er) { $('#grid').innerHTML = `<p class="empty">No se pudo cargar el menú (${e(er.message)})</p>`; }
  if (new URLSearchParams(location.search).get('login') && !PERFIL) abrirLogin();
}
function navUsuario() {
  if (!PERFIL) return;
  $('#navUser').innerHTML = `<span class="who">Hola, ${e(PERFIL.nombre.split(' ')[0] || 'tú')}</span><a class="btn sm" href="${HOME[PERFIL.rol]}">Ir a mi panel</a><button class="btn out sm" data-logout>Salir</button>`;
}
function pedir() { PERFIL ? location.href = HOME[PERFIL.rol] : abrirLogin(); }

function abrirLogin(tab = 'in') {
  const m = openModal(`<h2>👋 Bienvenido</h2>
    <div class="tabs"><button data-tab="in" class="${tab === 'in' ? 'on' : ''}">Iniciar sesión</button><button data-tab="up" class="${tab === 'up' ? 'on' : ''}">Crear cuenta</button></div>
    <div id="lmsg"></div>
    <form id="fIn" class="form" ${tab === 'in' ? '' : 'hidden'}>
      <label class="field">Correo electrónico<input type="email" name="email" required autocomplete="email"></label>
      <label class="field">Contraseña<input type="password" name="password" required autocomplete="current-password"></label>
      <button class="btn block">Ingresar</button>
      <small class="muted center">Todos ingresan aquí: te llevamos a tu panel automáticamente según tu correo.</small>
    </form>
    <form id="fUp" class="form" ${tab === 'up' ? '' : 'hidden'}>
      <div class="okmsg">🍦 El registro es solo para <b>clientes</b>. El personal (empleados y administradores) lo registra el administrador.</div>
      <label class="field">Nombre completo<input name="nombre" required></label>
      <label class="field">Correo electrónico<input type="email" name="email" required></label>
      <div class="grid2"><label class="field">Teléfono<input name="telefono" inputmode="tel"></label><label class="field">DNI (opcional)<input name="dni" inputmode="numeric" maxlength="8"></label></div>
      <div class="grid2"><label class="field">Contraseña<input type="password" name="password" minlength="6" required></label><label class="field">Repetir contraseña<input type="password" name="password2" minlength="6" required></label></div>
      <label class="check"><input type="checkbox" name="terminos" required> Acepto los términos y condiciones</label>
      <button class="btn block">Crear cuenta</button>
    </form>`);
  const msg = t => $('#lmsg', m).innerHTML = t ? `<div class="err">${e(t)}</div>` : '';
  $$('[data-tab]', m).forEach(b => b.onclick = () => { $$('[data-tab]', m).forEach(x => x.classList.toggle('on', x === b)); $('#fIn', m).hidden = b.dataset.tab !== 'in'; $('#fUp', m).hidden = b.dataset.tab !== 'up'; msg(''); });
    $('#fIn', m).onsubmit = async ev => {
    ev.preventDefault(); const fd = new FormData(ev.target), btn = $('button', ev.target); btn.disabled = true; msg('');
    
    // 1. Iniciamos sesión y guardamos los datos de autenticación
    const { data: authData, error } = await sb.auth.signInWithPassword({ email: fd.get('email').trim(), password: fd.get('password') });
    if (error) { btn.disabled = false; return msg('Correo o contraseña incorrectos'); }
    
    // 2. Buscamos el perfil usando el ID del usuario que acaba de entrar (evita el error de tiempo)
    const { data: p, error: pError } = await sb.from('perfiles').select('*').eq('id', authData.user.id).single();
    
    if (!p || pError) { 
      btn.disabled = false; 
      console.error("Error al cargar perfil:", pError); // Esto te dirá en la consola si hay un error real
      return msg('No encontramos tu perfil. Revisa la consola (F12).'); 
    }
    
    location.href = HOME[p.rol]; // Te manda a admin, vendedor o tienda según corresponda
  };
  $('#fUp', m).onsubmit = async ev => {
    ev.preventDefault(); const fd = new FormData(ev.target), btn = $('button', ev.target); msg('');
    if (fd.get('password') !== fd.get('password2')) return msg('Las contraseñas no coinciden');
    btn.disabled = true;
    const { data, error } = await sb.auth.signUp({ email: fd.get('email').trim(), password: fd.get('password'), options: { data: { nombre: fd.get('nombre').trim(), telefono: fd.get('telefono') || '' } } });
    if (error) { btn.disabled = false; return msg(error.message); }
    if (!data.session) { btn.disabled = false; $('#lmsg', m).innerHTML = '<div class="okmsg">Cuenta creada ✅ Revisa tu correo para confirmarla y luego inicia sesión.</div>'; return; }
    if (fd.get('dni')) localStorage.setItem('dni', fd.get('dni'));
    const p = await getPerfil(); location.href = HOME[p?.rol || 'cliente'];
  };
}
$('#btnLogin')?.addEventListener('click', () => abrirLogin());
$('#btnPedir').onclick = pedir; $('#btnPedir2').onclick = pedir;
init();
