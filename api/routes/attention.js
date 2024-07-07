const express = require("express");
const router = express.Router();

const { sql } = require("../../config");
const RedisService = require("../../services/redis.service");
const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");
module.exports = router;

// xem sản phẩm - check cache 5p - 1đ

router.post(
  "/attention-product",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      console.log("attention: ", request.query.ProductID);
      const user_id = request.user_id;
      const product_id = request.query.ProductID;
      const key = `attention_${user_id}_${product_id}`;
      const attention = await RedisService.getJson(key);
      if (attention) {
        console.log("expired cache");
        return response.status(200).json({
          message: "expired cache",
        });
      } else {
        await setProductAttention(user_id, product_id);
        await RedisService.setJson(key, true);
        await RedisService.expire(key, 60 * 5);
        await getListAttentionByUser(user_id);
        console.log("success");
        return response.status(200).json({
          message: "success",
          productID: product_id,
        });
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Product not found",
      });
    }
  }
);

async function setProductAttention(user_id, product_id) {
  try {
    console.log(user_id, product_id);
    const query = `INSERT INTO Attention (user_id, product_id, createdDate) VALUES (@user_id, @product_id, @createdDate)`;
    await new sql.Request()
      .input("user_id", user_id)
      .input("product_id", product_id)
      .input("createdDate", new Date())
      .query(query);
  } catch (error) {
    console.log(error);
    throw "not found product";
  }
}

async function getListAttentionByUser(user_id) {
  try {
    //get top 5 lastest attention
    const query = `
    SELECT TOP 5
    a.product_id
    FROM Attention AS a
    JOIN Product AS p ON p.id = a.product_id
    WHERE a.user_id = @user_id
    ORDER BY a.createdDate DESC;
    `;
    const result = await new sql.Request()
      .input("user_id", user_id)
      .query(query);
    let products = [];
    for (const product of result.recordset) {
      products.push(product.product_id);
    }
    console.log("getListAttentionByUser: ", products);
    const key = `attention_${user_id}`;
    RedisService.setJson(key, products || []);
  } catch (error) {
    console.log(error);
    throw "Error get list attention";
  }
}

//input: id san pham va khoang thoi gian trong ngay
