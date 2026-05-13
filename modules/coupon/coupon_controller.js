const service = require("./coupon_service");

exports.validate_coupon = async (req, res) => {
  const { kode, subtotal } = req.body;

  if (!kode || kode.trim() === '') {
    return res.status(400).json({
      code: 400,
      status: 'failed',
      message: 'Kode kupon wajib diisi',
      data: null
    });
  }

  const result = await service.validate_coupon(kode.trim().toUpperCase(), parseInt(subtotal) || 0);
  return res.status(result.code).json(result);
};
