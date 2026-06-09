const crypto = require('crypto');
const helper = require("../../common/helper");

// Helper function to generate random password
function generateRandomPassword(length) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

exports.checkout_capture_payload = async (body) => {
  let nama = body?.nama || '';
  let email = body?.email || '';
  let no_wa = body?.no_wa?.trim() || '';
  let password = body?.password || '';
  let payment_method = body?.payment_method || '';
  let product_id = body?.product_id || '';
  let qty = body?.qty || '';
  let kupon = body?.kupon || '';
  let account_id = body?.account_id || null;
  let cardName = body?.cardName || '';
  let cardNumber = body?.cardNumber || '';
  let cardExpiry = body?.cardExpiry || '';

  let dt = {
    payload: {
      nama: nama,
      email: email,
      no_wa: no_wa,
      password: password,
      payment_method: payment_method,
      product_id: product_id,
      qty: qty,
      kupon: kupon,
      account_id: account_id,
      cardName: cardName,
      cardNumber: cardNumber,
      cardExpiry: cardExpiry
    },
    code: 200,
    status: 'success',
    message: 'success',
    data: {}
  }

  return dt;
}

exports.checkout_validasi = async (dt) => {
  if (dt.status == 'failed') {
    return dt;
  }

  if (dt.payload.nama == '') {
    dt.message = 'nama is required';
    dt.status = 'failed';
    dt.code = 400;
  }

  if (dt.payload.email == '') {
    dt.message = 'email is required';
    dt.status = 'failed';
    dt.code = 400;
  }

  if (dt.payload.no_wa == '') {
    dt.message = 'no_wa is required';
    dt.status = 'failed';
    dt.code = 400;
  }

  if (dt.payload.payment_method !== 'card' && dt.payload.password == '') {
    dt.message = 'password is required';
    dt.status = 'failed';
    dt.code = 400;
  }

  if (dt.payload.payment_method == '') {
    dt.message = 'payment_method is required';
    dt.status = 'failed';
    dt.code = 400;
  }

  if (dt.payload.product_id == '') {
    dt.message = 'product_id is required';
    dt.status = 'failed';
    dt.code = 400;
  }

  if (dt.payload.qty == '') {
    dt.message = 'qty is required';
    dt.status = 'failed';
    dt.code = 400;
  }

  if (dt.payload.payment_method === 'card' && dt.payload.cardExpiry == '') {
    dt.message = 'card_expiry is required';
    dt.status = 'failed';
    dt.code = 400;
  }
  
  return dt;
}

exports.checkout_validate_kupon = async (dt) => {
  if (dt.status == 'failed') {
    return dt;
  }

  if (!dt.payload.kupon || dt.payload.kupon.trim() === '') {
    dt.payload.diskon = 0;
    return dt;
  }

  const subtotal = parseInt(dt.payload.harga) * parseInt(dt.payload.qty);

  try {
    const [rows] = await helper.db.query(
      `SELECT id, kode, potongan, min_order, tipe, status, valid_from, valid_until FROM kupon WHERE kode = ? AND (valid_from IS NULL OR valid_from <= NOW()) AND (valid_until IS NULL OR valid_until >= NOW())`,
      [dt.payload.kupon.trim().toUpperCase()]
    );

    if (rows.length === 0) {
      dt.payload.diskon = 0;
      return dt;
    }

    const coupon = rows[0];

    if (coupon.status !== 'aktif') {
      dt.payload.diskon = 0;
      return dt;
    }

    const now = new Date();

    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      dt.payload.diskon = 0;
      return dt;
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      dt.payload.diskon = 0;
      return dt;
    }

    if (subtotal < coupon.min_order) {
      dt.payload.diskon = 0;
      return dt;
    }

    let potongan = parseInt(coupon.potongan);
    if (coupon.tipe === 'percentage') {
      potongan = Math.round(subtotal * potongan / 100);
    }
    dt.payload.diskon = potongan;
    dt.payload.kupon_id = coupon.id;
  } catch (e) {
    console.log(e.stack);
    dt.payload.diskon = 0;
  }

  return dt;
}

