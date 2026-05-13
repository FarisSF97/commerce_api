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
  let no_wa = body?.no_wa || '';
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
      `SELECT potongan, min_beli, max_beli FROM coupons WHERE kode = ?`,
      [dt.payload.kupon.trim().toUpperCase()]
    );

    if (rows.length === 0) {
      dt.payload.diskon = 0;
      return dt;
    }

    const coupon = rows[0];

    if (subtotal < coupon.min_beli) {
      dt.payload.diskon = 0;
      return dt;
    }

    if (subtotal > coupon.max_beli) {
      dt.payload.diskon = 0;
      return dt;
    }

    dt.payload.diskon = parseInt(coupon.potongan);
  } catch (e) {
    console.log(e.stack);
    dt.payload.diskon = 0;
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
  
  const [rows] = await helper.db.query(`SELECT id, harga FROM products WHERE ${where}`, [productId]);
  console.log('checkout_get_harga', rows);
  if (rows.length == 0) {
   dt.message = 'product not found';
   dt.status = 'failed';
   dt.code = 400;
   return dt;
  }
  dt.payload.harga = rows[0].harga;
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
        
        // Extract card data (last 4 digits only for security)
        const cardName = dt.payload.cardName || '';
        const cardLast4 = dt.payload.cardNumber ? dt.payload.cardNumber.slice(-4) : '';
        const cardExpiry = dt.payload.cardExpiry || '';
        
        const [rows2] = await helper.db.query(
          `INSERT INTO account (nama, email, no_wa, password, card_name, card_last4, card_expiry) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [dt.payload.nama, dt.payload.email, dt.payload.no_wa, hashedPassword, cardName, cardLast4, cardExpiry]
        );
        dt.payload.pelanggan_id = rows2.insertId;
        
        // Store raw password for WhatsApp message (temporary, will be sent)
        dt.payload.generated_password = rawPassword;
        dt.payload.generated_email = dt.payload.email;
        dt.payload.generated_name = dt.payload.nama;
        } else {
         // User exists - update card data if provided and not empty
        dt.payload.pelanggan_id = rows[0].id;
         
         const cardName = dt.payload.cardName || '';
         const cardLast4 = dt.payload.cardNumber ? dt.payload.cardNumber.slice(-4) : '';
        const cardExpiry = dt.payload.cardExpiry || '';
          
          // Only update if there's new card data
          if (cardName && cardLast4 && cardExpiry) {
          await helper.db.query(
            `UPDATE account SET card_name = ?, card_last4 = ?, card_expiry = ? WHERE id = ?`,
            [cardName, cardLast4, cardExpiry, dt.payload.pelanggan_id]
          );
        }
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
    let total = (parseInt(dt.payload.harga) * parseInt(dt.payload.qty)) - diskon;
    if (total < 0) total = 0;
    dt.payload.total = total;
    const [result] = await dt.con.query(`INSERT INTO \`order\` (account_id, products_id, harga, qty, total) VALUES (?, ?, ?, ?, ?)`, [dt.payload.pelanggan_id, dt.payload.product_id, dt.payload.harga, dt.payload.qty, dt.payload.total]);
    dt.payload.order_id = result.insertId;
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
    const [result] = await dt.con.query(
      `INSERT INTO order_item (order_id, products_id, harga, qty, total) VALUES (?, ?, ?, ?, ?)`,
      [dt.payload.order_id, dt.payload.product_id, dt.payload.harga, dt.payload.qty, dt.payload.total]
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
  
  let message = `Halo ${dt.payload.nama || 'Customer'}, terima kasih telah melakukan pembelian. Berikut adalah detail pembelian Anda:
  
  Produk: ${dt.payload.product_name}
  Harga: ${dt.payload.harga}
  Qty: ${dt.payload.qty}
  Total: ${dt.payload.harga * dt.payload.qty}
  
  Anda bisa melakukan pembayaran ke nomor rekening berikut:
  Bank: BCA
  No Rekening: 123456789
  Atas Nama: PT. Star Frost
  
  Apabila Anda sudah melakukan pembayar, silakan kirim bukti pembayaran ke nomor WhatsApp ini: ${process.env.WA_NUMBER}`;
  
  // Add login credentials if this is a new guest account
  if (dt.payload.generated_password && dt.payload.generated_email) {
    message += `
  
  📋 AKUN LOGIN ANDA (untuk login di website):
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