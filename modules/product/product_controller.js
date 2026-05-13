const service = require("./product_service");

exports.get_all_products = async (req,res) => {
 let dt = await service.get_all_products(req, res);   
 res.status(dt.code).json(dt);
};

exports.get_product = async (req,res) => {
 let dt = await service.get_product(req, res);   
 res.status(dt.code).json(dt);
};

exports.get_product_checkout = async (req,res) => {
 let dt = await service.get_product_checkout(req, res);   
 res.status(dt.code).json(dt);
};