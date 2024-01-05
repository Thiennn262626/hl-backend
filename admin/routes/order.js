const express = require("express");
const router = express.Router();
require("dotenv").config();
const database = require("../../config");
const sql = require("mssql");
const { refundOrderPayment } = require("../../utils/momo_payment");
const mail_util = require("../../utils/mail");

const checkAuth = require("../../middleware/check_auth");
const checkRoleAdmin = require("../../middleware/check_role_admin");

router.get(
  "/get-list",
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const { orderStatus } = request.query;
      const ListOrder = await getListOrderByStatus(
        orderStatus,
        request.userData.uuid
      );
      response.status(200).json(ListOrder);
    } catch (error) {
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          error: "",
        });
      }
      response.status(500).json({
        message: error,
      });
    }
  }
);
async function getListOrderByStatus(orderStatus, idAccount) {
  try {
    const query = `
          SELECT
          o.id AS orderID,
          o.orderCode,
          o.paymentMethod,
          o.orderStatus,
          o.orderShippingFee,
          po.finish_pay AS finishPay,
          oi.orderItemJsonToString AS dataOrderItem,
          ot.actionDate,
          ot.orderStatus AS orderStatusTracking
          FROM [Order] AS o
          LEFT JOIN Order_item AS oi ON oi.orderId = o.id
          LEFT JOIN Payment_order AS po ON po.orderId = o.id
          LEFT JOIN OrderTracking AS ot ON o.id = ot.orderId
          WHERE o.orderStatus = @orderStatus
          ORDER BY COALESCE(ot.actionDate, o.createdDate) DESC;
          `;
    const result = await database
      .request()
      .input("idAccount", idAccount)
      .input("orderStatus", orderStatus)
      .query(query);
    const resultMap = {};
    result.recordset.forEach((item) => {
      const { orderID, dataOrderItem, orderShippingFee, ...rest } = item;

      let parsedOrderShippingFee;
      try {
        parsedOrderShippingFee = JSON.parse(orderShippingFee);
      } catch (error) {
        parsedOrderShippingFee = {};
      }

      let parsedDataOrderItem;
      try {
        parsedDataOrderItem = JSON.parse(dataOrderItem);
      } catch (error) {
        parsedDataOrderItem = null;
      }

      if (resultMap[orderID]) {
        const existingDataItem = resultMap[orderID].dataOrderItem.find(
          (existingItem) =>
            JSON.stringify(existingItem) === JSON.stringify(parsedDataOrderItem)
        );

        if (!existingDataItem) {
          resultMap[orderID].dataOrderItem.push(parsedDataOrderItem);
        }
      } else {
        resultMap[orderID] = {
          orderID,
          dataOrderItem: parsedDataOrderItem ? [parsedDataOrderItem] : [],
          orderShippingFee: parsedOrderShippingFee,
          actionDateNewest: {
            actionDate: item.actionDate,
            orderStatus: item.orderStatusTracking,
          },
          orderCode: item.orderCode,
          paymentMethod: item.paymentMethod,
          orderStatus: item.orderStatus,
          finishPay: item.finishPay,
        };
      }
    });

    const resultArray = Object.values(resultMap);
    return resultArray;
  } catch (error) {
    throw "Error in getOrderId";
  }
}

//  ORDER_STATUS_NEW : 0,
//   ORDER_STATUS_APPROVED : 1,
//   ORDER_STATUS_PACKING : 2,
//   ORDER_STATUS_ON_DELIVERING : 3,
//   ORDER_STATUS_DELIVERY_SUCCESS : 4,
//   ORDER_STATUS_CUSTOMER_CANCELLED : 5,
//   ORDER_STATUS_SELLER_CANCELLED : 6,
//   ORDER_STATUS_RETURNED : 7,