exports.checkout_get_bank_info = async (dt) => {
  if (dt.status == 'failed') {
    return dt;
  }

  // Skip bank info for card payments
  if (dt.payload.payment_method === 'card') {
    return dt;
  }

  try {
    let query;
    if (dt.payload.payment_method === 'qris') {
      query = `SELECT id, jenis_bank, no_rek, atas_nama FROM bank WHERE jenis_bank = 'QRIS' AND status = 'aktif' LIMIT 1`;
    } else {
      query = `SELECT id, jenis_bank, no_rek, atas_nama FROM bank WHERE status = 'aktif' AND jenis_bank != 'QRIS' LIMIT 1`;
    }
    const [bankRows] = await helper.db.query(query);
    if (bankRows.length > 0) {
      dt.payload.bank_name = bankRows[0].jenis_bank;
      dt.payload.bank_account = bankRows[0].no_rek;
      dt.payload.bank_owner = bankRows[0].atas_nama;
      dt.payload.bank_id = bankRows[0].id;
    }
  } catch (e) {
    console.log('Failed to read bank info:', e.message);
  }

  return dt;
}

exports.checkout_get_harga = async (dt) => {
  if (dt.status == 'failed') {
   return dt;
  } 
  
  let where = "";
  let productId = dt.payload.product_id;
  
  if (isNaN(productId)) {
    where = `slug = ?`;
  } else {
    where = `id = ?`;
  }
  
  const [rows] = await helper.db.query(`SELECT id, nama, slug, harga, kode_unik, periode FROM products WHERE ${where}`, [productId]);
  if (rows.length == 0) {
   dt.message = 'product not found';
   dt.status = 'failed';
   dt.code = 400;
   return dt;
  }
  dt.payload.harga = rows[0].harga;
  dt.payload.product_name = rows[0].nama;
  dt.payload.product_slug = rows[0].slug;
  dt.payload.kode_unik = rows[0].kode_unik || 0;
  dt.payload.periode = rows[0].periode;
  dt.payload.product_id = rows[0].id;

  return dt;
}

exports.checkout_begin_transaction = async (dt) => {
  if (dt.status == 'failed') {
    return dt;
  }
  try {
    let con = await helper.db.getConnection();
    dt.con = con;
    await con.beginTransaction();
  } catch (e) {
    console.log(e.stack);
    dt.code=400;
    dt.status='failed';
    dt.message='failed to begin transaction';
  }
  return dt;
}

exports.checkout_create_account = async (dt) => {
  if (dt.status == 'failed') {
    return dt;
  }

  try {
    // If account_id provided (user already logged in), use existing account
    if (dt.payload.account_id) {
      dt.payload.pelanggan_id = dt.payload.account_id;
      dt.code = 200;
      dt.status = 'success';
      dt.message = 'success';
      dt.data = dt.payload.pelanggan_id;
      return dt;
    }
    
    // Guest checkout: check by email, create if not exists
    const [rows] = await helper.db.query(`SELECT id FROM account WHERE email = ?`, [dt.payload.email]);
    if (rows.length == 0) {
        const WordPressHash = require('wordpress-hash-node');
        
        // Generate random password for guest
        const rawPassword = generateRandomPassword(8);
        const hashedPassword = WordPressHash.HashPassword(rawPassword);
        
        const [rows2] = await helper.db.query(
          `INSERT INTO account (nama, email, no_wa, password) VALUES (?, ?, ?, ?)`,
          [dt.payload.nama, dt.payload.email, dt.payload.no_wa, hashedPassword]
        );
        dt.payload.pelanggan_id = rows2.insertId;
        
        // Generate activation token
        const activationToken = crypto.randomBytes(32).toString('hex');
        const activationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await helper.db.query(`UPDATE account SET activation_token = ?, activation_token_expiry = ? WHERE id = ?`, [activationToken, activationExpiry, rows2.insertId]);
        dt.payload.activation_token = activationToken;
        
        // Store raw password for WhatsApp message (temporary, will be sent)
        dt.payload.generated_password = rawPassword;
        dt.payload.generated_email = dt.payload.email;
        dt.payload.generated_name = dt.payload.nama;
    } else {
        dt.payload.pelanggan_id = rows[0].id;
    }
      dt.code=200;
      dt.status='success';
      dt.message='success';
      dt.data = dt.payload.pelanggan_id;
  } catch (e) {
    console.log(e.stack);
    dt.code=400;
    dt.status='failed';
    dt.message='failed to create user';
  }

return dt;
}

