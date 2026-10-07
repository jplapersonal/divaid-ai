export async function onRequestPost({ request, env }) {
  try {
    const { email } = await request.json();
    const allowedEmails = ['jpla@kiw.one'];
    
    if (!email || !allowedEmails.includes(email.toLowerCase())) {
      // Fake success to prevent email enumeration
      return new Response(JSON.stringify({ success: true, message: 'OTP sent if authorized' }), { status: 200 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    const secret = env.OTP_SECRET || 'divaid_dev_secret';
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase() + code + secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (env.BREVO_API_KEY) {
      const htmlContent = `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;color:#0f172a;">
          <h2 style="color:#0284c7;">Divaid.ai Access</h2>
          <p>Your secure access code is:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:5px;padding:20px;background:#f0f9ff;border-radius:8px;text-align:center;margin:20px 0;">
            ${code}
          </div>
          <p style="font-size:12px;color:#64748b;">This code is for authorized personnel only.</p>
        </div>
      `;

      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'Divaid AI', email: 'noreply@divaid.ai' },
          to: [{ email }],
          subject: 'Divaid.ai Access Code',
          htmlContent
        })
      });
      
      if (!brevoRes.ok) {
        const brevoErr = await brevoRes.text();
        return new Response(JSON.stringify({ error: 'Brevo API Error: ' + brevoErr }), { status: 500 });
      }
    } else {
      console.log(`[LOCAL DEV] OTP for ${email}: ${code}`);
    }

    return new Response(JSON.stringify({ success: true, signature, brevo_called: !!env.BREVO_API_KEY }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
