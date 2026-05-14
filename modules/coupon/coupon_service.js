const helper = require("../../common/helper");

exports.validate_coupon = async (kode, subtotal) => {
  try {
    const [rows] = await helper.db.query(
      `SELECT kode, potongan, min_order, tipe, status FROM kupon WHERE kode = ?`,
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

    if (coupon.status !== 'aktif') {
      return {
        code: 400,
        status: 'failed',
        message: 'Kupon sudah tidak aktif',
        data: null
      };
    }

    if (subtotal < coupon.min_order) {
      return {
        code: 400,
        status: 'failed',
        message: `Minimal pembelian Rp${parseInt(coupon.min_order).toLocaleString('id-ID')} untuk menggunakan kupon ini`,
        data: null
      };
    }

    let potongan = parseInt(coupon.potongan);
    if (coupon.tipe === 'percentage') {
      potongan = Math.round(subtotal * potongan / 100);
    }

    return {
      code: 200,
      status: 'success',
      message: 'Kupon valid',
      data: {
        kode: coupon.kode,
        potongan: potongan
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
