const express = require('express');
const router = express.Router();
const product = require('../modules/product/product_controller');
const whatsapp = require('../modules/whatsapp/whatsapp_controller');
const checkout = require('../modules/checkout/checkout_controller');
const account = require('../modules/account/account_controller');
const coupon = require('../modules/coupon/coupon_controller');
const order = require('../modules/order/order_controller');
const admin = require('../modules/admin/admin_controller');
const qris = require('../modules/qris/qris_controller');

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

// Order
router.get("/get_orders/:account_id", order.getOrders);
router.post("/cancel_order/:order_id", order.cancelOrder);

// Authentication endpoints
router.post("/login", account.login);
router.post("/register", account.register);
router.get("/me", account.getCurrentUser);
router.get("/activate/:token", account.activate);
router.post("/change_password", account.changePassword);
router.post("/forgot_password", account.forgotPassword);
router.post("/reset_password", account.resetPassword);
router.get("/validate_reset_token/:token", account.validateResetToken);
router.post("/update_profile", account.updateProfile);
router.post("/upload_avatar", account.uploadAvatar);

// QRIS routes
router.post("/qris/create-payment", qris.createQrisPayment);
router.get("/qris/status/:order_id", qris.checkQrisStatus);

// Admin routes
router.get("/admin/users", admin.listUsers);
router.get("/admin/users/:id", admin.getUser);
router.post("/admin/users", admin.createUser);
router.put("/admin/users/:id", admin.updateUser);
router.delete("/admin/users/:id", admin.deleteUser);
router.put("/admin/users/:id/password", admin.resetUserPassword);
router.get("/admin/orders", admin.listOrders);
router.get("/admin/orders/create-data", admin.getOrderCreateData);
router.post("/admin/orders", admin.createOrder);
router.post("/admin/users/:id/avatar", admin.uploadUserAvatar);
router.get("/admin/orders/:id/edit", admin.getOrderEditData);
router.put("/admin/orders/:id", admin.updateOrder);
router.put("/admin/orders/:id/status", admin.updateOrderStatus);

module.exports = router;