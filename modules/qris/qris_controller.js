const service = require('./qris_service');
const helper = require('../../common/helper');
const notification = require('../notification/notification_service');

exports.createQrisPayment = async (req, res) => {
  try {
    const { order_id, amount, invoice } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({
        code: 400,
        status: 'failed',
        message: 'order_id and amount are required',
        data: null
      });
    }

    const keterangan = `Pembayaran ${invoice || 'Order #' + order_id} - Telegram Booster`;

    const qrisResult = await service.createKlikQrisTransaction(order_id, invoice, amount, keterangan);

    const qrisData = qrisResult.data || qrisResult;
    const qrisUrl = qrisData.qris_url || null;
    const qrisImage = qrisData.qris_image || null;
    const signature = qrisData.signature || null;
    const expiredAt = qrisData.expired_at || null;

    if (signature) {
      await helper.db.query(
        `UPDATE \`order\` SET qris_signature = ?, qris_url = ? WHERE id = ?`,
        [signature, qrisUrl, order_id]
      );
    }

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: 'QRIS payment created',
      data: {
        order_id: parseInt(order_id),
        qris_url: qrisUrl,
        qris_image: qrisImage,
        signature: signature,
        expired_at: expiredAt
      }
    });
  } catch (error) {
    console.error('QRIS creation error:', error.message);
    return res.status(500).json({
      code: 500,
      status: 'failed',
      message: error.message || 'Failed to create QRIS payment',
      data: null
    });
  }
};

exports.checkQrisStatus = async (req, res) => {
  try {
    const orderId = req.params.order_id;

    if (!orderId) {
      return res.status(400).json({
        code: 400,
        status: 'failed',
        message: 'order_id is required',
        data: null
      });
    }

    const [orders] = await helper.db.query(
      `SELECT id, invoice, total, status, qris_signature, qris_url FROM \`order\` WHERE id = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        code: 404,
        status: 'failed',
        message: 'Order not found',
        data: null
      });
    }

    const order = orders[0];

    let qrisStatus = 'UNKNOWN';

    try {
      const statusResult = await service.checkKlikQrisStatus(orderId);
      const statusData = statusResult.data || statusResult;
      qrisStatus = statusData.status || 'UNKNOWN';
    } catch (e) {
      console.log('KlikQRIS status check error:', e.message);
    }

    if (qrisStatus === 'SUCCESS' && order.status === 'pending') {
      await helper.db.query(
        `UPDATE \`order\` SET status = 'paid' WHERE id = ?`,
        [orderId]
      );
      await helper.db.query(
        `UPDATE order_item SET status = 'paid' WHERE order_id = ?`,
        [orderId]
      );
      order.status = 'paid';

      notification.sendPaymentNotification(orderId).catch(e => {
        console.log('Payment notification error:', e.message);
      });
    }

    if (qrisStatus === 'EXPIRED' && order.status === 'pending') {
      await helper.db.query(
        `UPDATE \`order\` SET status = 'cancel' WHERE id = ?`,
        [orderId]
      );
      await helper.db.query(
        `UPDATE order_item SET status = 'cancel' WHERE order_id = ?`,
        [orderId]
      );
      order.status = 'cancel';
    }

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: 'QRIS status retrieved',
      data: {
        order_id: order.id,
        invoice: order.invoice,
        total: order.total,
        order_status: order.status,
        qris_status: qrisStatus,
        qris_url: order.qris_url
      }
    });
  } catch (error) {
    console.error('QRIS status check error:', error.message);
    return res.status(500).json({
      code: 500,
      status: 'failed',
      message: error.message || 'Failed to check QRIS status',
      data: null
    });
  }
};
