const express = require("express");
const router = express.Router();
const database = require("../../config");

const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");

module.exports = router;

// danh gia san pham
router.post("/create", checkAuth, checkRole, async (request, response) => {});

// sua danh gia san pham
router.put("/update", checkAuth, checkRole, async (request, response) => {});

// xoa danh gia san pham
router.delete("/delete", checkAuth, checkRole, async (request, response) => {});

// lay danh gia san pham theo id product (chi tiet san pham)
router.get("/get_ratings_by_product", async (request, response) => {
  ratings = [
    {
      orderid: 162294962243465,
      shopid: 1010741902,
      itemid: 19689938270,
      comment:
        "Giá thành phải chăng chất lượng đúng với giá chất lượng sản phẩm tuyệt vời hỗ trợ khách hàng đổi trả rất nhanh mình đã được shop hỗ trợ đổi trả hàng khị bị lỗi trong 2-3 ngày cảm thấy rất hài lòng về dịch vụ của shop đáng tin tưởng để mua thêm sản phẩm cho lần tiếp theo 5 sao cho shop nhé",
      rating_star: 5,
      status: 2,
      ctime: 1709127212,
      editable: 1,
      editable_date: 1711719212,
      userid: 1188687474,
      author_username: "vnghph",
      author_portrait: "vn-11134233-7r98o-lrvz8h83i5s417",
      detailed_rating: {
        product_quality: 5,
        seller_service: 5,
        delivery_service: 5,
        driver_service: 5,
      },
      display_variation_filter: true,
      image_data: [
        {
          image_id: "vn-11134103-7r98o-ls9yhp56o6h00b",
          linkString: "vn-11134103-7r98o-ls9yhp56o6h00b",
        },
        {
          image_id: "vn-11134103-7r98o-ls9yhp56pl1g99",
          cover_image_id: "vn-11134103-7r98o-ls9yhp56pl1g99",
        },
      ],
      original_item_info: {
        itemid: 19689938270,
        shopid: 1010741902,
        name: "Bổ não Healthy Care Ginkgo Biloba 100 viên giúp tuần hoàn máu não, cải thiện trí nhớ, tinh thần minh mẫn",
        image: "vn-11134207-7r98o-lsdjbkb2yoxwbb",
        is_snapshot: 1,
        modelid: 69319015620,
        model_name: "Bổ não",
        options: ["Bổ não"],
      },
    },
  ];
  item_rating_summary = {
    rating_total: 56,
    rating_count: [0, 0, 0, 1, 55],
    rcount_with_context: 55,
    rcount_with_image: 52,
  };
  return response.json({
    ratings: ratings,
    item_rating_summary: item_rating_summary,
  });
});

// lay danh gia san pham theo id nguoi dung (trong trang ca nhan)
router.get(
  "/get_ratings_by_user",
  checkAuth,
  checkRole,
  async (request, response) => {}
);

// lay chi tiet danh gia san pham theo id don hang
router.get(
  "/get_ratings_by_order",
  checkAuth,
  checkRole,
  async (request, response) => {}
);

// {
//     ratings: [
//       {
//         orderid: 162294962243465,
//         shopid: 1010741902,
//         itemid: 19689938270,
//         comment:
//           "Giá thành phải chăng chất lượng đúng với giá chất lượng sản phẩm tuyệt vời hỗ trợ khách hàng đổi trả rất nhanh mình đã được shop hỗ trợ đổi trả hàng khị bị lỗi trong 2-3 ngày cảm thấy rất hài lòng về dịch vụ của shop đáng tin tưởng để mua thêm sản phẩm cho lần tiếp theo 5 sao cho shop nhé",
//         rating_star: 5,
//         status: 2,
//         ctime: 1709127212,
//         editable: 1,
//         editable_date: 1711719212,
//         userid: 1188687474,
//         author_username: "vnghph",
//         author_portrait: "vn-11134233-7r98o-lrvz8h83i5s417",
//         detailed_rating: {
//           product_quality: 5,
//           seller_service: 5,
//           delivery_service: 5,
//           driver_service: 5,
//         },
//         display_variation_filter: true,
//         image_data: [
//           {
//             image_id: "vn-11134103-7r98o-ls9yhp56o6h00b",
//             linkString: "vn-11134103-7r98o-ls9yhp56o6h00b",
//           },
//           {
//             image_id: "vn-11134103-7r98o-ls9yhp56pl1g99",
//             cover_image_id: "vn-11134103-7r98o-ls9yhp56pl1g99",
//           },
//         ],
//         original_item_info: {
//           itemid: 19689938270,
//           shopid: 1010741902,
//           name: "Bổ não Healthy Care Ginkgo Biloba 100 viên giúp tuần hoàn máu não, cải thiện trí nhớ, tinh thần minh mẫn",
//           image: "vn-11134207-7r98o-lsdjbkb2yoxwbb",
//           is_snapshot: 1,
//           modelid: 69319015620,
//           model_name: "Bổ não",
//           options: ["Bổ não"],
//         },
//       },
//     ],
//     item_rating_summary: {
//       rating_total: 56,
//       rating_count: [0, 0, 0, 1, 55],
//       rcount_with_context: 55,
//       rcount_with_image: 52,
//     },
//   }
