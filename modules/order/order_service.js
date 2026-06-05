const helper = require("../../common/helper");

const allowedStatuses = ['pending', 'paid', 'cancel'];

exports.getOrders = async (account_id, page = 1, limit = 10, search = '', sort_by = 'tanggal', sort_dir = 'DESC', filter_status = '') => {
  try {
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

    let countSql = `SELECT COUNT(*) AS total FROM \`order\` o JOIN products p ON o.products_id = p.id WHERE o.account_id = ?`;
    let selectSql = `SELECT o.id, o.invoice, o.products_id, o.harga, o.qty, o.subtotal, o.diskon_jumlah, o.total, o.status, o.created_at,
                            p.nama AS product_name, p.kode_unik,
                            b.jenis_bank AS bank_name, b.no_rek AS bank_account, b.atas_nama AS bank_owner
                     FROM \`order\` o
                     JOIN products p ON o.products_id = p.id
                     LEFT JOIN bank b ON o.bank_id = b.id
                     WHERE o.account_id = ?`;
    const countParams = [account_id];
    const selectParams = [account_id];

    if (search) {
      const like = `%${search.toLowerCase()}%`;
      countSql += ` AND (LOWER(o.invoice) LIKE ? OR LOWER(p.nama) LIKE ?)`;
      selectSql += ` AND (LOWER(o.invoice) LIKE ? OR LOWER(p.nama) LIKE ?)`;
      countParams.push(like, like);
      selectParams.push(like, like);
    }

    if (filter_status && allowedStatuses.includes(filter_status)) {
      countSql += ` AND o.status = ?`;
      selectSql += ` AND o.status = ?`;
      countParams.push(filter_status);
      selectParams.push(filter_status);
    }

    selectSql += ` ORDER BY ${sortColumn} ${sortDir}, o.id DESC LIMIT ? OFFSET ?`;
    selectParams.push(limit, offset);

    const [[{ total }]] = await helper.db.query(countSql, countParams);
    const [rows] = await helper.db.query(selectSql, selectParams);

    const totalPages = Math.ceil(total / limit);

    return {
      orders: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  } catch (e) {
    console.log(e.stack);
    throw e;
  }
};

exports.cancelOrder = async (order_id, account_id) => {
  try {
    const [result] = await helper.db.execute(
      `UPDATE \`order\` SET status = ? WHERE id = ? AND account_id = ? AND status = ?`,
      ['cancel', order_id, account_id, 'pending']
    );

    if (result.affectedRows > 0) {
      await helper.db.execute(
        `UPDATE order_item SET status = ? WHERE order_id = ?`,
        ['cancel', order_id]
      );
    }

    return result.affectedRows > 0;
  } catch (e) {
    console.log(e.stack);
    throw e;
  }
};

exports.autoCancelExpiredOrders = async () => {
  try {
    const [rows] = await helper.db.query(
      `SELECT id FROM \`order\` WHERE status = 'pending' AND created_at < NOW() - INTERVAL 1 HOUR`
    );
    if (rows.length === 0) return;

    const ids = rows.map(r => r.id);
    const [orderResult] = await helper.db.query(
      `UPDATE \`order\` SET status = 'cancel' WHERE id IN (?) AND status = 'pending'`,
      [ids]
    );
    if (orderResult.affectedRows > 0) {
      await helper.db.query(
        `UPDATE order_item SET status = 'cancel' WHERE order_id IN (?) AND status = 'pending'`,
        [ids]
      );
      console.log(`[AutoCancel] ${orderResult.affectedRows} order(s) expired and cancelled`);
    }
  } catch (e) {
    console.log('[AutoCancel] Error:', e.message);
  }
};
