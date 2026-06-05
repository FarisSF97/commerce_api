const helper = require('../../common/helper');
const { response } = helper;
const service = require('./order_service');

const allowedSortBy = ['invoice', 'tanggal', 'produk', 'qty', 'total', 'status'];
const allowedStatuses = ['pending', 'paid', 'cancel'];

const order = {
  getOrders: async (req, res) => {
    const { account_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = (req.query.search || '').trim();
    const sort_by = allowedSortBy.includes(req.query.sort_by) ? req.query.sort_by : 'tanggal';
    const sort_dir = req.query.sort_dir === 'ASC' ? 'ASC' : 'DESC';
    const filter_status = allowedStatuses.includes(req.query.filter_status) ? req.query.filter_status : '';

    if (!account_id) {
      return response.error(res, 'account_id diperlukan', 400);
    }

    try {
      const result = await service.getOrders(account_id, page, limit, search, sort_by, sort_dir, filter_status);
      return response.success(res, result, 'Orders retrieved successfully');
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
