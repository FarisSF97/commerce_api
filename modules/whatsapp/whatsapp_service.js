const helper = require("../../common/helper");
const axios = require("axios");

exports.capture_payload_check_valid = async (req, res) => {
  let no_wa = req.params.no_wa || '';
  let dt = {
    code: 200,
    status: "success",
    message: "success",
  }
  dt.no_wa = no_wa;
  return dt;
}

exports.validasi_payload_check_valid = async (dt) => {

  if(dt.no_wa=='') {
    dt.code=400;
    dt.status='failed';
    dt.message='no_wa is required';
  }

  if(dt.status !== 'failed' && !/^\d+$/.test(dt.no_wa))  {
    dt.message = 'no_wa must be numeric';
    dt.status = 'failed';
    dt.code = 400;
  }
  return dt;
}

exports.hit_api_woowa_check_number = async (dt) => {
  // hit api woowa cek number
  try {
    const baseUrl = process.env.WOOWA_ENDPOINT;
    const apiKey = process.env.WOOWA_KEY;

    const payload = {
      phone_no: dt.no_wa,
      key: apiKey,
    };

    const response = await axios.post (
      `${baseUrl}/check_number`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('Sukses:', response.data);
    if (response.data.code == 200) {
      if (response.data.results.message == 'Registered number on whatsapp') {
        dt.message = 'valid';
      } else {
        dt.message = 'invalid';
        dt.status = 'failed';
        dt.code = 400;
      }
    } else {
      dt.message = 'invalid';
      dt.status = 'failed';
      dt.code = 400;
    }

  } catch (error) {
    dt.message = 'invalid';
    dt.status = 'failed';
    console.error('Gagal:', error.response?.data || error.message);
  }
 
  dt.data = dt.no_wa;
  return dt;
}

exports.capture_payload_send_wa = async (dt) => {
  dt = {
    ...dt,
    code: 200,
    status: 'success',
    message: 'success',
    data: {},
    payload: {
      no_wa: dt.no_wa || dt.payload?.no_wa || '',
      pesan: dt.pesan || dt.payload?.pesan || ''
    }
  };
  return dt;
}
exports.validasi_payload_send_wa = async (dt) => {
  if (dt.payload.no_wa == '') {
    dt.message = 'no_wa is required';
    dt.status = 'failed';
    dt.code = 400;
  }
  if (dt.payload.pesan == '') {
    dt.message = 'pesan is required';
    dt.status = 'failed';
    dt.code = 400;
  }

  return dt;
}
exports.hit_api_woowa_send_wa = async (dt) => {
  if (dt.status == 'failed') {
    return dt;
  }
  try {
    const baseUrl = process.env.WOOWA_ENDPOINT;
    const apiKey = process.env.WOOWA_KEY;

    const payload = {
      phone_no: dt.payload.no_wa,
      key: apiKey,
      message: dt.payload.pesan,
    };

    const response = await axios.post (
      `${baseUrl}/send_message`, payload, { headers: { 'Content-Type': 'application/json' } }
    );

    console.log ('Sukses:', response.data);
    dt.message = response?.data?.results?.message;

  } catch (error) {
    dt.message = 'invalid';
    dt.status = 'failed';
    console.error('Gagal:', error.response?.data || error.message);
  }
 
  return dt;
}