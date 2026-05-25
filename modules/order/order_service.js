const helper = require("../../common/helper");

exports.getOrders = async (account_id) => {
  try {
    const [rows] = await helper.db.query(
      `SELECT o.id, o.invoice, o.products_id, o.qty, o.subtotal, o.diskon_jumlah, o.total, o.status, p.nama AS product_name
       FROM \`order\` o
       JOIN products p ON o.products_id = p.id
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
