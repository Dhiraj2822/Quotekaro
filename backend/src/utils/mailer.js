const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const rawUser = process.env.SMTP_USER || '';
  const rawPass = process.env.SMTP_PASS || '';

  // Clean quotes and spaces from credentials
  const user = rawUser.trim().replace(/^["']|["']$/g, '');
  const pass = rawPass.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');

  if (user && pass) {
    const isGmail = (process.env.SMTP_HOST || '').includes('gmail') || user.includes('@gmail.com');
    if (isGmail) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000
      });
    } else {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000
      });
    }
  }

  return transporter;
}

/**
 * Send a professional, branded 6-digit OTP email to user
 */
async function sendOtpEmail(toEmail, otp) {
  const mailTransporter = getTransporter();
  const fromAddress = process.env.SMTP_FROM || `"QuoteKaro Security" <${process.env.SMTP_USER || 'no-reply@quotekaro.com'}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 24px; }
          .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .header { text-align: center; margin-bottom: 24px; }
          .brand { font-size: 24px; font-weight: 800; color: #1F3864; letter-spacing: -0.5px; }
          .brand span { color: #548235; }
          .title { font-size: 16px; font-weight: 600; color: #334155; margin-bottom: 8px; }
          .otp-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1F3864; font-family: monospace; }
          .expiry { font-size: 12px; color: #64748B; margin-top: 6px; }
          .footer { font-size: 11px; color: #94A3B8; text-align: center; margin-top: 24px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="brand">Quote<span>Karo</span></div>
            <div style="font-size: 12px; color: #64748B; margin-top: 4px;">Pune's Trusted Home Services Network</div>
          </div>
          <div class="title">Verify Your Email Address</div>
          <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 0;">
            Use the 6-digit verification code below to complete your login or profile setup.
          </p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="expiry">Valid for 10 minutes · Do not share this code with anyone</div>
          </div>
          <p style="font-size: 12px; color: #64748B; line-height: 1.4; margin: 0;">
            If you did not request this verification code, you can safely ignore this email. Someone may have typed their address by mistake.
          </p>
          <div class="footer">
            © ${new Date().getFullYear()} QuoteKaro Marketplace Technologies Pvt. Ltd.<br>
            Pune & PCMC, Maharashtra, India · All Rights Reserved
          </div>
        </div>
      </body>
    </html>
  `;

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `[QuoteKaro] ${otp} is your verification code`,
        text: `Your QuoteKaro verification code is: ${otp}. It is valid for 10 minutes. Do not share it with anyone.`,
        html: htmlContent
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[MAILER ERROR] Failed to send email via SMTP:', err.message);
      // Fallback for safety in dev
      console.log(`[EMAIL DEV FALLBACK] To: ${toEmail} | Code: ${otp}`);
      return { success: false, error: err.message, fallbackOtp: otp };
    }
  } else {
    // If SMTP is not configured
    console.error('[MAILER ERROR] No SMTP credentials configured (SMTP_USER/SMTP_PASS missing).');
    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'Email service is temporarily unconfigured on server' };
    }
    // Development mode fallback when SMTP is not configured yet
    console.log(`[EMAIL DEV LOG] To: ${toEmail} | Verification Code: ${otp}`);
    return { success: true, simulated: true, otp };
  }
}

module.exports = {
  sendOtpEmail
};
