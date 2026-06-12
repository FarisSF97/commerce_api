const helper = require('../../common/helper');
const service = require('./admin_service');
const wpHash = require('wordpress-hash-node');
const path = require('path');
const fs = require('fs');
const notification = require('../notification/notification_service');

const { response } = helper;

async function verifyAdmin(adminId) {
  if (!adminId) return null;
  const [rows] = await helper.db.query('SELECT id, role FROM account WHERE id = ? AND role = ?', [adminId, 'admin']);
  return rows[0] || null;
}

exports.listUsers = async (req, res) => {
  const admin = await verifyAdmin(req.query.admin_id || req.body?.admin_id);
  if (!admin) return response.error(res, 'Unauthorized', 401);

  const { page, limit, search, role, filter_status, sort_by, sort_dir } = req.query;
  try {
    const result = await service.listUsers({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search: (search || '').trim(),
      role: role || '',
      filter_status: filter_status || '',
      sort_by: sort_by || 'created_at',
      sort_dir: sort_dir || 'DESC'
    });
    return response.success(res, result);
  } catch (e) {
    console.error('listUsers error:', e);
    return response.serverError(res, 'Gagal mengambil data user');
  }
};

exports.getUser = async (req, res) => {
  const admin = await verifyAdmin(req.query.admin_id || req.body?.admin_id || req.params?.admin_id);
  if (!admin) return response.error(res, 'Unauthorized', 401);

  try {
    const user = await service.getUser(req.params.id);
    if (!user) return response.error(res, 'User tidak ditemukan', 404);
    return response.success(res, user);
  } catch (e) {
    console.error('getUser error:', e);
    return response.serverError(res, 'Gagal mengambil data user');
  }
};

exports.createUser = async (req, res) => {
  const admin = await verifyAdmin(req.body.admin_id);
  if (!admin) return response.error(res, 'Unauthorized', 401);

  const { nama, email, no_wa, password, role } = req.body;
  if (!nama || !email) {
    return response.error(res, 'Nama dan email diperlukan', 400);
  }
  if (!password || password.length < 4) {
    return response.error(res, 'Password minimal 4 karakter', 400);
  }

  try {
    const [existing] = await helper.db.query('SELECT id FROM account WHERE email = ?', [email]);
    if (existing.length > 0) {
      return response.error(res, 'Email sudah terdaftar', 400);
    }

    const hashedPassword = wpHash.HashPassword(password);

    const result = await service.createUser({
      nama: nama.trim(),
      email: email.trim().toLowerCase(),
      no_wa: (no_wa || '').trim(),
      password: hashedPassword,
      role: role || 'user'
    });
    return response.created(res, result, 'User berhasil ditambahkan');
  } catch (e) {
    console.error('createUser error:', e);
    return response.serverError(res, 'Gagal menambah user');
  }
};

exports.updateUser = async (req, res) => {
  const admin = await verifyAdmin(req.body.admin_id);
  if (!admin) return response.error(res, 'Unauthorized', 401);

  try {
    const user = await service.getUser(req.params.id);
    if (!user) return response.error(res, 'User tidak ditemukan', 404);

    const { nama, email, no_wa, status, role } = req.body;

    if (email && email !== user.email) {
      const [existing] = await helper.db.query('SELECT id FROM account WHERE email = ? AND id != ?', [email, req.params.id]);
      if (existing.length > 0) {
        return response.error(res, 'Email sudah digunakan akun lain', 400);
      }
    }

    const result = await service.updateUser(req.params.id, {
      nama: nama?.trim(),
      email: email?.trim().toLowerCase(),
      no_wa: (no_wa || '').trim(),
      status,
      role
    });

    if (result.affectedRows === 0) return response.error(res, 'Tidak ada perubahan', 400);
    return response.success(res, null, 'User berhasil diperbarui');
  } catch (e) {
    console.error('updateUser error:', e);
    return response.serverError(res, 'Gagal memperbarui user');
  }
};

