const express = require("express");
const router = express.Router();

const { sql } = require("../../config");
const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");
module.exports = router;

// xem sản phẩm - check cache 5p - 1đ
// mua sản phẩm thành công - 3đ
// yêu thích sản phẩm - check cache 3p - 2đ
// thêm vào giỏ hàng - 3p - 5đ

router.get("/attention-product", checkAuth, checkRole, async (req, res) => {
  try {
    const { user_id } = req.user_id;
    const product_id = req.query.product_id;
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
});
