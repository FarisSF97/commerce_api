const helper = require("../../common/helper");

exports.validate_coupon = async (kode, subtotal) => {
  try {
    const [rows] = await helper.db.query(
      `SELECT kode, potongan, min_beli, max_beli FROM coupons WHERE kode = ?`,
      [kode]
    );

    if (rows.length === 0) {
      return {
        code: 404,
        status: 'failed',
        message: 'Kupon tidak ditemukan',
        data: null
      };
    }

    const coupon = rows[0];

    if (subtotal < coupon.min_beli) {
      return {
        code: 400,
        status: 'failed',
        message: `Minimal pembelian Rp${parseInt(coupon.min_beli).toLocaleString('id-ID')} untuk menggunakan kupon ini`,
        data: null
      };
    }

    if (subtotal > coupon.max_beli) {
      return {
        code: 400,
        status: 'failed',
        message: `Kupon hanya berlaku untuk maksimal pembelian Rp${parseInt(coupon.max_beli).toLocaleString('id-ID')}`,
        data: null
      };
    }

    return {
      code: 200,
      status: 'success',
      message: 'Kupon valid',
      data: {
        kode: coupon.kode,
        potongan: parseInt(coupon.potongan)
      }
    };
  } catch (e) {
    console.log(e.stack);
    return {
      code: 500,
      status: 'failed',
      message: 'Gagal validasi kupon',
      data: null
    };
  }
}
