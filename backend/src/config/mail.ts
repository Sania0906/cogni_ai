import nodemailer from "nodemailer";

/**
 * Sends a premium verification code email using Nodemailer with support for Gmail SMTP or custom configuration.
 * Returns the send status and any descriptive errors encountered.
 */
export async function sendOtpEmail(
  email: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_EMAIL || process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

  if (!user || !pass) {
    const errorMsg = "SMTP credentials (email or password) are not configured in environment variables.";
    console.warn(`[Email Mock] ${errorMsg} Fallback code for ${email} is ${otp}`);
    return { success: false, error: errorMsg };
  }

  try {
    const transporterConfig: any = {
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false, // Prevents local SSL/TLS negotiation errors
      },
    };

    // If using Google Mail, optimize configuration
    if (host.includes("smtp.gmail.com") || user.endsWith("@gmail.com")) {
      transporterConfig.service = "gmail";
      // Note: service = "gmail" automatically overrides host and port in nodemailer for best compatibility
    }

    const transporter = nodemailer.createTransport(transporterConfig);

    // Verify SMTP connection config before sending
    await transporter.verify();

    await transporter.sendMail({
      from: `"CognifyAI Support" <${user}>`,
      to: email,
      subject: "Verify Your CognifyAI Account",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verification Code</title>
          <style>
            body {
              font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #f8fafc;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
            }
            .wrapper {
              width: 100%;
              background-color: #f8fafc;
              padding: 40px 20px;
              box-sizing: border-box;
            }
            .container {
              max-width: 540px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 10px 30px -10px rgba(99, 102, 241, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02);
              border: 1px solid #f1f5f9;
            }
            .header-banner {
              background: linear-gradient(135deg, #6366f1, #a855f7);
              padding: 40px 30px;
              text-align: center;
            }
            .logo-icon {
              display: inline-block;
              width: 56px;
              height: 56px;
              background-color: rgba(255, 255, 255, 0.18);
              border-radius: 16px;
              line-height: 56px;
              color: #ffffff;
              font-size: 28px;
              font-weight: bold;
              border: 1px solid rgba(255, 255, 255, 0.25);
              margin-bottom: 16px;
            }
            .header-title {
              color: #ffffff;
              font-size: 24px;
              font-weight: 800;
              margin: 0;
              letter-spacing: -0.5px;
            }
            .content {
              padding: 40px 35px;
            }
            .greeting {
              font-size: 16px;
              color: #1e293b;
              font-weight: 600;
              margin-bottom: 12px;
            }
            .message-body {
              font-size: 15px;
              color: #475569;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .otp-card {
              background-color: #f8fafc;
              border: 1px dashed #cbd5e1;
              border-radius: 20px;
              padding: 24px;
              text-align: center;
              margin: 30px 0;
            }
            .otp-label {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              color: #64748b;
              font-weight: 700;
              margin-bottom: 8px;
            }
            .otp-code {
              font-size: 38px;
              font-weight: 800;
              letter-spacing: 6px;
              color: #6366f1;
              margin: 0;
              display: inline-block;
            }
            .expiry-note {
              font-size: 13px;
              color: #ef4444;
              font-weight: 500;
              text-align: center;
              margin-top: 10px;
            }
            .footer {
              padding: 0 35px 40px 35px;
              text-align: center;
            }
            .divider {
              border: 0;
              border-top: 1px solid #f1f5f9;
              margin-bottom: 24px;
            }
            .help-text {
              font-size: 12px;
              color: #94a3b8;
              line-height: 1.5;
              margin: 0;
            }
            .support-link {
              color: #6366f1;
              text-decoration: none;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header-banner">
                <div class="logo-icon">🧠</div>
                <h1 class="header-title">CognifyAI</h1>
              </div>
              <div class="content">
                <div class="greeting">Hello,</div>
                <p class="message-body">
                  Thank you for joining CognifyAI Smart Skill Intelligence. To activate your account and access the dashboard, please enter the security verification code below:
                </p>
                <div class="otp-card">
                  <div class="otp-label">Verification Code</div>
                  <div class="otp-code">${otp}</div>
                  <div class="expiry-note">⏱️ Code expires in 5 minutes</div>
                </div>
                <p class="message-body" style="font-size: 13px; margin-bottom: 0;">
                  If you didn't initiate this request, you can safely ignore this email.
                </p>
              </div>
              <div class="footer">
                <hr class="divider">
                <p class="help-text">
                  Need help? Contact our support team at <a href="mailto:support@cognify.ai" class="support-link">support@cognify.ai</a>.
                </p>
                <p class="help-text" style="margin-top: 8px;">
                  © 2026 CognifyAI. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`[Email Sent] Verification code email sent to ${email}`);
    return { success: true };
  } catch (err: any) {
    const errorDetails = err instanceof Error ? err.message : String(err);
    console.error("Nodemailer Error sending email:", err);
    return { success: false, error: errorDetails };
  }
}

/**
 * Sends a premium account confirmation email containing a direct confirmation link.
 */
export async function sendConfirmationEmail(
  email: string,
  link: string
): Promise<{ success: boolean; error?: string }> {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_EMAIL || process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

  if (!user || !pass) {
    const errorMsg = "SMTP credentials (email or password) are not configured in environment variables.";
    console.warn(`[Email Mock] ${errorMsg} Confirmation link for ${email} is ${link}`);
    return { success: false, error: errorMsg };
  }

  try {
    const transporterConfig: any = {
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    };

    if (host.includes("smtp.gmail.com") || user.endsWith("@gmail.com")) {
      transporterConfig.service = "gmail";
    }

    const transporter = nodemailer.createTransport(transporterConfig);
    await transporter.verify();

    await transporter.sendMail({
      from: `"CognifyAI Support" <${user}>`,
      to: email,
      subject: "Confirm Your CognifyAI Account",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirm Your Account</title>
          <style>
            body {
              font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #f8fafc;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
            }
            .wrapper {
              width: 100%;
              background-color: #f8fafc;
              padding: 40px 20px;
              box-sizing: border-box;
            }
            .container {
              max-width: 540px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 10px 30px -10px rgba(99, 102, 241, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02);
              border: 1px solid #f1f5f9;
            }
            .header-banner {
              background: linear-gradient(135deg, #6366f1, #a855f7);
              padding: 40px 30px;
              text-align: center;
            }
            .logo-icon {
              display: inline-block;
              width: 56px;
              height: 56px;
              background-color: rgba(255, 255, 255, 0.18);
              border-radius: 16px;
              line-height: 56px;
              color: #ffffff;
              font-size: 28px;
              font-weight: bold;
              border: 1px solid rgba(255, 255, 255, 0.25);
              margin-bottom: 16px;
            }
            .header-title {
              color: #ffffff;
              font-size: 24px;
              font-weight: 800;
              margin: 0;
              letter-spacing: -0.5px;
            }
            .content {
              padding: 40px 35px;
              text-align: center;
            }
            .greeting {
              font-size: 16px;
              color: #1e293b;
              font-weight: 600;
              margin-bottom: 12px;
              text-align: left;
            }
            .message-body {
              font-size: 15px;
              color: #475569;
              line-height: 1.6;
              margin: 0 0 24px 0;
              text-align: left;
            }
            .btn-confirm {
              display: inline-block;
              background: linear-gradient(135deg, #6366f1, #a855f7);
              color: #ffffff !important;
              text-decoration: none;
              padding: 16px 36px;
              font-weight: 700;
              font-size: 16px;
              border-radius: 16px;
              margin: 20px 0;
              box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4);
            }
            .footer {
              padding: 0 35px 40px 35px;
              text-align: center;
            }
            .divider {
              border: 0;
              border-top: 1px solid #f1f5f9;
              margin-bottom: 24px;
            }
            .help-text {
              font-size: 12px;
              color: #94a3b8;
              line-height: 1.5;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header-banner">
                <div class="logo-icon">🧠</div>
                <h1 class="header-title">CognifyAI</h1>
              </div>
              <div class="content">
                <div class="greeting">Hello,</div>
                <p class="message-body">
                  Thank you for joining CognifyAI. Please click the button below to confirm your email and activate your account:
                </p>
                <a href="${link}" class="btn-confirm">Confirm Email Address</a>
                <p class="message-body" style="font-size: 12px; margin-top: 20px; color: #94a3b8;">
                  If the button above does not work, copy and paste this URL into your browser: <br>
                  <a href="${link}" style="color: #6366f1;">${link}</a>
                </p>
              </div>
              <div class="footer">
                <hr class="divider">
                <p class="help-text">
                  © 2026 CognifyAI. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    console.log(`[Email Sent] Confirmation email sent successfully to ${email}`);
    return { success: true };
  } catch (err: any) {
    console.error("Nodemailer Error sending confirmation email:", err);
    return { success: false, error: err.message || "Unknown SMTP error" };
  }
}
