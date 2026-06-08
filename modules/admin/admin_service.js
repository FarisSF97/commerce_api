const helper = require('../../common/helper');

const validRoles = ['user', 'admin'];
const allowedStatuses = ['pending', 'paid', 'cancel'];

exports.listUsers = async ({ page = 1, limit = 10, search = '', role = '', filter_status = '' }) => {
  const offset = (page - 1) * limit;

  let countSql = 'SELECT COUNT(*) AS total FROM account WHERE 1=1';
  let selectSql = 'SELECT id, nama, email, no_wa, status, role, created_at FROM account WHERE 1=1';
  const countParams = [];
  const selectParams = [];

  if (search) {
    const like = `%${search.toLowerCase()}%`;
    countSql += ' AND (LOWER(nama) LIKE ? OR LOWER(email) LIKE ? OR LOWER(no_wa) LIKE ?)';
    selectSql += ' AND (LOWER(nama) LIKE ? OR LOWER(email) LIKE ? OR LOWER(no_wa) LIKE ?)';
    countParams.push(like, like, like);
    selectParams.push(like, like, like);
  }

  if (role && validRoles.includes(role)) {
    countSql += ' AND role = ?';
    selectSql += ' AND role = ?';
    countParams.push(role);
    selectParams.push(role);
  }

  if (filter_status && ['aktif', 'suspend', 'cancel'].includes(filter_status)) {
    countSql += ' AND status = ?';
    selectSql += ' AND status = ?';
    countParams.push(filter_status);
    selectParams.push(filter_status);
  }

  selectSql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  selectParams.push(limit, offset);

  const [[{ total }]] = await helper.db.query(countSql, countParams);
  const [rows] = await helper.db.query(selectSql, selectParams);

  return {
    users: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};

exports.getUser = async (id) => {
  const [rows] = await helper.db.query(
    'SELECT id, nama, email, no_wa, status, role, created_at FROM account WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

exports.createUser = async ({ nama, email, no_wa, password, role }) => {
  const [result] = await helper.db.execute(
    'INSERT INTO account (nama, email, no_wa, password, status, role) VALUES (?, ?, ?, ?, ?, ?)',
    [nama, email, no_wa, password, 'aktif', role || 'user']
  );
  return { id: result.insertId };
};

exports.updateUser = async (id, { nama, email, no_wa, status, role }) => {
  const fields = [];
  const params = [];

  if (nama !== undefined) { fields.push('nama = ?'); params.push(nama); }
  if (email !== undefined) { fields.push('email = ?'); params.push(email); }
  if (no_wa !== undefined) { fields.push('no_wa = ?'); params.push(no_wa); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (role !== undefined && validRoles.includes(role)) { fields.push('role = ?'); params.push(role); }

  if (fields.length === 0) return { affectedRows: 0 };

  params.push(id);
  const [result] = await helper.db.execute(
    `UPDATE account SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
  return { affectedRows: result.affectedRows };
};

exports.resetUserPassword = async (id, hashedPassword) => {
  const [result] = await helper.db.execute(
    'UPDATE account SET password = ? WHERE id = ?',
    [hashedPassword, id]
  );
  return { affectedRows: result.affectedRows };
};

exports.deleteUser = async (id) => {
  const [result] = await helper.db.execute(
    "UPDATE account SET status = 'cancel' WHERE id = ?",
    [id]
  );
  return { affectedRows: result.affectedRows };
};

exports.listOrders = async ({ page = 1, limit = 10, search = '', sort_by = 'tanggal', sort_dir = 'DESC', filter_status = '' }) => {
  const offset = (page - 1) * limit;

  const sortMap = {
    invoice: 'o.invoice',
    tanggal: 'o.created_at',
    produk: 'p.nama',
    qty: 'o.qty',
    total: 'o.total',
    status: 'o.status'
  };
  const sortColumn = sortMap[sort_by] || 'o.created_at';
  const sortDir = sort_dir === 'ASC' ? 'ASC' : 'DESC';

  let countSql = `SELECT COUNT(*) AS total FROM \`order\` o JOIN products p ON o.products_id = p.id JOIN account a ON o.account_id = a.id WHERE 1=1`;
  let selectSql = `SELECT o.id, o.invoice, o.account_id, a.nama AS account_name, a.email AS account_email, a.no_wa AS account_wa,
                          p.nama AS product_name, p.kode_unik, o.harga, o.qty, o.subtotal, o.diskon_jumlah, o.total, o.status, o.created_at,
                          k.kode AS kupon_kode,
                          b.jenis_bank AS bank_name, b.no_rek AS bank_account, b.atas_nama AS bank_owner
                   FROM \`order\` o
                   JOIN products p ON o.products_id = p.id
                   JOIN account a ON o.account_id = a.id
                   LEFT JOIN kupon k ON o.kupon_id = k.id
                   LEFT JOIN bank b ON o.bank_id = b.id
                   WHERE 1=1`;
  const countParams = [];
  const selectParams = [];

  if (search) {
    const like = `%${search.toLowerCase()}%`;
    countSql += ' AND (LOWER(o.invoice) LIKE ? OR LOWER(p.nama) LIKE ? OR LOWER(a.nama) LIKE ?)';
    selectSql += ' AND (LOWER(o.invoice) LIKE ? OR LOWER(p.nama) LIKE ? OR LOWER(a.nama) LIKE ?)';
    countParams.push(like, like, like);
    selectParams.push(like, like, like);
  }

  if (filter_status && allowedStatuses.includes(filter_status)) {
    countSql += ' AND o.status = ?';
    selectSql += ' AND o.status = ?';
    countParams.push(filter_status);
    selectParams.push(filter_status);
  }

  selectSql += ` ORDER BY ${sortColumn} ${sortDir}, o.id DESC LIMIT ? OFFSET ?`;
  selectParams.push(limit, offset);

  const [[{ total }]] = await helper.db.query(countSql, countParams);
  const [rows] = await helper.db.query(selectSql, selectParams);

  return {
    orders: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};

exports.updateOrderStatus = async (orderId, status) => {
  if (!allowedStatuses.includes(status)) return { affectedRows: 0 };

  const [result] = await helper.db.execute(
    'UPDATE `order` SET status = ? WHERE id = ?',
    [status, orderId]
  );

  if (result.affectedRows > 0) {
    await helper.db.execute(
      'UPDATE order_item SET status = ? WHERE order_id = ?',
      [status, orderId]
    );
  }

  return { affectedRows: result.affectedRows };
};

exports.getOrder = async (id) => {
  const [rows] = await helper.db.query(
    `SELECT o.id, o.invoice, o.created_at, o.status, o.account_id, a.nama AS account_name, a.email AS account_email, a.no_wa AS account_wa,
            o.products_id, p.nama AS product_name, p.harga AS product_harga, p.kode_unik AS product_kode_unik,
            o.harga, o.qty, o.subtotal, o.kupon_id, k.kode AS kupon_kode, k.potongan AS kupon_potongan,
            o.diskon_jumlah, o.total, o.bank_id, b.jenis_bank AS bank_name, b.no_rek AS bank_account, b.atas_nama AS bank_owner
     FROM \`order\` o
     JOIN products p ON o.products_id = p.id
     JOIN account a ON o.account_id = a.id
     LEFT JOIN kupon k ON o.kupon_id = k.id
     LEFT JOIN bank b ON o.bank_id = b.id
     WHERE o.id = ?`,
    [id]
  );
  return rows[0] || null;
};

exports.listAllUsers = async () => {
  const [rows] = await helper.db.query(
    'SELECT id, nama, email, no_wa FROM account ORDER BY nama'
  );
  return rows;
};

exports.listAllProducts = async () => {
  const [rows] = await helper.db.query(
    'SELECT id, nama, harga, kode_unik FROM products ORDER BY nama'
  );
  return rows;
};

exports.listAllKupon = async () => {
  const [rows] = await helper.db.query(
    "SELECT id, kode, potongan FROM kupon WHERE status = 'aktif' ORDER BY kode"
  );
  return rows;
};

exports.listAllBanks = async () => {
  const [rows] = await helper.db.query(
    "SELECT id, jenis_bank, no_rek, atas_nama FROM bank WHERE status = 'aktif' ORDER BY jenis_bank"
  );
  return rows;
};

exports.updateOrder = async (id, data) => {
  const { account_id, products_id, invoice, harga, qty, subtotal, kupon_id, diskon_jumlah, total, bank_id, status, created_at } = data;

  const [result] = await helper.db.execute(
    `UPDATE \`order\` SET account_id = ?, products_id = ?, invoice = ?, harga = ?, qty = ?, subtotal = ?,
     kupon_id = ?, diskon_jumlah = ?, total = ?, bank_id = ?, status = ?, created_at = ?
     WHERE id = ?`,
    [account_id, products_id, invoice, harga, qty, subtotal, kupon_id, diskon_jumlah, total, bank_id, status, created_at, id]
  );

  if (result.affectedRows > 0) {
    await helper.db.execute(
      `UPDATE order_item SET products_id = ?, harga = ?, qty = ?, subtotal = ?,
       kupon_id = ?, diskon_jumlah = ?, total = ?, bank_id = ?, status = ?
       WHERE order_id = ?`,
      [products_id, harga, qty, subtotal, kupon_id, diskon_jumlah, total, bank_id, status, id]
    );
  }

  return { affectedRows: result.affectedRows };
};
