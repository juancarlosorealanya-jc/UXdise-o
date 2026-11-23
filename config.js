// =====================================================
//  CONFIGURACIÓN  (edita solo este archivo)
// =====================================================

// 1) Supabase → Project Settings → API  (usa la clave "anon public", NUNCA la "service_role")
const SUPABASE_URL = 'https://gbofqwwrrqpcxzdqxzcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdib2Zxd3dycnFwY3h6ZHF4emNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzOTY4NDIsImV4cCI6MjExMDk3Mjg0Mn0.eWJPPMwzJp9m42mJyFqf1hbs-dkEoBFPvPfqJXiuAFM';

// 2) Datos de la empresa (salen en la página principal y en la boleta)
const EMPRESA = {
  nombre: 'Heladería Dulce Frío',
  razon: 'Heladería Dulce Frío S.A.C.',
  ruc: '20601234567',                       // RUC ficticio
  direccion: 'Av. Los Helados 123, Lima, Perú',
  telefono: '(01) 555-0123',
  whatsapp: '51999888777',
  correo: 'contacto@dulcefrio.com',
  horario: 'Todos los días · 10:00 a.m. – 10:00 p.m.',
  serie: 'B001',
  igv: 0.18
};

// 3) Envío de boleta por correo (EmailJS, gratis). Déjalo vacío si aún no lo configuras:
//    sin esto, el botón "Enviar a mi correo" abre el programa de correo del usuario.
const EMAILJS = { serviceId: 'service_a8osjgg', templateId: 'template_ug9524i', publicKey: 'szmmcLNjTntOZiL1I' };