exports.resetUserPassword = async (req, res) => {
  const admin = await verifyAdmin(req.body.admin_id);
  if (!admin) return response.error(res, 'Unauthorized', 401);

  const { password } = req.body;
  if (!password || password.length < 4) {
    return response.error(res, 'Password minimal 4 karakter', 400);
  }

  try {
    const user = await service.getUser(req.params.id);
    if (!user) return response.error(res, 'User tidak ditemukan', 404);

    const hashedPassword = wpHash.HashPassword(password);
    await service.resetUserPassword(req.params.id, hashedPassword);

    return response.success(res, { password }, 'Password user berhasil direset');
  } catch (e) {
    console.error('resetUserPassword error:', e);
    return response.serverError(res, 'Gagal mereset password user');
  }
};

exports.deleteUser = async (req, res) => {
  const admin = await verifyAdmin(req.body.admin_id);
  if (!admin) return response.error(res, 'Unauthorized', 401);

  try {
    const result = await service.deleteUser(req.params.id);
    if (result.affectedRows === 0) return response.error(res, 'User tidak ditemukan', 404);
    return response.success(res, null, 'User berhasil dinonaktifkan');
  } catch (e) {
    console.error('deleteUser error:', e);
    return response.serverError(res, 'Gagal menonaktifkan user');
  }
};

exports.listOrders = async (req, res) => {
  const admin = await verifyAdmin(req.query.admin_id || req.body?.admin_id);
  if (!admin) return response.error(res, 'Unauthorized', 401);

  const { page, limit, search, sort_by, sort_dir, filter_status } = req.query;
  try {
    const result = await service.listOrders({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search: (search || '').trim(),
      sort_by: sort_by || 'tanggal',
      sort_dir: sort_dir || 'DESC',
      filter_status: filter_status || ''
    });
    return response.success(res, result);
  } catch (e) {
    console.error('listOrders error:', e);
    return response.serverError(res, 'Gagal mengambil data order');
  }
};

exports.getOrderEditData = async (req, res) => {
  const admin = await verifyAdmin(req.query.admin_id || req.body?.admin_id);
  if (!admin) return response.error(res, 'Unauthorized', 401);

  try {
    const order = await service.getOrder(req.params.id);
    if (!order) return response.error(res, 'Order tidak ditemukan', 404);

    const [users, products, kupon, banks] = await Promise.all([
      service.listAllUsers(),
      service.listAllProducts(),
      service.listAllKupon(),
      service.listAllBanks()
    ]);

    return response.success(res, { order, users, products, kupon, banks });
  } catch (e) {
    console.error('getOrderEditData error:', e);
    return response.serverError(res, 'Gagal mengambil data edit order');
  }
};

exports.updateOrder = async (req, res) => {
  const admin = await verifyAdmin(req.body.admin_id);
  if (!admin) return response.error(res, 'Unauthorized', 401);

  const { invoice, created_at, status, account_id, products_id, harga, qty, subtotal, kupon_id, diskon_jumlah, total, bank_id } = req.body;

  if (!invoice || !account_id || !products_id || qty === undefined) {
    return response.error(res, 'Data order tidak lengkap', 400);
  }

  if (!['pending', 'paid', 'cancel', 'delete'].includes(status)) {
    return response.error(res, 'Status tidak valid', 400);
  }

  try {
    const result = await service.updateOrder(req.params.id, {
      account_id, products_id, invoice, harga, qty, subtotal,
      kupon_id: kupon_id || null, diskon_jumlah: diskon_jumlah || 0,
      total, bank_id: bank_id || null, status, created_at
    });

    if (result.affectedRows === 0) return response.error(res, 'Order tidak ditemukan', 404);
    if (status === 'paid') {
      notification.sendPaymentNotification(req.params.id).catch(e => {
        console.log('Payment notification error:', e.message);
      });
    }
    return response.success(res, null, 'Order berhasil diperbarui');
  } catch (e) {
    console.error('updateOrder error:', e);
    return response.serverError(res, 'Gagal memperbarui order');
  }
};

exports.getOrderCreateData = async (req, res) => {
  const admin = await verifyAdmin(req.query.admin_id || req.body?.admin_id);
  if (!admin) return response.error(res, 'Unauthorized', 401);

  try {
    const [users, products, kupon, banks] = await Promise.all([
      service.listAllUsers(),
      service.listAllProducts(),
      service.listAllKupon(),
      service.listAllBanks()
    ]);

    return response.success(res, { users, products, kupon, banks });
  } catch (e) {
    console.error('getOrderCreateData error:', e);
    return response.serverError(res, 'Gagal mengambil data');
  }
};

