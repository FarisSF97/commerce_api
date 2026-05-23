const express = require('express');
const router = express.Router();
const product = require('../modules/product/product_controller');
const whatsapp = require('../modules/whatsapp/whatsapp_controller');
const checkout = require('../modules/checkout/checkout_controller');
const account = require('../modules/account/account_controller');
const coupon = require('../modules/coupon/coupon_controller');

// Product routes
router.get("/get_all_products", product.get_all_products);
router.get("/get_product/:slug_or_id", product.get_product);
router.get("/get_product_checkout/:slug_or_id", product.get_product_checkout);

// WhatsApp validation
router.get("/check_valid/:no_wa", whatsapp.check_valid);

// Checkout
router.post("/checkout", checkout.checkout);

// Coupon
router.post("/validate_coupon", coupon.validate_coupon);

// Authentication endpoints
router.post("/login", account.login);
router.post("/register", account.register);
router.get("/me", account.getCurrentUser);
router.get("/activate/:token", account.activate);
router.post("/change_password", account.changePassword);

module.exports = router;