const express = require("express");
const router = express.Router();

const { sql } = require("../../config");
const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");
module.exports = router;

const RedisService = require("../../services/redis.service");

// xem sản phẩm - check cache 5p - 1đ

router.post(
  "/attention-product",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const user_id = request.user_id;
      const product_id = request.query.productID;
      const key = `attention_${user_id}_${product_id}`;
      const attention = await RedisService.getJson(key);
      if (attention) {
        return response.status(200).json({
          message: "expired cache",
        });
      } else {
        await setProductAttention(user_id, product_id);
        await RedisService.setJson(key, true);
        await RedisService.expire(key, 300);

        return response.status(200).json({
          message: "success",
          product_id: product_id,
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

//input: id san pham va khoang thoi gian trong ngay