exports.createOrder = async (req, res) => {
  const admin = await verifyAdmin(req.body.admin_id);
  if (!admin) return response.error(res, 'Unauthorized', 401);

  const { account_id, products_id, harga, qty, subtotal, kupon_id, diskon_jumlah, total, bank_id, status } = req.body;

  if (!account_id || !products_id || !qty) {
    return response.error(res, 'Data order tidak lengkap (pelanggan, produk, jumlah wajib diisi)', 400);
  }

  if (!['pending', 'paid'].includes(status)) {
    return response.error(res, 'Status tidak valid', 400);
  }

  try {
    const result = await service.createOrder({
      account_id, products_id, harga, qty, subtotal,
      kupon_id: kupon_id || null, diskon_jumlah: diskon_jumlah || 0,
      total, bank_id: bank_id || null, status
    });

    if (status === 'paid') {
      notification.sendPaymentNotification(result.id).catch(e => {
        console.log('Payment notification error:', e.message);
      });
    }

    return response.created(res, result, 'Order berhasil dibuat');
  } catch (e) {
    console.error('createOrder error:', e);
    return response.serverError(res, 'Gagal membuat order');
  }
};

exports.uploadUserAvatar = async (req, res) => {
  const admin = await verifyAdmin(req.body.admin_id);
  if (!admin) return response.error(res, 'Unauthorized', 401);

  const { foto_base64 } = req.body;
  const userId = req.params.id;

  if (!foto_base64) {
    return response.error(res, 'Foto diperlukan', 400);
  }

  if (!foto_base64.startsWith('data:image/')) {
    return response.error(res, 'Format foto tidak valid. Gunakan jpg, png, gif, atau webp.', 400);
  }

  const mimeMatch = foto_base64.match(/^data:image\/(jpeg|png|gif|webp);base64,/);
  if (!mimeMatch) {
    return response.error(res, 'Tipe file tidak didukung. Gunakan jpg, png, gif, atau webp.', 400);
  }

  const extMap = { jpeg: 'jpg', png: 'png', gif: 'gif', webp: 'webp' };
  const ext = extMap[mimeMatch[1]] || 'jpg';

  const base64Data = foto_base64.replace(/^data:image\/\w+;base64,/, '');
  const fileSizeBytes = Math.round(base64Data.length * 0.75);

  if (fileSizeBytes > 2 * 1024 * 1024) {
    return response.error(res, 'Ukuran foto maksimal 2MB', 400);
  }

  try {
    const user = await service.getUser(userId);
    if (!user) return response.error(res, 'User tidak ditemukan', 404);

    const timestamp = Date.now();
    const fileName = `${userId}_${timestamp}.${ext}`;
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    const filePath = path.join(uploadDir, fileName);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    if (user.foto) {
      const oldFilePath = path.join(__dirname, '../..', user.foto.replace(/^\//, ''));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    const fotoUrl = `/uploads/avatars/${fileName}`;
    await helper.db.execute('UPDATE account SET foto = ? WHERE id = ?', [fotoUrl, userId]);

    return response.success(res, { foto: fotoUrl }, 'Foto user berhasil diperbarui');
  } catch (e) {
    console.error('Upload user avatar error:', e);
    return response.serverError(res, 'Gagal mengunggah foto user');
  }
};

exports.updateOrderStatus = async (req, res) => {
  const admin = await verifyAdmin(req.body.admin_id);
  if (!admin) return response.error(res, 'Unauthorized', 401);

  const { status } = req.body;
  if (!['pending', 'paid', 'cancel', 'delete'].includes(status)) {
    return response.error(res, 'Status tidak valid', 400);
  }

  try {
    const result = await service.updateOrderStatus(req.params.id, status);
    if (result.affectedRows === 0) return response.error(res, 'Order tidak ditemukan', 404);
    if (status === 'paid') {
      notification.sendPaymentNotification(req.params.id).catch(e => {
        console.log('Payment notification error:', e.message);
      });
    }
    return response.success(res, null, `Status order berhasil diubah menjadi ${status}`);
  } catch (e) {
    console.error('updateOrderStatus error:', e);
    return response.serverError(res, 'Gagal mengubah status order');
  }
};
