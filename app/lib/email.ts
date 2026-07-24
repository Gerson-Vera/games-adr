import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });
}

export async function sendTwoFactorEmail(
  to: string,
  code: string,
  username: string
) {
  if (process.env.NODE_ENV === "development") {
    console.log(`\n[2FA DEV] Para: ${to} | Código: ${code}\n`);
    return;
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: `Versus de Conocimientos <${process.env.EMAIL_FROM}>`,
    to,
    subject: "Tu código de verificación - Versus de Conocimientos",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #09090b; color: #fafafa; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #6366f1; font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 0;">
            ⚡ VERSUS
          </h1>
          <p style="color: #71717a; margin: 4px 0 0;">de Conocimientos</p>
        </div>
        <p style="color: #a1a1aa;">Hola <strong style="color: #fafafa;">${username}</strong>,</p>
        <p style="color: #a1a1aa;">Tu código de verificación de dos factores es:</p>
        <div style="background: #18181b; border: 1px solid #27272a; padding: 28px; border-radius: 12px; text-align: center; margin: 20px 0;">
          <span style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #6366f1; font-family: monospace;">
            ${code}
          </span>
        </div>
        <p style="color: #71717a; font-size: 13px;">
          Este código expira en <strong>10 minutos</strong>. No lo compartas con nadie.
        </p>
        <hr style="border: none; border-top: 1px solid #27272a; margin: 20px 0;" />
        <p style="color: #52525b; font-size: 12px; text-align: center;">
          Si no solicitaste este código, ignora este mensaje.
        </p>
      </div>
    `,
  });
}