router.post(
  "/admin-update-order-status",
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    let transaction = new sql.Transaction(database);
    try {
      console.log("request.query", request.query);
      const orderID = request.query.orderID;
      const orderStatus = Number(request.query.orderStatus);
      const now = new Date();
      const [currentOrderStatus, finishPay, paymentMethod, actionDate] =
        await checkOrderExistAndGetCurrentStatusAndFinishPayAdmin(orderID);
      const checkExpired = checkExpiredOrder(actionDate);
      const orderItem = await getOrderDetailByID(orderID);
      await transaction
        .begin()
        .then(async () => {
          switch (currentOrderStatus) {
            case 0:
              switch (orderStatus) {
                case 1:
                  if (
                    paymentMethod === 0 ||
                    (finishPay === true && paymentMethod === 1)
                  ) {
                    // duyet don hang
                    await updateOrderStatus(orderID, orderStatus, transaction);
                    await createOrderTracking(
                      orderID,
                      transaction,
                      now,
                      orderStatus
                    );
                  } else if (finishPay === false && paymentMethod === 1) {
                    throw "Don hang chua thanh toan bang momo";
                  }
                  break;
                default:
                  throw "Invalid order status";
              }
              break;
            case 1:
              if (orderStatus === 2) {
                // chuyen trang thai dong goi
                await updateOrderStatus(orderID, orderStatus, transaction);
                await createOrderTracking(
                  orderID,
                  transaction,
                  now,
                  orderStatus
                );
              } else if (orderStatus === 6) {
                if (checkExpired) {
                  if (finishPay === false) {
                    // huy don hang
                    await updateOrderStatus(orderID, orderStatus, transaction);
                    await createOrderTracking(
                      orderID,
                      transaction,
                      now,
                      orderStatus
                    );
                  } else {
                    await updateOrderStatus(orderID, orderStatus, transaction);
                    await createOrderTracking(
                      orderID,
                      transaction,
                      now,
                      orderStatus
                    );
                    refundOrderPayment(
                      amount,
                      transId,
                      orderIdOrder,
                      requestId
                    );
                    console.log("refundOrderPayment success");
                    await updateOrderPayment(orderID, transaction);
                    if (
                      orderItem.receiverAddresse.receiverEmail !== null ||
                      orderItem.receiverAddresse.receiverEmail !== ""
                    ) {
                      mail_util.sendMessagePaymentRefund(orderItem);
                    }
                  }
                } else {
                  throw "Chua het han 10 ngay";
                }
              }
              break;
            case 2:
              if (orderStatus === 3) {
                // chuyen trang thai giao hang
                await updateOrderStatus(orderID, orderStatus, transaction);
                await createOrderTracking(
                  orderID,
                  transaction,
                  now,
                  orderStatus
                );
              } else {
                throw "Invalid order status";
              }
              break;
            case 3:
              if (orderStatus === 4 && checkExpired) {
                // chuyen trang thai giao hang thanh cong sau 10 ngay
                await updateOrderStatus(orderID, orderStatus, transaction);
                await createOrderTracking(
                  orderID,
                  transaction,
                  now,
                  orderStatus
                );
              } else if (orderStatus === 4 && !checkExpired) {
                throw "Chua het han 10 ngay";
              } else if (orderStatus === 7) {
                //tra hang khi giao hang that bai
                await updateOrderStatus(orderID, orderStatus, transaction);
                await createOrderTracking(
                  orderID,
                  transaction,
                  now,
                  orderStatus
                );
              } else {
                throw "Invalid order status";
              }
              break;
            default:
              throw "Invalid order status";
          }
          await transaction.commit();
          response.status(200).json({
            message: "Update order status success",
          });
          if (orderItem.receiverAddresse.receiverEmail !== null) {
            mail_util.sendMessageVerifyOrder(orderItem);
          }
        })
        .catch(async (err) => {
          await transaction.rollback();
          throw err;
        });
    } catch (error) {
      console.log(error);
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          errorCode: "EREQUEST",
        });
      }
      response.status(500).json({
        errorCode: error,
      });
    }
  }
);

async function updateOrderPayment(orderID, transaction) {
  try {
    const query = `
        UPDATE Payment_order
        SET finish_pay = @finishPay
        WHERE orderId = @orderID;
    `;
    await transaction
      .request()
      .input("orderID", orderID)
      .input("finishPay", false)
      .query(query);
  } catch (error) {
    throw "Error in updateOrderPayment";
  }
}

