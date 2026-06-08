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

exports.createUser = async ({ nama, email, no_wa, role }) => {
  const [result] = await helper.db.execute(
    'INSERT INTO account (nama, email, no_wa, status, role) VALUES (?, ?, ?, ?, ?)',
    [nama, email, no_wa, 'suspend', role || 'user']
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
  let selectSql = `SELECT o.id, o.invoice, o.account_id, a.nama AS account_name, a.email AS account_email,
                          p.nama AS product_name, o.harga, o.qty, o.subtotal, o.diskon_jumlah, o.total, o.status, o.created_at,
                          b.jenis_bank AS bank_name, b.no_rek AS bank_account, b.atas_nama AS bank_owner
                   FROM \`order\` o
                   JOIN products p ON o.products_id = p.id
                   JOIN account a ON o.account_id = a.id
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
