import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Resend } from 'resend';

async function main(){
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY not set in .env.local');
      process.exit(2);
    }
    const resend = new Resend(apiKey);
    const to = process.env.TEST_RESEND_TO || 'onelikeoficial@gmail.com';
    const from = process.env.RESEND_FROM_EMAIL || 'no-reply@localhost';
    console.log('Sending test email', { to, from });

    const result = await resend.emails.send({
      from,
      to,
      subject: 'Prueba de integración Resend - Taller A&R',
      html: `<p>Este es un correo de prueba enviado desde el entorno de desarrollo del repositorio.</p>
             <p>Si lo recibes, la integración con Resend está funcionando.</p>`
    });

    console.log('Send result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\nIf an id is present the message was accepted by Resend.');
  } catch (err) {
    console.error('Error while sending test email:');
    console.error(err instanceof Error ? err.message : err);
    // Try to print nested response if available
    try {
      console.error(JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    } catch(e){}
    process.exit(1);
  }
}

main();
