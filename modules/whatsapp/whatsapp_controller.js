const service = require("./whatsapp_service");

exports.check_valid = async (req, res) => {
  let dt = await service.capture_payload_check_valid(req, res);
  dt = await service.validasi_payload_check_valid(dt);
  dt = await service.hit_api_woowa_check_number(dt);
  res.status(dt.code).json(dt);
};

exports.send_wa = async (dt) => {
  dt = await service.capture_payload_send_wa(dt);
  dt = await service.validasi_payload_send_wa(dt);
  dt = await service.hit_api_woowa_send_wa(dt);
  return dt;
}