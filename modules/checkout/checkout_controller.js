const service = require("./checkout_service");

exports.checkout = async (req, res) => {
  let dt = await service.checkout_capture_payload(req.body);
  dt = await service.checkout_validasi(dt);
  dt = await service.checkout_get_harga(dt);
  dt = await service.checkout_validate_kupon(dt);
  dt = await service.checkout_create_account(dt);
  dt = await service.checkout_begin_transaction(dt);
  dt = await service.checkout_create_order(dt);
  dt = await service.checkout_create_order_item(dt);
  dt = await service.checkout_commit_transaction(dt);
  dt = await service.checkout_send_wa(dt);
  dt = await service.checkout_send_email(dt);
  dt = await service.checkout_response(dt);
  res.status(dt.code).json(dt);
}