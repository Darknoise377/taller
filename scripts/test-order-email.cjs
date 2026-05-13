// Crea una orden de prueba CONTRAENTREGA y verifica que se envíe el email de confirmación.
// Uso: node scripts/test-order-email.cjs
require('dotenv').config({ path: '.env.local' });

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const PRODUCT_ID = process.argv[2] || '4c797990-3c07-4a68-b534-f58a834b961c';
const CUSTOMER_EMAIL = process.argv[3] || 'onelikeoficial@gmail.com';

async function main() {
  console.log(`\n📦 Creando orden de prueba en ${BASE}/api/orders`);
  console.log(`   Producto: ${PRODUCT_ID}`);
  console.log(`   Email cliente: ${CUSTOMER_EMAIL}\n`);

  const payload = {
    paymentMethod: 'CONTRAENTREGA',
    customerName: 'Cliente Prueba',
    customerEmail: CUSTOMER_EMAIL,
    address: 'Calle 123 # 45-67',
    city: 'Bogotá',
    department: 'Bogotá D.C.',
    phone: '3001234567',
    cedula: '1234567890',
    products: [{ productId: PRODUCT_ID, quantity: 1 }],
  };

  const res = await fetch(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  if (!res.ok) {
    console.error('❌ Error al crear orden:', res.status, JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log('✅ Orden creada:');
  console.log(`   ID: ${body.id}`);
  console.log(`   referenceCode: ${body.referenceCode}`);
  console.log(`   status: ${body.status}`);
  console.log(`\n📧 Si ves "📧 [Email] Confirmación enviada" en los logs del servidor, el email fue enviado.`);
  console.log(`   Revisa también la bandeja de ${CUSTOMER_EMAIL}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
