const { autoCancelExpiredOrders } = require('../modules/order/order_service');

exports.worker60s = () => {
  setInterval(async () => {
    try {
      await autoCancelExpiredOrders();
    } catch (error) {
      console.error('[Worker] Error:', error.message);
    }
  }, 60000);
};
