const helper = require('../../common/helper');

exports.sendPaymentNotification = async (orderId) => {
  try {
    const [rows] = await helper.db.query(
      `SELECT o.invoice, o.total, a.nama, a.no_wa, a.email, p.nama AS product_name
       FROM \`order\` o
       JOIN account a ON o.account_id = a.id
       JOIN products p ON o.products_id = p.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (rows.length === 0) {
      console.log('Order not found for notification:', orderId);
      return;
    }

    const { invoice, total, nama, no_wa, email, product_name } = rows[0];
    const totalStr = 'Rp' + parseInt(total).toLocaleString('id-ID');

    const message = `Halo ${nama},
Pembayaran Anda untuk ${product_name} sebesar ${totalStr} dengan invoice ${invoice} telah kami terima.

Terima kasih telah berbelanja di Telegram Booster ദ്ദി◝ ⩊ ◜.ᐟ`;

    const wa = require('../whatsapp/whatsapp_controller');
    wa.send_wa({ no_wa, pesan: message }).catch(e => {
      console.log('Failed to send WA notification:', e.message);
    });

    const emailService = require('../email/email_service');
    const subject = 'Pembayaran Diterima - Telegram Booster';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Pembayaran Diterima</h2>
        <p>Halo <strong>${nama}</strong>,</p>
        <p>Pembayaran Anda untuk <strong>${product_name}</strong> sebesar <strong>${totalStr}</strong> dengan invoice <strong>${invoice}</strong> telah kami terima.</p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Detail Konfirmasi</h3>
          <p><strong>Invoice:</strong> ${invoice}</p>
          <p><strong>Produk:</strong> ${product_name}</p>
          <p><strong>Total Dibayar:</strong> ${totalStr}</p>
          <p><strong>Status:</strong> LUNAS</p>
        </div>

        <p>Pesanan Anda akan segera diproses. Kami akan mengirimkan informasi lebih lanjut jika diperlukan.</p>

        <p style="color: #6c757d; margin-top: 30px;">
          Hormat kami,<br>
          <strong>Tim Telegram Booster</strong>
        </p>
      </div>
    `;

    emailService.sendEmail(email, subject, html).catch(e => {
      console.log('Failed to send email notification:', e.message);
    });

  } catch (e) {
    console.log('Payment notification error:', e.message);
  }
};
