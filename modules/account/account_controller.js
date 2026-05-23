const crypto = require('crypto');
const express = require('express');
const wpHash = require('wordpress-hash-node');
const helper = require('../../common/helper');
const emailService = require('../email/email_service');

const { response } = helper;

const account = {
  login: async (req, res) => {
    const { email, password } = req.body;
    
    console.log('Login attempt:', { email, password: '***' });
    
    try {
      const [users] = await helper.db.execute(
        'SELECT * FROM account WHERE email = ? LIMIT 1',
        [email]
      );
      
      console.log('Users found:', users.length);
      
      if (users.length === 0) {
        return response.unauthorized(res, 'Invalid email or password');
      }
      
      const user = users[0];
      console.log('User data:', { id: user.id, email: user.email, hasPassword: !!user.password });
      
      let isValidPassword = false;
      try {
        isValidPassword = wpHash.CheckPassword(password, user.password);
        console.log('WordPress hash check:', isValidPassword);
      } catch (error) {
        console.log('WordPress hash failed, trying plain text:', error.message);
        isValidPassword = password === user.password;
        console.log('Plain text check:', isValidPassword);
      }
      
      if (!isValidPassword) {
        return response.unauthorized(res, 'Invalid email or password');
      }
      
      if (user.status === 'suspend') {
        const activationLink = `http://localhost:3000/activate/${user.activation_token}`;
        const subject = 'Aktivasi Akun - Telegram Booster';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">Akun Anda Belum Aktif</h2>
            <p>Halo <strong>${user.nama || email}</strong>,</p>
            <p>Akun Anda dengan email <strong>${email}</strong> masih dalam status <strong>suspend</strong> dan belum bisa digunakan.</p>
            <p>Klik tombol di bawah untuk mengaktifkan akun Anda:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${activationLink}" style="display: inline-block; background: #28a745; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Aktifkan Akun</a>
            </div>
            <p style="color: #6c757d; font-size: 14px;">Atau salin link berikut ke browser:<br>${activationLink}</p>
            <p style="color: #6c757d; margin-top: 30px;">Hormat kami,<br><strong>Tim Telegram Booster</strong></p>
          </div>
        `;
        await emailService.sendEmail(email, subject, html);
        return response.error(res, 'Akun Anda belum diaktifkan. Silakan cek email/WhatsApp untuk link aktivasi.', 403);
      }
      
      const userData = {
        id: user.id || user.ID,
        name: user.name || user.username || user.display_name || user.nama || email.split('@')[0],
        email: user.email,
        whatsapp: user.whatsapp || user.phone || user.no_wa || user.no_telepon || null,
        card: {
          name: user.card_name || null,
          number: user.card_last4 || null,
          expiry: user.card_expiry || null
        }
      };
      
      console.log('Login successful for:', userData.email);
      
      return response.success(res, userData, 'Login successful');
      
    } catch (error) {
      console.error('Login error:', error);
      return response.serverError(res, 'An error occurred during login: ' + error.message);
    }
  },

  register: async (req, res) => {
    const { name, email, password, confirmPassword, whatsapp } = req.body;
    
    if (!whatsapp) {
      return response.error(res, 'WhatsApp number is required', 400);
    }
    
    if (password !== confirmPassword) {
      return response.error(res, 'Passwords do not match', 400);
    }
    
    try {
      const [existingUsers] = await helper.db.execute(
        'SELECT id FROM account WHERE email = ? LIMIT 1',
        [email]
      );
      
      if (existingUsers.length > 0) {
        return response.error(res, 'User already exists', 400);
      }
      
      const hashedPassword = wpHash.HashPassword(password);
      
      const [result] = await helper.db.execute(
        'INSERT INTO account (nama, email, password, no_wa) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, whatsapp]
      );
      
      const activationToken = crypto.randomBytes(32).toString('hex');
      await helper.db.execute('UPDATE account SET activation_token = ? WHERE id = ?', [activationToken, result.insertId]);
      
      const userData = {
        id: result.insertId,
        name: name,
        email: email,
        whatsapp: whatsapp,
        activation_token: activationToken
      };
      
      return response.created(res, userData, 'Registration successful');
      
    } catch (error) {
      console.error('Registration error:', error);
      return response.serverError(res, 'An error occurred during registration');
    }
  },

  getCurrentUser: async (req, res) => {
    return response.error(res, 'Session validation not implemented', 501);
  },

  activate: async (req, res) => {
    const { token } = req.params;

    if (!token) {
      return response.error(res, 'Token diperlukan', 400);
    }

    try {
      const [result] = await helper.db.execute(
        'UPDATE account SET status = ?, activation_token = NULL WHERE activation_token = ?',
        ['aktif', token]
      );

      if (result.affectedRows === 0) {
        return response.error(res, 'Token tidak valid atau sudah digunakan', 404);
      }

      return response.success(res, null, 'Akun berhasil diaktifkan');
    } catch (error) {
      console.error('Activate error:', error);
      return response.serverError(res, 'Gagal mengaktifkan akun');
    }
  },

  changePassword: async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return response.error(res, 'Email dan password diperlukan', 400);
    }
    
    try {
      const hashedPassword = wpHash.HashPassword(password);
      
      await helper.db.execute(
        'UPDATE account SET password = ? WHERE email = ?',
        [hashedPassword, email]
      );
      
      return response.success(res, null, 'Password berhasil diubah');
      
    } catch (error) {
      console.error('Change password error:', error);
      return response.serverError(res, 'Gagal ubah password');
    }
  }
};

module.exports = account;
