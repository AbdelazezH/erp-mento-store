import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendInviteEmail(params: {
  to: string;
  inviterName: string;
  inviteUrl: string;
  role: string;
}) {
  const transporter = createTransporter();
  const roleLabel = params.role === "admin" ? "Administrator" : "Worker";

  await transporter.sendMail({
    from: `"Nexus ERP" <${process.env.EMAIL_FROM ?? process.env.SMTP_USER}>`,
    to: params.to,
    subject: `You've been invited to Nexus ERP`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background:#0f172a;padding:24px 32px;">
                      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">📦 Nexus ERP</h1>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:32px;">
                      <h2 style="margin:0 0 12px;color:#0f172a;font-size:22px;">You're invited!</h2>
                      <p style="margin:0 0 8px;color:#52525b;font-size:15px;line-height:1.6;">
                        <strong>${params.inviterName}</strong> has invited you to join <strong>Nexus ERP</strong> as a <strong>${roleLabel}</strong>.
                      </p>
                      <p style="margin:0 0 28px;color:#52525b;font-size:15px;line-height:1.6;">
                        Click the button below to set up your account and get started.
                      </p>
                      <a href="${params.inviteUrl}"
                         style="display:inline-block;padding:13px 28px;background:#2563eb;color:#fff;
                                text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
                        Accept Invitation →
                      </a>
                      <p style="margin:24px 0 0;color:#a1a1aa;font-size:12px;line-height:1.6;">
                        This link expires in <strong>72 hours</strong>.<br>
                        If you weren't expecting this invitation, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding:16px 32px;background:#f4f4f5;border-top:1px solid #e4e4e7;">
                      <p style="margin:0;color:#a1a1aa;font-size:12px;">Nexus ERP — Inventory & Profit Management</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}