async function createOrderTracking(
  orderID,
  transaction,
  DateNow,
  orderStatus = 0
) {
  try {
    const query = `
        INSERT INTO OrderTracking (orderId, orderStatus, actionDate)
        VALUES (@orderId, @orderStatus, @createdDate);
        `;
    await transaction
      .request()
      .input("orderId", orderID)
      .input("orderStatus", orderStatus)
      .input("createdDate", DateNow)
      .query(query);
  } catch (error) {
    throw "Error in createOrderTracking";
  }
}
async function updateOrderStatus(orderID, orderStatus, transaction) {
  try {
    const query = `
        UPDATE [Order]
        SET orderStatus = @orderStatus
        WHERE id = @orderID;
        `;
    await transaction
      .request()
      .input("orderID", orderID)
      .input("orderStatus", orderStatus)
      .query(query);
  } catch (error) {
    console.log(error);
    throw "Error in updateOrderStatus";
  }
}

function checkExpiredOrder(actionDate) {
  const currentDate = new Date();
  const actionDateDate = new Date(actionDate);
  const timeDifference = currentDate - actionDateDate;
  const daysDifference = timeDifference / (1000 * 60 * 60 * 24);
  console.log("daysDifference: " + daysDifference);
  return daysDifference >= 10;
}

async function checkOrderExistAndGetCurrentStatusAndFinishPayAdmin(orderID) {
  try {
    const query = `
    SELECT
    o.orderStatus,
    po.finish_pay AS finishPay,
    o.paymentMethod,
    ot.actionDate
    FROM [Order] AS o
    LEFT JOIN Payment_order AS po ON o.id = po.orderId
    LEFT JOIN OrderTracking AS ot ON o.id = ot.orderId
    WHERE o.id = @orderID
    ORDER BY ot.actionDate DESC;
    `;
    const result = await database
      .request()
      .input("orderID", orderID)
      .query(query);
    if (result.recordset.length === 0) {
      throw "Error in checkOrderExist";
    }
    return [
      result.recordset[0].orderStatus,
      result.recordset[0].finishPay,
      result.recordset[0].paymentMethod,
      result.recordset[0].actionDate,
    ];
  } catch (error) {
    throw error;
  }
}

router.get(
  "/get-detail",
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const { orderID } = request.query;

      await checkOrderExist(orderID);
      const orderItemList = await getOrderDetailByID(orderID);
      response.status(200).json(orderItemList);
    } catch (error) {
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          error: "",
        });
      }
      response.status(500).json({
        message: error,
      });
    }
  }
);

async function checkOrderExist(orderID) {
  try {
    const query = `
    SELECT
    1
    FROM [Order] AS o
    WHERE  o.id = @orderID
    `;
    const result = await database
      .request()
      .input("orderID", orderID)
      .query(query);
    if (result.recordset.length === 0) {
      throw "Error in checkOrderExist";
    }
    return;
  } catch (error) {
    throw "Error in checkOrderExist";
  }
}

