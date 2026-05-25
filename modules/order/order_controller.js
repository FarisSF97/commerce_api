const helper = require('../../common/helper');
const { response } = helper;
const service = require('./order_service');

const order = {
  getOrders: async (req, res) => {
    const { account_id } = req.params;

    if (!account_id) {
      return response.error(res, 'account_id diperlukan', 400);
    }

    try {
      const orders = await service.getOrders(account_id);
      return response.success(res, orders, 'Orders retrieved successfully');
    } catch (error) {
      console.error('Get orders error:', error);
      return response.serverError(res, 'Gagal mengambil data pesanan');
    }
  },

  cancelOrder: async (req, res) => {
    const { order_id } = req.params;

    if (!order_id) {
      return response.error(res, 'order_id diperlukan', 400);
    }

    const { account_id } = req.body;

    if (!account_id) {
      return response.error(res, 'account_id diperlukan', 400);
    }

    try {
      const success = await service.cancelOrder(order_id, account_id);

      if (!success) {
        return response.error(res, 'Pesanan tidak ditemukan atau sudah diproses', 404);
      }

      return response.success(res, null, 'Pesanan berhasil di-cancel');
    } catch (error) {
      console.error('Cancel order error:', error);
      return response.serverError(res, 'Gagal cancel pesanan');
    }
  }
};

module.exports = order;
