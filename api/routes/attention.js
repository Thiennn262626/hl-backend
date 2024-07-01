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

// router.get("/generate-attentions", async (request, response) => {
//   try {
//     const products = await getProducts();
//     const users = await getUsers();
//     let a = [];
//     let index = 0;
//     for (const product of products) {
//       let rs = {};
//       let b = [];
//       rs.createdDate = product.createdDate;
//       const userCount = getRandomInt(3, 20);
//       const selectedUsers = getRandomElements(users, userCount);
//       for (const user of selectedUsers) {
//         const randomDate = getRandomDate(
//           new Date(product.createdDate),
//           getDateAfter(15)
//         );
//         b.push(randomDate);
//         await setProductAttention(user.user_id, product.product_id, randomDate);
//         console.log(
//           user.user_id,
//           product.product_id,
//           randomDate,
//           getDateAfter(15),
//           index++
//         );
//       }
//       rs.attention = b.length;
//       a.push(rs);
//     }

//     response.status(200).json({
//       message: "success",
//       total: a.length,
//       a: a,
//     });
//   } catch (error) {
//     console.log(error);
//     response.status(500).json({
//       error: "Internal Server Error",
//     });
//   }
// });

// async function getProducts() {
//   const query = "SELECT id as product_id, createdDate FROM Product";
//   const result = await new sql.Request().query(query);
//   return result.recordset;
// }

// async function getUsers() {
//   const query = "SELECT id as user_id FROM [User]";
//   const result = await new sql.Request().query(query);
//   return result.recordset;
// }

// function getRandomInt(min, max) {
//   return Math.floor(Math.random() * (max - min + 1)) + min;
// }

// function getRandomElements(array, count) {
//   const shuffled = array.slice(0);
//   let i = array.length;
//   const min = i - count;
//   let temp, index;

//   while (i-- > min) {
//     index = Math.floor((i + 1) * Math.random());
//     temp = shuffled[index];
//     shuffled[index] = shuffled[i];
//     shuffled[i] = temp;
//   }

//   return shuffled.slice(min);
// }

// function getRandomDate(start, end) {
//   return new Date(
//     start.getTime() + Math.random() * (end.getTime() - start.getTime())
//   );
// }
// function getDateAfter(days) {
//   const today = new Date();
//   const futureDate = new Date(today);
//   futureDate.setDate(today.getDate() + days); // Thêm số ngày cần tính (15 ngày trong trường hợp này)
//   return futureDate;
// }

// async function setProductAttention(user_id, product_id, createdDate) {
//   try {
//     // const query = `INSERT INTO Attention (user_id, product_id, createdDate) VALUES (@user_id, @product_id, @createdDate)`;
//     const query = `INSERT INTO Subcribe (id_user, idProduct, createdDate) VALUES (@user_id, @product_id, @createdDate)`;
//     await new sql.Request()
//       .input("user_id", user_id)
//       .input("product_id", product_id)
//       .input("createdDate", createdDate)
//       .query(query);
//   } catch (error) {
//     console.log(error);
//     throw "not found product";
//   }
// }
