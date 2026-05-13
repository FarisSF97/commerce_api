const mysql= require("mysql2");
require("dotenv").config({path: '../.env'});

// let pool = await mysql.createPool ({
let pool = mysql.createPool ({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const db = pool.promise();

const response = {
  success: (res, data = null, message = 'Success') => {
    return res.status(200).json({
      code: 200,
      status: 'success',
      message: message,
      data: data
    });
  },
  
  created: (res, data = null, message = 'Created') => {
    return res.status(201).json({
      code: 201,
      status: 'success',
      message: message,
      data: data
    });
  },
  
  error: (res, message = 'Error', code = 400, data = null) => {
    return res.status(code).json({
      code: code,
      status: 'failed',
      message: message,
      data: data
    });
  },
  
  unauthorized: (res, message = 'Unauthorized') => {
    return res.status(401).json({
      code: 401,
      status: 'failed',
      message: message,
      data: null
    });
  },
  
  notFound: (res, message = 'Not found') => {
    return res.status(404).json({
      code: 404,
      status: 'failed',
      message: message,
      data: null
    });
  },
  
  serverError: (res, message = 'Internal server error') => {
    return res.status(500).json({
      code: 500,
      status: 'failed',
      message: message,
      data: null
    });
  }
};

module.exports = {
  db,
  response
}