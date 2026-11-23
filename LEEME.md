# 🍦 Heladería Dulce Frío – Página web (HTML + CSS + JavaScript + Supabase)

Sitio web de verdad con:
- **Portada** de la empresa (quiénes somos, productos, cómo comprar, contacto) y un botón **Iniciar sesión** arriba.
- **Un solo login**: según el correo con el que entres, te lleva solo a tu página:
  - cliente → `tienda.html` · empleado → `vendedor.html` · administrador → `admin.html`
- **Boleta electrónica ficticia** al pagar, que se puede **imprimir/guardar en PDF** y **enviar al correo**.
- Se guarda en **GitHub** (GitHub Pages) y los datos viven en **Supabase**. No necesita PHP ni XAMPP.

---------------------------------------------------------------
## PASO 1 · Crear el proyecto en Supabase
1. https://supabase.com → **Start your project** → inicia sesión.
2. **New project** → nombre `dulce-frio`, crea una contraseña de base de datos y elige región → **Create new project** (espera 1-2 min).

## PASO 2 · Crear las tablas
1. Menú izquierdo → **SQL Editor** → **New query**.
2. Copia TODO el archivo `supabase_schema.sql`, pégalo y pulsa **Run** → debe decir *Success*.

## PASO 3 · Desactivar la confirmación por correo (para pruebas)
**Authentication → Providers → Email** → apaga **Confirm email** → **Save**.

## PASO 4 · Conectar la página con Supabase
1. **Project Settings (⚙) → API**: copia **Project URL** y la clave **anon public**.
2. Abre `assets/js/config.js` y pégalos en `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
   ⚠ Solo la clave **anon public**. Nunca la `service_role`.
3. En ese mismo archivo puedes cambiar los datos de tu empresa (nombre, RUC ficticio, dirección, teléfono…): salen en la portada y en la boleta.

## PASO 5 · Crear las cuentas de administrador y empleado
1. Abre la página (Paso 6) → **Iniciar sesión → Crear cuenta** y regístrate dos veces:
   - `admin@dulcefrio.com` · contraseña `admin123`
   - `vendedor@dulcefrio.com` · contraseña `vendedor123`
2. En Supabase → **SQL Editor** → pega y ejecuta `supabase_roles.sql`. Esto les asigna el rol de administrador y de empleado.
3. Listo: al iniciar sesión con esos correos, cada uno entra a su página.
   (Después, el administrador registra a los demás desde su panel: **Usuarios y roles → ＋ Registrar empleado / ＋ Registrar administrador**. El registro público de la portada es solo para clientes.)

## PASO 6 · Probarla en tu PC (Visual Studio Code)
1. **File → Open Folder** y elige esta carpeta.
2. Instala la extensión **Live Server** (Ritwick Dey).
3. Clic derecho sobre `index.html` → **Open with Live Server** → se abre `http://127.0.0.1:5500`.

## PASO 7 · (Opcional) Enviar la boleta al correo con EmailJS (gratis)
Sin esto, el botón "Enviar a mi correo" abre el programa de correo del usuario con la boleta escrita. Para que se envíe automáticamente:
1. Crea cuenta en https://www.emailjs.com
2. **Email Services → Add New Service** → elige Gmail → conecta tu cuenta → copia el **Service ID**.
3. **Email Templates → Create New Template** con:
   - **To Email:** `{{to_email}}`
   - **Subject:** `Tu boleta {{boleta_numero}} - {{empresa}}`
   - **Content** (modo código `<>`): `{{{html_boleta}}}`  ← con TRES llaves
   - Guarda y copia el **Template ID**.
4. **Account → General** → copia tu **Public Key**.
5. Pégalos en `assets/js/config.js`:
```js
const EMAILJS = { serviceId: 'service_xxxx', templateId: 'template_xxxx', publicKey: 'xxxxxxxx' };
```
(El plan gratis permite unos 200 correos al mes.)

## PASO 8 · Subirla a GitHub
1. https://github.com → **New repository** → nombre `dulce-frio` → **Public** → **Create repository**.
2. Fácil (sin comandos): **uploading an existing file** → arrastra TODO el contenido de la carpeta → **Commit changes**.
3. O con Git (terminal de VS Code, dentro de la carpeta):
```bash
git init
git add .
git commit -m "Heladería Dulce Frío web"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/dulce-frio.git
git push -u origin main
```

## PASO 9 · Publicarla con GitHub Pages (gratis)
1. En el repositorio: **Settings → Pages** → **Branch: main** y carpeta **/ (root)** → **Save**.
2. En 1-2 minutos queda en `https://TU-USUARIO.github.io/dulce-frio/`
3. En Supabase: **Authentication → URL Configuration** → **Site URL** = esa dirección → **Save**.

---------------------------------------------------------------
## Qué hace cada página
| Página | Quién entra | Qué puede hacer |
|---|---|---|
| `index.html` | Todos | Ver la empresa y el menú, iniciar sesión o crear cuenta |
| `tienda.html` | Cliente | Comprar, carrito, pagar, recibir boleta, ver sus pedidos |
| `vendedor.html` | Empleado | Tablero de pedidos, venta de mostrador con boleta, ventas del día |
| `admin.html` | Administrador | Resumen, productos (con fotos), pedidos y boletas, usuarios y roles |

## Estructura
```
dulce-frio/
├── index.html · tienda.html · vendedor.html · admin.html
├── assets/css/style.css
├── assets/js/config.js    ← AQUÍ pegas Supabase, datos de la empresa y EmailJS
├── assets/js/common.js    (sesión, boleta, envío por correo)
├── assets/js/index.js · tienda.js · vendedor.js · admin.js
├── supabase_schema.sql    (tablas, seguridad y datos de ejemplo)
├── supabase_roles.sql     (asigna admin y empleado por correo)
└── .nojekyll
```

## Problemas comunes
- **"Falta configurar Supabase"**: no pegaste la URL y la clave en `config.js`.
- **Entro como administrador y me manda a la tienda**: falta ejecutar `supabase_roles.sql` (o el correo no es exactamente el del archivo).
- **"No encontramos tu perfil"**: no ejecutaste `supabase_schema.sql`, o creaste la cuenta antes de ejecutarlo (bórrala en Authentication → Users y vuelve a registrarla).
- **Cliente nuevo no puede entrar**: revisa el Paso 3.
- **No suben las fotos**: solo el administrador puede; verifica en **Storage** que exista el bucket `productos`.
- **No llega el correo**: revisa spam y que el Template de EmailJS use `{{{html_boleta}}}` con tres llaves.
- **GitHub Pages da 404**: espera unos minutos y comprueba que `index.html` esté en la raíz del repositorio.
- **No ves cambios**: refresca con Ctrl + F5.
- Las boletas son **ficticias** (proyecto académico), sin validez tributaria.