exports.checkout_create_order = async (dt) => {
  if (dt.status == 'failed') {
    return dt;
  }
  try {
    let diskon = parseInt(dt.payload.diskon) || 0;
    let kodeUnik = parseInt(dt.payload.kode_unik) || 0;
    let subtotal = parseInt(dt.payload.harga) * parseInt(dt.payload.qty);
    let total = subtotal - diskon - kodeUnik;
    if (total < 0) total = 0;
    dt.payload.subtotal = subtotal;
    dt.payload.total = total;
    dt.payload.kode_unik = kodeUnik;
    const kuponId = dt.payload.kupon_id || null;
    const bankId = dt.payload.bank_id || null;

    const [result] = await dt.con.query(
      `INSERT INTO \`order\` (account_id, products_id, harga, qty, subtotal, kupon_id, diskon_jumlah, total, bank_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dt.payload.pelanggan_id, dt.payload.product_id, dt.payload.harga, dt.payload.qty, subtotal, kuponId, diskon, total, bankId]
    );
    dt.payload.order_id = result.insertId;

    // Generate invoice number using order_id (guaranteed unique)
    const slug = dt.payload.product_slug || '';
    const pcMatch = slug.match(/-(\d+)pc$/);
    const pcCount = pcMatch ? parseInt(pcMatch[1]) : 1;
    const periode = parseInt(dt.payload.periode) || 1;
    const productCode = `${pcCount}${periode === 100 ? '9' : '0'}0`;

    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');

    const invoice = `INV-${dateStr}-${productCode}-${result.insertId}`;
    dt.payload.invoice = invoice;

    await dt.con.query(`UPDATE \`order\` SET invoice = ? WHERE id = ?`, [invoice, result.insertId]);

    // Track coupon usage
    if (kuponId) {
      await dt.con.query(
        `UPDATE kupon SET used_count = COALESCE(used_count, 0) + 1 WHERE id = ?`,
        [kuponId]
      );
      await dt.con.query(
        `INSERT INTO kupon_usage (kupon_id, order_id, used_at) VALUES (?, ?, NOW())`,
        [kuponId, result.insertId]
      );
    }

    // Set response data with invoice
    dt.data = {
      order_id: result.insertId,
      invoice: invoice,
      harga: dt.payload.harga,
      product_name: dt.payload.product_name,
      qty: dt.payload.qty,
      kode_unik: kodeUnik,
      diskon: diskon,
      total: total,
      subtotal: subtotal
    };

    if (dt.payload.generated_password) {
      dt.data.generated_password = dt.payload.generated_password;
      dt.data.generated_email = dt.payload.generated_email;
    }

    dt.code = 200;
    dt.message = "success";
    dt.status = "success";
  } catch (e) {
    console.log(e.stack);
    dt.code=400;
    dt.status='failed';
    dt.message='failed to create order';
  }
 
  return dt;
}

