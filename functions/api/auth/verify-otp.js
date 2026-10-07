export async function onRequestPost({ request, env }) {
  try {
    const { email, code, signature } = await request.json();
    if (!email || !code || !signature) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
    }

    const secret = env.OTP_SECRET || 'divaid_dev_secret';
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase() + code + secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (signature !== expectedSignature) {
      return new Response(JSON.stringify({ error: 'Invalid or expired code' }), { status: 401 });
    }

    // Generate token (for demo purposes)
    const token = btoa(email.toLowerCase() + ':' + Date.now());

    return new Response(JSON.stringify({ success: true, token }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
