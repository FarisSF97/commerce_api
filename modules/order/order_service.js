const helper = require("../../common/helper");

exports.getOrders = async (account_id) => {
  try {
    const [rows] = await helper.db.query(
       `SELECT o.id, o.invoice, o.products_id, o.harga, o.qty, o.subtotal, o.diskon_jumlah, o.total, o.status, o.created_at,
              p.nama AS product_name, p.kode_unik,
              b.jenis_bank AS bank_name, b.no_rek AS bank_account, b.atas_nama AS bank_owner
       FROM \`order\` o
       JOIN products p ON o.products_id = p.id
       LEFT JOIN bank b ON o.bank_id = b.id
       WHERE o.account_id = ?
       ORDER BY o.id DESC`,
      [account_id]
    );
    return rows;
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