exports.checkout_create_order_item = async (dt) => {
  if (dt.status == 'failed') {
    return dt;
  }
  try {
    const diskon_order_item = parseInt(dt.payload.diskon) || 0;
    const subtotal_order_item = parseInt(dt.payload.harga) * parseInt(dt.payload.qty);
    const total_order_item = subtotal_order_item - diskon_order_item;
    const kuponIdOrderItem = dt.payload.kupon_id || null;
    const bankIdOrderItem = dt.payload.bank_id || null;
    const [result] = await dt.con.query(
      `INSERT INTO order_item (order_id, products_id, harga, qty, subtotal, kupon_id, diskon_jumlah, total, bank_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dt.payload.order_id, dt.payload.product_id, dt.payload.harga, dt.payload.qty, subtotal_order_item, kuponIdOrderItem, diskon_order_item, total_order_item, bankIdOrderItem]
    );
    dt.payload.order_item_id = result.insertId;
    dt.code = 200;
    dt.message = "success";
    dt.status = "success";
  } catch (e) {
    console.log(e.stack);
    dt.code=400;
    dt.status='failed';
    dt.message='failed to create order item';
  }
 
  return dt;
}

exports.checkout_commit_transaction = async (dt) => {
  if (dt.status == 'failed') {
    return dt;
  }
  try {
    await dt.con.commit();
    dt.message = "commit transaction";
    dt.status = "success"
    dt.code = 200;
  } catch (e) {
    if (dt.con) {
      await dt.con.rollback();
    }
    dt.code=400;
    dt.status='failed';
    dt.message='failed to commit transaction';
  } finally {
    await dt.con.release();
  }
  return dt;
}

exports.checkout_send_wa = async (dt) => {
  if (dt.status == 'failed') {
    return dt;
  }

  // Use bank info already read by checkout_get_bank_info
  if (!dt.payload.bank_id && dt.payload.payment_method !== 'qris') {
    dt.payload.bank_name = 'BCA';
    dt.payload.bank_account = '123456789';
    dt.payload.bank_owner = 'PT. Star Frost';
  }
  // Forward bank info to response data
  dt.data.bank_name = dt.payload.bank_name;
  dt.data.bank_account = dt.payload.bank_account;
  dt.data.bank_owner = dt.payload.bank_owner;
  dt.data.bank_id = dt.payload.bank_id;
  
  const qty = parseInt(dt.payload.qty);
  const diskon = parseInt(dt.payload.diskon) || 0;
  const kodeUnik = parseInt(dt.payload.kode_unik) || 0;
  const subtotal = parseInt(dt.payload.harga) * qty;
  const total = parseInt(dt.payload.total) || subtotal;

  const deadline = new Date(Date.now() + 1 * 60 * 60 * 1000);
  const deadlineStr = deadline.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  dt.payload.payment_deadline = deadlineStr;

  let message = `Halo ${dt.payload.nama || 'Customer'}, terima kasih telah memesan produk ${dt.payload.product_name}. Berikut adalah detail pesanan Anda:
  
  Produk: ${dt.payload.product_name}
  Harga: Rp${parseInt(dt.payload.harga).toLocaleString('id-ID')}
  Jumlah: ${qty}
  Subtotal: Rp${subtotal.toLocaleString('id-ID')}${diskon > 0 ? `
  Diskon: -Rp${diskon.toLocaleString('id-ID')}` : ''}
  Kode Unik: -Rp${kodeUnik.toLocaleString('id-ID')}
  *Total: Rp${total.toLocaleString('id-ID')}*
  `;

  if (dt.payload.payment_method === 'qris') {
    message += `Pembayaran menggunakan QRIS. Silakan scan QRIS melalui halaman pembayaran di website Telegram Booster untuk menyelesaikan pembayaran.
  Batas Pembayaran: ${deadlineStr}`;
  } else {
    message += `Anda bisa melakukan pembayaran ke nomor rekening berikut:
  Bank: ${dt.payload.bank_name}
  No Rekening: ${dt.payload.bank_account}
  Atas Nama: ${dt.payload.bank_owner}
  Batas Pembayaran: ${deadlineStr}
  
  Apabila Anda sudah melakukan pembayaran, silakan kirim bukti pembayaran ke nomor WhatsApp ini: ${process.env.WA_NUMBER}`;
  };
  
  // Add login credentials if this is a new guest account
  if (dt.payload.generated_password && dt.payload.generated_email) {
    message += `
  
  🔓 AKUN ANDA BELUM AKTIF
  Klik link berikut untuk mengaktifkan akun Anda:
  http://localhost:3000/activate/${dt.payload.activation_token}
  
  📋 AKUN LOGIN ANDA (setelah aktivasi):
  Email: ${dt.payload.generated_email}
  Password: ${dt.payload.generated_password}
  
  Anda bisa ubah password kapan saja di halaman Account.
  
  Catat credentials di atas untuk login di website!`;
  }
  
  message += `
  
  Terima kasih ദ്ദി◝ ⩊ ◜.ᐟ`;
  
  dt.payload.pesan = message;
  try {
    const wa = require('../whatsapp/whatsapp_controller');
    const res = await wa.send_wa(dt);
    dt.message = res.message;
  } catch (e) {
    console.log(e.stack);
    dt.code=400;
    dt.status='failed';
    dt.message='failed to send whatsapp';
  }
 
  return dt;
}

exports.checkout_send_email = async (dt) => {
  if (dt.status == 'failed') {
    return dt;
  }

  try {
    const email = require('../email/email_service');
    const res = await email.sendCheckoutEmail(dt);
    dt.message = res.message || 'email sent';
  } catch (e) {
    console.log(e.stack);
    console.log('failed to send email:', e.message);
  }
 
  return dt;
}

exports.checkout_response = async (dt) => {
  let res = {
    code: dt.code,
    status: dt.status,
    message: dt.message,
    data: dt.data
  }

  return res;
}