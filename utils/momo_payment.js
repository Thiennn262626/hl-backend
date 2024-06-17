const crypto = require("crypto");

const axios = require("axios");

require("dotenv").config();

async function createMomoPayment(orderId, amount) {
  const accessKey = process.env.MOMO_ACCESS_KEY;
  const secretKey = process.env.MOMO_SECRET_KEY;
  const partnerCode = process.env.MOMO_PARTNER_CODE;
  const requestId = "RD" + orderId + Date.now();
  const lang = "vi";
  const orderInfo = "Thanh toán hóa đơn của HLSHOP: " + orderId;
  const redirectUrl =
    "https://hlshop.azurewebsites.net/api/hlshop/order/payment-success";
  const ipnUrl =
    "https://hlshop.azurewebsites.net/api/hlshop/order/payment-success";
  const requestType = "captureWallet";
  const extraData = "";

  const signature = generateSignature({
    accessKey,
    amount,
    extraData,
    ipnUrl,
    orderId,
    orderInfo,
    partnerCode,
    redirectUrl,
    requestId,
    requestType,
    secretKey,
  });

  const requestBody = {
    partnerCode,
    requestId,
    orderId,
    amount,
    lang,
    orderInfo,
    redirectUrl,
    ipnUrl,
    requestType,
    extraData,
    signature,
  };

  try {
    const url = "https://test-payment.momo.vn/v2/gateway/api/create";
    const response = await axios.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log("createMomoPayment: response = ", response.data);
    const resultData = {
      signature: signature,
      orderId: response.data.orderId,
      requestId: response.data.requestId,
      amount: response.data.amount,
      resultCode: response.data.resultCode,
      payUrl: response.data.payUrl,
      qrCodeUrl: response.data.qrCodeUrl,
      deeplink: response.data.deeplink,
    };
    return resultData;
  } catch (error) {
    throw error;
  }
}

function generateSignature({
  accessKey,
  amount,
  extraData,
  ipnUrl,
  orderId,
  orderInfo,
  partnerCode,
  redirectUrl,
  requestId,
  requestType,
  secretKey,
}) {
  const rawSignature =
    "accessKey=" +
    accessKey +
    "&amount=" +
    amount +
    "&extraData=" +
    extraData +
    "&ipnUrl=" +
    ipnUrl +
    "&orderId=" +
    orderId +
    "&orderInfo=" +
    orderInfo +
    "&partnerCode=" +
    partnerCode +
    "&redirectUrl=" +
    redirectUrl +
    "&requestId=" +
    requestId +
    "&requestType=" +
    requestType;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");
  return signature;
}

async function refundOrderPayment(amount, transId, orderIdOrder, requestId) {
  var secretKey = process.env.MOMO_SECRET_KEY;
  var accessKey = process.env.MOMO_ACCESS_KEY;
  var partnerCode = process.env.MOMO_PARTNER_CODE;
  var orderId = orderIdOrder + "79";
  var description = "hoan tien hoa don: " + orderId;

  var rawSignature =
    "accessKey=" +
    accessKey +
    "&amount=" +
    amount +
    "&description=" +
    description +
    "&orderId=" +
    orderId +
    "&partnerCode=" +
    partnerCode +
    "&requestId=" +
    requestId +
    "&transId=" +
    transId;

  var signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const requestBody = JSON.stringify({
    partnerCode: partnerCode,
    orderId: orderId,
    requestId: requestId,
    amount: Number(amount),
    transId: Number(transId),
    lang: "vi",
    description: description,
    signature: signature,
  });
  try {
    const response = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/refund",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (response.data.resultCode != 0) {
      throw "refundOrderPayment error";
    }

    const resultData = {
      orderId: response.data.orderId,
      requestId: response.data.requestId,
      amount: response.data.amount,
      transId: response.data.transId,
      resultCode: response.data.resultCode,
      message: response.data.message,
      responseTime: response.data.responseTime,
    };
    console.log(
      "https://test-payment.momo.vn/v2/gateway/api/refund: resultData = ",
      resultData
    );
    return resultData;
  } catch (error) {
    throw error;
  }
}
module.exports = {
  createMomoPayment,
  refundOrderPayment,
};
