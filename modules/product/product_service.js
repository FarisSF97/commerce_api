const helper= require("../../common/helper");

// Reserved for future upsell feature - currently not used
// exports.get_product_upsell = async (dt) => {
//   let rows = [];
//   let query = `select upsell from products where slug=?`;
//   [rows] = await helper.db.query(query, [dt.data[0].slug]);
//   let upsell = rows[0]['upsell'];
//   query = `SELECT nama as nama_produk, harga, periode FROM products WHERE id IN (${upsell})`;
//   [rows] = await helper.db.query(query);
//   
//   let product_utama = {
//     nama_produk: dt.data[0].nama,
//     harga: dt.data[0].harga,
//     periode: dt.data[0].periode,
//   }
//   dt.data = [];
//   dt.data.push(product_utama);
//
//   if (rows[0] !== undefined) {
//     dt.data.push(rows[0]);
//   }
//
//   return dt;
// }

exports.get_all_products = async (req, res) => {
  let rows = [];

  try {
    const query = `SELECT nama, harga, kode_unik, slug FROM products ORDER BY nama`;
    [rows] = await helper.db.query(query);
  } catch (err) {
    console.log(err.stack);
  }

  let msg = "Products not found";
  let status = "failed";
  let code = 404;
  if (rows.length > 0) {
    msg = "Products found";
    status = "success";
    code = 200;
  }

  let dt = {
    code: code,
    status: status,
    message: msg,
    data: rows
  };
  return dt;
}

exports.get_product = async (req, res) => {
  let slug = req.params.slug_or_id;
  let rows = [];

  let where = "";
  if(isNaN(slug)) {
    where= `slug = ?`;
  }else {
    where = `id = ?`;
  }

  try {
    const query = `SELECT * FROM products WHERE ${where}`;
    rows = await helper.db.query(query,slug);
  } catch (err) {
    console.log(err.stack);
  }

  if (rows[0] && rows[0].length > 0) {
    const product = rows[0][0];
    return {
      code: 200,
      status: "success",
      message: "Product found",
      data: [{
        id: product.id,
        nama: product.nama,
        harga: product.harga,
        kode_unik: product.kode_unik || null,
        slug: product.slug,
        periode: product.periode || null,
        deskripsi: product.deskripsi || null
      }]
    };
  }

  return {
    code: 404,
    status: "failed",
    message: "Product not found",
    data: []
  };
}

exports.get_product_checkout = async (req, res) => {
  let slug = req.params.slug_or_id;
  let rows = [];

  let where = "";
  if(isNaN(slug)) {
    where = `slug = ?`;
  } else {
    where = `id = ?`;
  }

  try {
    const query = `SELECT * FROM products WHERE ${where}`;
    rows = await helper.db.query(query, slug);
  } catch (err) {
    console.log(err.stack);
  }

  let msg = "Product not found";
  let status = "failed";
  let code = 404;
  
  if (rows[0] && rows[0].length > 0) {
    const product = rows[0][0];
    msg = "Product found";
    status = "success";
    code = 200;
    
    return {
      code: code,
      status: status,
      message: msg,
      data: [{
        id: product.id,
        nama: product.nama,
        harga: product.harga,
        kode_unik: product.kode_unik || null,
        slug: product.slug,
        periode: product.periode || null,
        deskripsi: product.deskripsi || null
      }]
    };
  }

  return {
    code: code,
    status: status,
    message: msg,
    data: []
  };
}