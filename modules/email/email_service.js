const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: to,
      subject: subject,
      html: html
    });
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email error:', error.message);
    return { success: false, error: error.message };
  }
};

exports.sendCheckoutEmail = async (dt) => {
  if (dt.status == 'failed') {
    return dt;
  }

  const { email, nama, product_name, harga, qty, generated_password } = dt.payload;
  
  const total = parseInt(harga) * parseInt(qty);
  
  const subject = 'Terima kasih telah melakukan pembelian - Telegram Booster';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Terima kasih telah melakukan pembelian!</h2>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Detail Pesanan</h3>
        <p><strong>Produk:</strong> ${product_name}</p>
        <p><strong>Harga:</strong> Rp${parseInt(harga).toLocaleString('id-ID')}</p>
        <p><strong>Jumlah:</strong> ${qty}</p>
        <p><strong>Total:</strong> Rp${total.toLocaleString('id-ID')}</p>
      </div>
      
      <div style="background: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Informasi Pembayaran</h3>
        <p><strong>Bank:</strong> BCA</p>
        <p><strong>No Rekening:</strong> 123456789</p>
        <p><strong> Atas Nama:</strong> PT. Star Frost</p>
        <p style="color: #dc3545;">Setelah melakukan pembayaran, silakan kirim bukti pembayaran ke WhatsApp: ${process.env.WA_NUMBER}</p>
      </div>
      
      ${generated_password ? `
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
        <h3 style="margin-top: 0; color: #856404;">Akun Login Anda</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${generated_password}</p>
        <p style="font-size: 12px; color: #856404;">Catat credentials di atas untuk login di website. Anda bisa ubah password kapan saja di halaman Account.</p>
      </div>
      ` : ''}
      
      <p style="color: #6c757d; margin-top: 30px;">
        Hormat kami,<br>
        <strong>Tim Telegram Booster</strong>
      </p>
    </div>
  `;

  const result = await exports.sendEmail(email, subject, html);
  
  if (!result.success) {
    console.log('Failed to send email:', result.error);
  }
  
  return dt;
};
