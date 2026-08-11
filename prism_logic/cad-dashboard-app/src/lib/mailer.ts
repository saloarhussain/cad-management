import nodemailer from 'nodemailer';

export interface MailCredentials {
  user: string;
  password: string;
  senderName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
}

function createTransporter(creds: MailCredentials) {
  return nodemailer.createTransport({
    host: creds.smtpHost || 'smtp.gmail.com',
    port: creds.smtpPort || 465,
    secure: creds.smtpSecure !== undefined ? creds.smtpSecure : true,
    auth: {
      user: creds.user,
      pass: creds.password,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  });
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  credentials: MailCredentials;
}

export async function sendEmail({ to, subject, html, text, credentials }: SendEmailOptions) {
  const transporter = createTransporter(credentials);
  const fromName = credentials.senderName || 'CADONCE CRM';

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${credentials.user}>`,
      to: to.trim(),
      replyTo: credentials.user,
      subject,
      text: text || subject,
      html,
    });

    console.log(`[MAILER] Message sent: ${info.messageId} → ${to}`);
    return info;
  } catch (error: any) {
    if (error.code === 'EAUTH') {
      console.error(`[MAILER] Authentication Failed for ${credentials.user}. Please check your App Password.`);
      throw new Error(`Email authentication failed. If using Gmail, ensure you are using an App Password, not your regular password.`);
    }
    console.error(`[MAILER] Failed to send email to ${to}:`, error.message);
    throw error;
  }
}

// --- Email Templates ---

import { getTaxIdLabel } from './tax';

export function invoiceTemplate(project: any, client: any, orgSettings?: any) {
  const revenue = parseFloat(project.revenue || '0').toLocaleString('en-US');
  const paidAmount = parseFloat(project.paidAmount || '0').toLocaleString('en-US');
  
  // Format Date (e.g., 15 January 2026)
  const dateObj = new Date();
  const invoiceDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const invoiceNo = project.orderId || `M${project.id ? project.id.toString().slice(0, 5).padStart(5, '0') : '10001'}`;

  // Client Details
  const cName = client?.name || project.client || 'Client';
  const cCompany = client?.companyName || client?.name || 'N/A';
  const cEmail = client?.email || project.client_email || 'N/A';
  const cCountry = client?.country || 'N/A';
  const cTaxId = client?.taxId || client?.abn || 'N/A';
  const cPhone = client?.mobile || client?.phone || 'N/A';
  const cAddress = client?.address || 'N/A';
  const cCity = client?.city || 'N/A';
  const cZip = client?.pincode || client?.zipCode || client?.zip || 'N/A';
  
  const taxIdLabel = getTaxIdLabel(cCountry);
  
  // Organization Details
  const orgName = orgSettings?.ownerName || orgSettings?.owner_name || 'Saloar Hussain Anwar Ali Shaikh';
  const orgCompany = orgSettings?.organizationName || orgSettings?.organization_name || 'Minecom';
  const orgEmail = orgSettings?.registeredEmail || orgSettings?.email || orgSettings?.freelanceEmail || 'saloarhussain@icloud.com';
  const orgPhone = orgSettings?.whatsapp || '+91 9975788318';
  
  const orgCountry = orgSettings?.orgCountry || 'India';
  const orgTaxId = orgSettings?.orgTaxId || '27JIQPS4070B2ZU';
  const orgAddress = orgSettings?.orgAddress || '301 Ashiyana Lake View';
  const orgCity = orgSettings?.orgCity || 'Palghar';
  const orgState = orgSettings?.orgState || 'Maharashtra';
  const orgPincode = orgSettings?.orgPincode || '401203';
  
  const orgTaxIdLabel = getTaxIdLabel(orgCountry);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fff; color: #000; margin: 0; padding: 0; }
      .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 40px; box-sizing: border-box; }
      
      /* Header */
      .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
      .header-left { flex: 1; }
      .header-title { font-size: 36px; font-weight: bold; margin: 0 0 40px 0; text-align: center; }
      .invoice-meta { font-size: 16px; font-weight: bold; line-height: 1.5; margin-bottom: 5px; }
      .header-right { text-align: right; }
      .logo { display: inline-flex; align-items: center; font-size: 28px; font-weight: 900; color: #f29c1f; letter-spacing: 1px; }
      .logo-icon { display: inline-flex; justify-content: center; align-items: center; width: 36px; height: 36px; background-color: #f29c1f; color: white; border-radius: 50%; font-size: 24px; margin-right: 10px; font-weight: bold; line-height: 1; }

      /* Two Columns (From / To) */
      .address-container { display: flex; border: 1px solid #e0e0e0; margin-bottom: 30px; }
      .col { flex: 1; border-right: 1px solid #e0e0e0; }
      .col:last-child { border-right: none; }
      .col-header { background-color: #fcae3f; color: white; padding: 10px 20px; font-weight: bold; font-size: 18px; }
      .col-body { padding: 20px; font-size: 14px; line-height: 1.8; }
      .col-body div { margin-bottom: 4px; }
      .label-bold { font-weight: bold; }

      /* Responsive Rules */
      @media (max-width: 600px) {
        .container { padding: 15px; }
        .header-container { flex-direction: column; gap: 15px; }
        .header-right { text-align: left; }
        .address-container { flex-direction: column; }
        .col { border-right: none; border-bottom: 1px solid #e0e0e0; }
        .col:last-child { border-bottom: none; }
        .col-header { padding: 8px 15px; font-size: 16px; }
        .col-body { padding: 15px; font-size: 12px; }
        th, td { padding: 8px 10px !important; font-size: 11px !important; }
        .payment-info { font-size: 12px !important; }
      }

      /* Items Table */
      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      th { background-color: #fcae3f; color: white; text-align: left; padding: 10px 15px; font-weight: bold; font-size: 15px; border-right: 1px solid white; }
      th:last-child { border-right: none; }
      td { padding: 12px 15px; border: 1px solid #e0e0e0; font-size: 14px; }
      td.no-border-x { border-left: none; border-right: none; }
      
      /* Totals */
      .bg-orange { background-color: #fcae3f; color: white; font-weight: bold; }
      .bold-td { font-weight: bold; }
      
      /* Payment Info */
      .payment-info { margin-top: 40px; font-size: 14px; line-height: 1.8; }
      .payment-title { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 15px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1 class="header-title">Invoice</h1>
      
      <div class="header-container">
        <div class="header-left">
          <div class="invoice-meta">INVOICE NO - ${invoiceNo}</div>
          <div class="invoice-meta">INVOICE DATE - ${invoiceDate}</div>
        </div>
        <div class="header-right">
          <div class="logo">
            <div class="logo-icon">M</div> MINECOM
          </div>
        </div>
      </div>

      <div class="address-container">
        <div class="col">
          <div class="col-header">From</div>
          <div class="col-body">
            <div><span class="label-bold">Country</span> - ${orgCountry}</div>
            <div><span class="label-bold">Name</span> - ${orgName}</div>
            <div><span class="label-bold">Company</span> - ${orgCompany}</div>
            <div><span class="label-bold">${orgTaxIdLabel}</span> - ${orgTaxId}</div>
            <div><span class="label-bold">Email</span> - ${orgEmail}</div>
            <div><span class="label-bold">Ph No</span> - ${orgPhone}</div>
            <div><span class="label-bold">Address</span> - ${orgAddress}</div>
            <div><span class="label-bold">City</span> - ${orgCity}</div>
            <div><span class="label-bold">Pincode</span> - ${orgPincode}</div>
            <div><span class="label-bold">State</span> - ${orgState}</div>
          </div>
        </div>
        <div class="col">
          <div class="col-header">To</div>
          <div class="col-body">
            <div><span class="label-bold">Country</span> - ${cCountry}</div>
            <div><span class="label-bold">Name</span> - ${cName}</div>
            <div><span class="label-bold">Company</span> - ${cCompany}</div>
            <div><span class="label-bold">${taxIdLabel}</span> - ${cTaxId}</div>
            <div><span class="label-bold">Email</span> - ${cEmail}</div>
            <div><span class="label-bold">Ph No</span> - ${cPhone}</div>
            <div><span class="label-bold">Address</span> - ${cAddress}</div>
            <div><span class="label-bold">City</span> - ${cCity}</div>
            <div><span class="label-bold">Zip code</span> - ${cZip}</div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40%">Description</th>
            <th>SAC Code</th>
            <th>Qty</th>
            <th>Rate (AUD)</th>
            <th>Total (AUD)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border-left: none;">3D Jewellery CAD Design Work - ${project.title}</td>
            <td>998391</td>
            <td>1</td>
            <td>$${revenue}</td>
            <td style="border-right: none;">$${revenue}</td>
          </tr>
          <tr>
            <td class="bold-td" style="border-left: none;">Subtotal</td>
            <td class="no-border-x"></td>
            <td class="no-border-x"></td>
            <td class="no-border-x"></td>
            <td class="bold-td" style="border-right: none;">$${revenue} AUD</td>
          </tr>
          <tr>
            <td class="bold-td" style="border-left: none;">GST (0% - Export)</td>
            <td class="no-border-x"></td>
            <td class="no-border-x"></td>
            <td class="no-border-x"></td>
            <td class="bold-td" style="border-right: none;">$0</td>
          </tr>
          <tr>
            <td class="bold-td" style="border-left: none; border-bottom: none;">Total Amount</td>
            <td style="border: none;"></td>
            <td style="border: none;"></td>
            <td style="border: none;"></td>
            <td class="bg-orange" style="border-right: none; border-bottom: none;">$${revenue} AUD</td>
          </tr>
        </tbody>
      </table>

      <div class="payment-info">
        <div class="payment-title">PAYMENT INFORMATION:</div>
        <div><span class="label-bold">Bank Name :</span> Monoova Payments Pty Ltd</div>
        <div><span class="label-bold">Bank Location :</span> AUSTRALIA</div>
        <div><span class="label-bold">Account Holder’s Name :</span> SALOAR HUSSAIN ANWAR ALI SHAIKH</div>
        <div><span class="label-bold">Account Type :</span> Current</div>
        <div><span class="label-bold">BIC :</span> CUSCAU2SXXX</div>
        <div><span class="label-bold">Bank State Branch Code (BSB) :</span> 802985</div>
        <div><span class="label-bold">Bank Account Number :</span> 416552962</div>
        <div><span class="label-bold">Bank Address :</span> Level 11, Darling Park Tower 1, 201 Sussex Street, Sydney NSW 2000, Australia</div>
      </div>
    </div>
  </body>
  </html>
  `;
}

export function composeTemplate(recipient: string, subject: string, content: string, projectRef: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #111; color: #f0f0f0; margin: 0; padding: 0; }
      .container { max-width: 620px; margin: 40px auto; background: #1a1a17; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a22; }
      .header { background: linear-gradient(135deg, #fce003, #FF2626); padding: 24px 40px; }
      .header h1 { margin: 0; color: #000; font-size: 20px; font-weight: 900; }
      .body { padding: 40px; }
      .ref-badge { display: inline-block; background: #222218; border: 1px solid #fce003/30; color: #fce003; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; margin-bottom: 20px; }
      .content { font-size: 15px; color: #c0c0b0; line-height: 1.7; white-space: pre-wrap; }
      .footer { padding: 24px 40px; border-top: 1px solid #2a2a22; font-size: 11px; color: #555545; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>CADONCE Studio</h1>
      </div>
      <div class="body">
        ${projectRef ? `<span class="ref-badge">📁 ${projectRef}</span>` : ''}
        <div class="content">${content.replace(/\n/g, '<br/>')}</div>
      </div>
      <div class="footer">
        Sent via CADONCE CRM &bull; CADONCE Studio
      </div>
    </div>
  </body>
  </html>
  `;
}
export function deliveryTemplate(project: any, clientName: string, magicLink: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #0c0a04; color: #f0f0f0; margin: 0; padding: 0; }
      .container { max-width: 620px; margin: 40px auto; background: #14120a; border-radius: 24px; overflow: hidden; border: 1px solid #2a2a18; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
      .header { background: linear-gradient(135deg, #fce003, #FEA500); padding: 48px 40px; text-align: center; }
      .header h1 { margin: 0; color: #000; font-size: 32px; font-weight: 900; letter-spacing: -1.5px; text-transform: uppercase; }
      .header p { margin: 8px 0 0; color: #383100; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; }
      .body { padding: 48px 40px; }
      .greeting { font-size: 18px; color: #fff; font-weight: 700; margin-bottom: 16px; }
      .intro { color: #888878; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
      .project-card { background: #1c1a12; border: 1px solid #2a2a18; border-radius: 16px; padding: 24px; margin-bottom: 40px; }
      .label { color: #555545; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; display: block; }
      .value { color: #fce003; font-weight: 900; font-size: 16px; margin-bottom: 20px; display: block; }
      .cta-button { display: block; background: linear-gradient(135deg, #fce003, #FEA500); color: #000 !important; text-decoration: none; text-align: center; padding: 20px; rounded-radius: 12px; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-top: 32px; border-radius: 12px; transition: transform 0.2s; }
      .footer { padding: 32px 40px; border-top: 1px solid #2a2a18; font-size: 10px; color: #444435; text-align: center; line-height: 1.8; text-transform: uppercase; letter-spacing: 1px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <p>Your Design is Ready</p>
        <h1>Master Review</h1>
      </div>
      <div class="body">
        <p class="greeting">Hello ${clientName},</p>
        <p class="intro">Great news! Our design team has completed the latest 3D CAD model for your project. You can now access the interactive viewport to review the design in full 3D detail.</p>
        
        <div class="project-card">
          <span class="label">Project Title</span>
          <span class="value">${project.title}</span>
          
          <span class="label">Order Reference</span>
          <span class="value">#${project.orderId || project.id.slice(-6)}</span>
          
          <span class="label">Interactive Engine</span>
          <span class="value">CADONCE 3D Viewport</span>
        </div>

        <a href="${magicLink}" class="cta-button">Open 3D Viewport</a>
        
        <p style="color:#555545; font-size:12px; text-align:center; margin-top:32px;">
          Note: For your security, you will be asked to verify your email upon clicking the link.
        </p>
      </div>
      <div class="footer">
        CADONCE Studio &bull; Precision Craftsmanship &bull; 2026
      </div>
    </div>
  </body>
  </html>
  `;
}
export function clientInviteTemplate(client: any, magicLink: string, organizationName: string = 'CADONCE') {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #0c0a04; color: #f0f0f0; margin: 0; padding: 0; }
      .container { max-width: 620px; margin: 40px auto; background: #14120a; border-radius: 24px; overflow: hidden; border: 1px solid #2a2a18; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
      .header { background: linear-gradient(135deg, #fce003, #FEA500); padding: 48px 40px; text-align: center; }
      .header h1 { margin: 0; color: #000; font-size: 32px; font-weight: 900; letter-spacing: -1.5px; text-transform: uppercase; }
      .header p { margin: 8px 0 0; color: #383100; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; }
      .body { padding: 48px 40px; }
      .greeting { font-size: 18px; color: #fff; font-weight: 700; margin-bottom: 16px; }
      .intro { color: #888878; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
      .profile-card { background: #1c1a12; border: 1px solid #2a2a18; border-radius: 16px; padding: 24px; margin-bottom: 40px; }
      .label { color: #555545; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; display: block; }
      .value { color: #fce003; font-weight: 900; font-size: 16px; margin-bottom: 20px; display: block; }
      .cta-button { display: inline-block; padding: 18px 30px; border-radius: 12px; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; transition: transform 0.2s; text-align: center; }
      .btn-accept { background: linear-gradient(135deg, #fce003, #FEA500); color: #000 !important; }
      .btn-deny { background: #222; color: #888 !important; border: 1px solid #333; }
      .footer { padding: 32px 40px; border-top: 1px solid #2a2a18; font-size: 10px; color: #444435; text-align: center; line-height: 1.8; text-transform: uppercase; letter-spacing: 1px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <p>Strategic Partnership</p>
        <h1>Studio Access</h1>
      </div>
      <div class="body">
        <p class="greeting">Hello ${client.name},</p>
        <p class="intro">You have been invited to join the <strong>${organizationName}</strong> workspace on CADONCE. As a strategic partner, you will have access to real-time project tracking, interactive 3D viewports, and direct communication with your design team.</p>
        
        <div class="profile-card">
          <span class="label">Partner Name</span>
          <span class="value">${client.name}</span>
          
          <span class="label">Organization</span>
          <span class="value">${client.companyName || 'Independent Agent'}</span>
          
          <span class="label">Access Level</span>
          <span class="value">Authorized Client</span>
        </div>
 
        <div style="display: flex; gap: 12px; margin-top: 32px;">
          <a href="${magicLink}" class="cta-button btn-accept" style="flex: 1;">Accept Invitation</a>
        </div>
        
        <p style="color:#555545; font-size:12px; text-align:center; margin-top:32px;">
          Note: This is a private link. Please do not share it with anyone else.
        </p>
      </div>
      <div class="footer">
        CADONCE Studio &bull; Creative Intelligence &bull; 2026
      </div>
    </div>
  </body>
  </html>
  `;
}

export function designerInviteTemplate(designer: any, magicLink: string, organizationName: string = 'CADONCE') {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #0c0a04; color: #f0f0f0; margin: 0; padding: 0; }
      .container { max-width: 620px; margin: 40px auto; background: #14120a; border-radius: 24px; overflow: hidden; border: 1px solid #2a2a18; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
      .header { background: linear-gradient(135deg, #fce003, #FEA500); padding: 48px 40px; text-align: center; }
      .header h1 { margin: 0; color: #000; font-size: 32px; font-weight: 900; letter-spacing: -1.5px; text-transform: uppercase; }
      .header p { margin: 8px 0 0; color: #383100; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; }
      .body { padding: 48px 40px; }
      .greeting { font-size: 18px; color: #fff; font-weight: 700; margin-bottom: 16px; }
      .intro { color: #888878; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
      .profile-card { background: #1c1a12; border: 1px solid #2a2a18; border-radius: 16px; padding: 24px; margin-bottom: 40px; }
      .label { color: #555545; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; display: block; }
      .value { color: #fce003; font-weight: 900; font-size: 16px; margin-bottom: 20px; display: block; }
      .cta-button { display: inline-block; padding: 18px 30px; border-radius: 12px; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; transition: transform 0.2s; text-align: center; }
      .btn-accept { background: linear-gradient(135deg, #fce003, #FEA500); color: #000 !important; }
      .btn-deny { background: #222; color: #888 !important; border: 1px solid #333; }
      .footer { padding: 32px 40px; border-top: 1px solid #2a2a18; font-size: 10px; color: #444435; text-align: center; line-height: 1.8; text-transform: uppercase; letter-spacing: 1px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <p>Welcome to the Studio</p>
        <h1>Workstation Access</h1>
      </div>
      <div class="body">
        <p class="greeting">Hello ${designer.fullName},</p>
        <p class="intro">You have been invited to join the <strong>${organizationName}</strong> design team on CADONCE. Your secure digital workstation is now ready. Click the button below to access your private portal where you can manage your projects, track your performance, and collaborate directly with <strong>${organizationName}</strong>.</p>
        
        <div class="profile-card">
          <span class="label">Professional Identity</span>
          <span class="value">${designer.fullName}</span>
          
          <span class="label">Specialty</span>
          <span class="value">${Array.isArray(designer.skills) ? designer.skills.join(' • ') : designer.specialty}</span>
          
          <span class="label">Access Level</span>
          <span class="value">Verified Professional</span>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 32px;">
          <a href="${magicLink}" class="cta-button btn-accept" style="flex: 1;">Accept Invitation</a>
          <a href="https://www.cadonce.com/team" class="cta-button btn-deny" style="flex: 1;">Decline</a>
        </div>
        
        <p style="color:#555545; font-size:12px; text-align:center; margin-top:32px;">
          Note: This is a private link. Please do not share it with anyone else.
        </p>
      </div>
      <div class="footer">
        CADONCE Studio &bull; Creative Excellence &bull; 2026
      </div>
    </div>
  </body>
  </html>
  `;
}

export function briefingTemplate(project: any, magicLink: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #0c0a04; color: #f0f0f0; margin: 0; padding: 0; }
      .container { max-width: 620px; margin: 40px auto; background: #14120a; border-radius: 24px; overflow: hidden; border: 1px solid #2a2a18; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
      .header { background: linear-gradient(135deg, #007cf0, #00dfd8); padding: 48px 40px; text-align: center; }
      .header h1 { margin: 0; color: #fff; font-size: 32px; font-weight: 900; letter-spacing: -1.5px; text-transform: uppercase; }
      .header p { margin: 8px 0 0; color: #fff/80; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; }
      .body { padding: 48px 40px; }
      .greeting { font-size: 18px; color: #fff; font-weight: 700; margin-bottom: 16px; }
      .intro { color: #888878; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
      .project-card { background: #1c1a12; border: 1px solid #2a2a18; border-radius: 16px; padding: 24px; margin-bottom: 40px; }
      .label { color: #555545; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; display: block; }
      .value { color: #00dfd8; font-weight: 900; font-size: 16px; margin-bottom: 20px; display: block; }
      .cta-button { display: block; background: linear-gradient(135deg, #007cf0, #00dfd8); color: #fff !important; text-decoration: none; text-align: center; padding: 20px; rounded-radius: 12px; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-top: 32px; border-radius: 12px; transition: transform 0.2s; }
      .footer { padding: 32px 40px; border-top: 1px solid #2a2a18; font-size: 10px; color: #444435; text-align: center; line-height: 1.8; text-transform: uppercase; letter-spacing: 1px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <p>Project Initialization</p>
        <h1>Design Briefing</h1>
      </div>
      <div class="body">
        <p class="greeting">Requirement Gathering for ${project.title}</p>
        <p class="intro">To ensure your design is executed with precision, we require your detailed specifications. Please access our secure briefing portal to provide your vision, reference imagery, and technical requirements.</p>
        
        <div class="project-card">
          <span class="label">Project Title</span>
          <span class="value">${project.title}</span>
          
          <span class="label">Client Identity</span>
          <span class="value">${project.client || 'Valued Partner'}</span>
          
          <span class="label">Protocol</span>
          <span class="value">Creative Intelligence Sync</span>
        </div>

        <a href="${magicLink}" class="cta-button">Enter Briefing Portal</a>
      </div>
      <div class="footer">
        CADONCE Studio &bull; Creative Intelligence &bull; 2026
      </div>
    </div>
  </body>
  </html>
  `;
}

export function projectAssignmentTemplate(project: any, organizationName: string, magicLink: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #0c0a04; color: #f0f0f0; margin: 0; padding: 0; }
      .container { max-width: 620px; margin: 40px auto; background: #14120a; border-radius: 24px; overflow: hidden; border: 1px solid #2a2a18; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
      .header { background: linear-gradient(135deg, #fce003, #FEA500); padding: 48px 40px; text-align: center; }
      .header h1 { margin: 0; color: #000; font-size: 32px; font-weight: 900; letter-spacing: -1.5px; text-transform: uppercase; }
      .header p { margin: 8px 0 0; color: #383100; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; }
      .body { padding: 48px 40px; }
      .greeting { font-size: 18px; color: #fff; font-weight: 700; margin-bottom: 16px; }
      .intro { color: #888878; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
      .project-card { background: #1c1a12; border: 1px solid #2a2a18; border-radius: 16px; padding: 24px; margin-bottom: 40px; }
      .label { color: #555545; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; display: block; }
      .value { color: #fce003; font-weight: 900; font-size: 16px; margin-bottom: 20px; display: block; }
      .cta-button { display: block; background: linear-gradient(135deg, #fce003, #FEA500); color: #000 !important; text-decoration: none; text-align: center; padding: 20px; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-top: 32px; border-radius: 12px; transition: transform 0.2s; }
      .footer { padding: 32px 40px; border-top: 1px solid #2a2a18; font-size: 10px; color: #444435; text-align: center; line-height: 1.8; text-transform: uppercase; letter-spacing: 1px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <p>New Assignment</p>
        <h1>Project Assigned</h1>
      </div>
      <div class="body">
        <p class="greeting">Hello,</p>
        <p class="intro"><strong>${organizationName}</strong> has assigned you a new project. You can view the project details and access the workstation by clicking the button below.</p>
        
        <div class="project-card">
          <span class="label">Project Title</span>
          <span class="value">${project.title}</span>
          
          <span class="label">Order Reference</span>
          <span class="value">#${project.orderId || project.id.slice(-6)}</span>
          
          <span class="label">Organization</span>
          <span class="value">${organizationName || 'CADONCE'}</span>
        </div>

        <a href="${magicLink}" class="cta-button">View Project Details</a>
      </div>
      <div class="footer">
        CADONCE Studio &bull; Precision Craftsmanship &bull; 2026
      </div>
    </div>
  </body>
  </html>
  `;
}

export function fundsReleasedTemplate(project: any, amount: string, currency: string, magicLink: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #0c0a04; color: #f0f0f0; margin: 0; padding: 0; }
      .container { max-width: 620px; margin: 40px auto; background: #14120a; border-radius: 24px; overflow: hidden; border: 1px solid #2a2a18; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
      .header { background: linear-gradient(135deg, #10b981, #059669); padding: 48px 40px; text-align: center; }
      .header h1 { margin: 0; color: #fff; font-size: 32px; font-weight: 900; letter-spacing: -1.5px; text-transform: uppercase; }
      .header p { margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; }
      .body { padding: 48px 40px; }
      .greeting { font-size: 18px; color: #fff; font-weight: 700; margin-bottom: 16px; }
      .intro { color: #888878; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
      .project-card { background: #1c1a12; border: 1px solid #2a2a18; border-radius: 16px; padding: 24px; margin-bottom: 40px; }
      .label { color: #555545; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; display: block; }
      .value { color: #10b981; font-weight: 900; font-size: 24px; margin-bottom: 20px; display: block; }
      .cta-button { display: block; background: linear-gradient(135deg, #10b981, #059669); color: #fff !important; text-decoration: none; text-align: center; padding: 20px; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-top: 32px; border-radius: 12px; transition: transform 0.2s; }
      .footer { padding: 32px 40px; border-top: 1px solid #2a2a18; font-size: 10px; color: #444435; text-align: center; line-height: 1.8; text-transform: uppercase; letter-spacing: 1px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <p>Payment Processed</p>
        <h1>Funds Released</h1>
      </div>
      <div class="body">
        <p class="greeting">Hello,</p>
        <p class="intro">Great news! The organization has released the funds for your project. The amount has been added to your virtual wallet.</p>
        
        <div class="project-card">
          <span class="label">Project Title</span>
          <span class="value" style="font-size: 16px; color: #fff;">${project.title}</span>
          
          <span class="label">Amount Released</span>
          <span class="value">${currency}${amount}</span>
          
          <span class="label">Status</span>
          <span class="value" style="font-size: 14px; color: #10b981;">Credited to Wallet</span>
        </div>

        <a href="${magicLink}" class="cta-button">View Wallet</a>
      </div>
      <div class="footer">
        CADONCE Studio &bull; Precision Craftsmanship &bull; 2026
      </div>
    </div>
  </body>
  </html>
  `;
}

export function feedbackReceivedTemplate(project: any, rating: number, comment: string, magicLink: string) {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #0c0a04; color: #f0f0f0; margin: 0; padding: 0; }
      .container { max-width: 620px; margin: 40px auto; background: #14120a; border-radius: 24px; overflow: hidden; border: 1px solid #2a2a18; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
      .header { background: linear-gradient(135deg, #fce003, #FEA500); padding: 48px 40px; text-align: center; }
      .header h1 { margin: 0; color: #000; font-size: 32px; font-weight: 900; letter-spacing: -1.5px; text-transform: uppercase; }
      .header p { margin: 8px 0 0; color: #383100; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; }
      .body { padding: 48px 40px; }
      .greeting { font-size: 18px; color: #fff; font-weight: 700; margin-bottom: 16px; }
      .intro { color: #888878; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
      .project-card { background: #1c1a12; border: 1px solid #2a2a18; border-radius: 16px; padding: 24px; margin-bottom: 40px; }
      .label { color: #555545; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; display: block; }
      .value { color: #fce003; font-weight: 900; font-size: 16px; margin-bottom: 20px; display: block; }
      .stars { color: #fce003; font-size: 24px; margin-bottom: 10px; }
      .comment { color: #c0c0b0; font-size: 14px; font-style: italic; line-height: 1.6; }
      .cta-button { display: block; background: linear-gradient(135deg, #fce003, #FEA500); color: #000 !important; text-decoration: none; text-align: center; padding: 20px; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-top: 32px; border-radius: 12px; transition: transform 0.2s; }
      .footer { padding: 32px 40px; border-top: 1px solid #2a2a18; font-size: 10px; color: #444435; text-align: center; line-height: 1.8; text-transform: uppercase; letter-spacing: 1px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <p>Performance Review</p>
        <h1>Feedback Received</h1>
      </div>
      <div class="body">
        <p class="greeting">Hello,</p>
        <p class="intro">The organization has left feedback on your project. Here are the details:</p>
        
        <div class="project-card">
          <span class="label">Project Title</span>
          <span class="value">${project.title}</span>
          
          <span class="label">Rating</span>
          <div class="stars">${stars}</div>
          
          <span class="label">Comment</span>
          <div class="comment">"${comment}"</div>
        </div>

        <a href="${magicLink}" class="cta-button">View Project</a>
      </div>
      <div class="footer">
        CADONCE Studio &bull; Precision Craftsmanship &bull; 2026
      </div>
    </div>
  </body>
  </html>
  `;
}