async function getOrderDetailByID(orderID) {
  try {
    const query = `
    SELECT
    o.receiverAddress,
    o.id AS orderID,
    o.orderCode,
    o.paymentMethod,
    o.orderStatus,
    o.createdDate AS dateCreateOrder,
    o.orderShippingFee,
    po.finish_pay AS finishPay,
    oi.orderItemJsonToString AS dataOrderItem,
    po.amount AS totalOrder,
    ot.actionDate AS dateOrderStatus
    FROM [Order] AS o
    JOIN Order_item AS oi ON o.id = oi.orderId
		LEFT JOIN Payment_order AS po ON po.orderId = o.id
    LEFT JOIN OrderTracking AS ot ON o.id = ot.orderId
    WHERE o.id = @orderID AND ot.orderStatus = (
                              SELECT MAX(ot_sub.orderStatus)
                              FROM OrderTracking AS ot_sub
                              WHERE ot_sub.orderId = o.id
                              )
    ORDER BY COALESCE(ot.actionDate, o.createdDate) DESC
    `;
    const result = await database
      .request()
      .input("orderID", orderID)
      .query(query);

    const resultMap = {};

    result.recordset.forEach((item) => {
      const {
        receiverAddress,
        orderID,
        dataOrderItem,
        orderShippingFee,
        ...rest
      } = item;

      // Chuyển đổi chuỗi JSON thành đối tượng JSON
      const parsedOrderShippingFee = JSON.parse(orderShippingFee);

      if (resultMap[orderID]) {
        resultMap[orderID].dataOrderItem.push(JSON.parse(dataOrderItem));
      } else {
        resultMap[orderID] = {
          receiverAddresse: JSON.parse(receiverAddress),
          orderID,
          dataOrderItem: [JSON.parse(dataOrderItem)],
          orderShippingFee: parsedOrderShippingFee,
          orderCode: item.orderCode,
          paymentMethod: item.paymentMethod,
          orderStatus: item.orderStatus,
          finishPay: item.finishPay,
          totalOrder: item.totalOrder,
          dateCreateOrder: item.dateCreateOrder,
          dateOrderStatus: item.dateOrderStatus,
        };
      }
    });
    const resultArray = Object.values(resultMap);
    return resultArray[0];
  } catch (error) {
    throw "Error in getOrderDetail";
  }
}

router.get(
  "/get-order-status-tracking",
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const { orderID } = request.query;
      await checkOrderExist(orderID);
      const orderStatusTrackingList = await getListOrderStatusTracking(orderID);
      response.status(200).json(orderStatusTrackingList);
    } catch (error) {
      // Xử lý lỗi cụ thể
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          error: "",
        });
      }

      response.status(500).json({
        message: error,
      });
    }
  }
);

async function getListOrderStatusTracking(orderID) {
  try {
    const query = `
    SELECT
    ot.id AS orderStatusTrackingID,
    ot.orderId AS orderID,
    ot.orderStatus,
    ot.actionDate
    FROM OrderTracking ot
    WHERE ot.orderId = @orderID
    ORDER BY ot.actionDate DESC;
    `;
    const result = await database
      .request()
      .input("orderID", orderID)
      .query(query);
    return result.recordset.map((item) => ({
      orderStatusTrackingID: item.orderStatusTrackingID,
      orderID: item.orderID,
      orderStatus: Number(item.orderStatus), // Chuyển đổi thành số
      actionDate: item.actionDate,
    }));
  } catch (error) {
    throw "Error in getListOrderStatusTracking";
  }
}

router.get(
  "/get-count-list",
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const responseCount = await countOrders();
      response.status(200).json(responseCount);
    } catch (error) {
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          error: "",
        });
      }

      response.status(500).json({
        message: "Không thể lấy số lượng đơn hàng",
      });
    }
  }
);

async function countOrders() {
  try {
    const query = `
    SELECT
    SUM(CASE WHEN o.orderStatus = 0 THEN 1 ELSE 0 END) AS countNew,
    SUM(CASE WHEN o.orderStatus = 1 THEN 1 ELSE 0 END) AS countApproved,
    SUM(CASE WHEN o.orderStatus = 2 THEN 1 ELSE 0 END) AS countPacking,
    SUM(CASE WHEN o.orderStatus = 3 THEN 1 ELSE 0 END) AS countOnDelivering,
    SUM(CASE WHEN o.orderStatus = 4 THEN 1 ELSE 0 END) AS countDeliverySuccess,
    SUM(CASE WHEN o.orderStatus = 5 THEN 1 ELSE 0 END) AS countCustomerCancelled,
    SUM(CASE WHEN o.orderStatus = 6 THEN 1 ELSE 0 END) AS countSellerCancelled,
    SUM(CASE WHEN o.orderStatus = 7 THEN 1 ELSE 0 END) AS countReturned,
    SUM(CASE WHEN o.orderStatus = 8 THEN 1 ELSE 0 END) AS countCancel
    FROM [Order] o;
    `;
    const result = await database.request().query(query);
    return result.recordset[0];
  } catch (error) {
    throw "Error in countOrders";
  }
}

module.exports = router;
