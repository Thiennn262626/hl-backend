const express = require("express");
const multer = require("multer");
const router = express.Router();
const { sql } = require("../../config");

const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");

const firebase = require("../../firebase");
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
});

module.exports = router;

// rating = {
//   order_item_id: 1,
//   comment: "Good",
//   detailed_rating: {
//     product_quality: 5,
//     seller_service: 5,
//     delivery_service: 5,
//     driver_service: 5,
//   },
//   images_id: [
//     {
//       image_id: 1,
//     },
//     {
//       image_id: 2,
//     },
//   ],
// };
// danh gia san pham
router.post("/create", checkAuth, checkRole, async (request, response) => {
  const transaction = new sql.Transaction();
  try {
    const { order_item_id, comment, detailed_rating, images_id } = request.body;

    // Kiểm tra dữ liệu đầu vào
    if (!order_item_id || !detailed_rating) {
      return response.status(400).json({ error: "Missing fields" });
    }
    if (
      Object.values(detailed_rating).some(
        (value) => value < 1 || value > 5 || typeof value !== "number"
      )
    ) {
      return response.status(400).json({ error: "Invalid rating value" });
    }
    await transaction
      .begin()
      .then(async () => {
        const query = `
          INSERT INTO Rating(order_item_id, comment, rating_star, product_quality, seller_service, delivery_service, driver_service, user_id, created_date)
          OUTPUT inserted.id AS rating_id
          VALUES(@order_item_id, @comment, @rating_star, @product_quality, @seller_service, @delivery_service, @driver_service, @user_id, @created_date)
        `;
        const result = await transaction
          .Request()
          .input("order_item_id", order_item_id)
          .input("comment", comment)
          .input("rating_star", detailed_rating.product_quality)
          .input("product_quality", detailed_rating.product_quality)
          .input("seller_service", detailed_rating.seller_service)
          .input("delivery_service", detailed_rating.delivery_service)
          .input("driver_service", detailed_rating.driver_service)
          .input("user_id", request.userData.userId)
          .input("created_date", new Date())
          .query(query);
        const rating_id = result.recordset[0].rating_id;

        if (images_id) {
          const query = `
            INSERT INTO RatingMedia(rating_id, media_id, created_date)
            VALUES(@rating_id, @media_id, @created_date)
          `;
          for (const image of images_id) {
            await transaction
              .Request()
              .input("rating_id", rating_id)
              .input("media_id", image)
              .input("created_date", new Date())
              .query(query);
          }
        }

        await transaction.commit();
        response.status(201).json({
          status: 200,
          message: "Create Order Success",
          result: {
            RatingID: rating_id,
          },
        });
      })
      .catch(async (err) => {
        await transaction.rollback();
        throw err;
      });
    return {};
  } catch (error) {
    console.log(error);
    if (error.code === "EREQUEST") {
      return response.status(500).json({
        message: "Database error",
      });
    }
    if (error.code === "EABORT") {
      return response.status(500).json({
        message: "Invalid input data",
      });
    }
    response.status(500).json({
      message: error,
    });
  }
});

// update = {
//   rating_id: 1,
//   comment: "Good",
//   detailed_rating: {
//     product_quality: 5,
//     seller_service: 5,
//     delivery_service: 5,
//     driver_service: 5,
//   },
//   images_id: [
//     {
//       image_id: 1,
//     },
//     {
//       image_id: 2,
//     },
//   ],
// };
// sua danh gia san pham
router.put("/update", checkAuth, checkRole, async (request, response) => {});

router.get("/get_ratings_by_product", async (request, response) => {
  try {
    const product_id = request.query.product_id;
    const limit = parseInt(request.query.limit) || 10;
    const offset = parseInt(request.query.offset) || 0;
    const type = parseInt(request.query.type) || 0; // 0: all, 1: 1 star, 2: 2 star, 3: 3 star, 4: 4 star, 5: 5 star
    const filter = parseInt(request.query.filter) || 0; // 0: all, 1: with context, 2: with image
    if (!product_id) {
      throw "Missing product_id";
    }
    query = `
    SELECT
    r.id AS id,
    p.id AS itemid,
    p.name AS name,
    ps.id AS modelid,
    r.comment AS comment,
    r.product_quality AS product_quality,
    r.seller_service AS seller_service,
    r.delivery_service AS delivery_service,
    r.driver_service AS driver_service,
    r.created_date AS ctime,
    r.edit_date AS editable_date,
    r.product_sku_option AS model_name,
    u.id AS userid,
    u.contactFullName AS author_username,
    u.userAvatar AS author_portrait,
    rm.linkString AS image,
    r.comment_reply AS comment_reply,
    r.userid_reply AS userid_reply,
    r.created_date_reply AS ctime_reply
    FROM Product AS p
    JOIN ProductSku AS ps ON p.id = ps.idProduct
    JOIN Rating AS r ON ps.id = r.product_sku_id
    LEFT JOIN RatingMedia AS rm ON r.id = rm.id_rating
    JOIN [User] AS u ON r.id_user = u.id
    WHERE p.id = @product_id
    ORDER BY r.created_date DESC
      `;
    const result = await new sql.Request()
      .input("product_id", product_id)
      .query(query);
    const resultMap = {};
    const rating_count = [0, 0, 0, 0, 0];
    let rcount_with_context = 0;
    let rcount_with_image = 0;
    result.recordset.forEach((item) => {
      const { id, image, ...rest } = item;
      if (!resultMap[id]) {
        resultMap[id] = {
          rating_id: id,
          itemid: item.itemid,
          comment: item.comment ? item.comment : null,
          rating_star: item.product_quality ? item.product_quality : null,
          ctime: item.ctime ? item.ctime : null,
          editable: item.editable_date ? 1 : null,
          editable_date: item.editable_date ? item.editable_date : null,
          userid: item.userid,
          author_username: item.author_username,
          author_portrait:
            item.author_portrait ===
            "https://down-vn.img.susercontent.com/file/"
              ? null
              : item.author_portrait,
          product_items: [
            {
              itemid: item.itemid,
              name: item.name,
              modelid: item.modelid,
              model_name: item.model_name ? item.model_name : null,
            },
          ],
          detailed_rating: {
            product_quality: item.product_quality,
            seller_service: item.seller_service ? item.seller_service : null,
            delivery_service: item.delivery_service
              ? item.delivery_service
              : null,
            driver_service: item.driver_service ? item.driver_service : null,
          },
          images: [],
          ItemRatingReply: item.comment_reply
            ? {
                itemid: item.itemid,
                ctime: item.ctime_reply,
                userid: item.userid_reply,
                comment: item.comment_reply,
              }
            : null,
        };
        if (item.comment) {
          rcount_with_context++;
        }
        if (item.image) {
          rcount_with_image++;
        }
        const index = item.product_quality - 1;
        if (index >= 0 && index < 5) {
          rating_count[index]++;
        }
      }
      if (image) {
        resultMap[id].images.push(image);
      }
    });
    const resultArray = Object.values(resultMap);
    // type and filter
    const filteredResult = resultArray.filter((item) => {
      const rating_star = item.rating_star;
      const comment = item.comment;
      const images = item.images;
      if (type != 0 && rating_star != type) {
        return false;
      }
      if (filter == 1 && !comment) {
        return false;
      }
      if (filter == 2 && images.length == 0) {
        return false;
      }
      return true;
    });
    // Phân trang
    const paginatedResult = filteredResult.slice(offset, offset + limit);
    response.status(200).json({
      ratings: paginatedResult,
      total: filteredResult.length,
      item_rating_summary: {
        rating_avg:
          resultArray.length > 0
            ? parseFloat(
                (
                  rating_count.reduce((a, b, i) => a + b * (i + 1), 0) /
                  resultArray.length
                ).toFixed(1)
              )
            : 0,
        rating_total: resultArray.length,
        rating_count: rating_count,
        rcount_with_context: rcount_with_context,
        rcount_with_image: rcount_with_image,
      },
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: error,
    });
  }
});

router.get(
  "/get_ratings_by_user",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const queryUser = "SELECT id FROM [User] WHERE id_account = @idAccount";
      const userResult = await new sql.Request()
        .input("idAccount", request.userData.uuid)
        .query(queryUser);
      const userid = userResult.recordset[0].id;
      const limit = parseInt(request.query.limit) || 10;
      const offset = parseInt(request.query.offset) || 0;
      const type = parseInt(request.query.type) || 0; // 0: all, 1: 1 star, 2: 2 star, 3: 3 star, 4: 4 star, 5: 5 star
      const filter = parseInt(request.query.filter) || 0; // 0: all, 1: with context, 2: with image
      if (!userid) {
        throw "Missing user_id";
      }
      query = `
      SELECT
      r.id AS id,
      p.id AS itemid,
      p.name AS name,
      ps.id AS modelid,
      r.comment AS comment,
      r.product_quality AS product_quality,
      r.seller_service AS seller_service,
      r.delivery_service AS delivery_service,
      r.driver_service AS driver_service,
      r.created_date AS ctime,
      r.edit_date AS editable_date,
      r.product_sku_option AS model_name,
      u.id AS userid,
      u.contactFullName AS author_username,
      u.userAvatar AS author_portrait,
      rm.linkString AS image,
      r.comment_reply AS comment_reply,
      r.userid_reply AS userid_reply,
      r.created_date_reply AS ctime_reply
      FROM Product AS p
      JOIN ProductSku AS ps ON p.id = ps.idProduct
      JOIN Rating AS r ON ps.id = r.product_sku_id
      LEFT JOIN RatingMedia AS rm ON r.id = rm.id_rating
      JOIN [User] AS u ON r.id_user = u.id
      WHERE u.id = @userid
      ORDER BY r.created_date DESC
      `;
      const result = await new sql.Request()
        .input("userid", userid)
        .query(query);
      const resultMap = {};
      const rating_count = [0, 0, 0, 0, 0];
      let rcount_with_context = 0;
      let rcount_with_image = 0;
      result.recordset.forEach((item) => {
        const { id, image, ...rest } = item;
        if (!resultMap[id]) {
          resultMap[id] = {
            rating_id: id,
            itemid: item.itemid,
            comment: item.comment ? item.comment : null,
            rating_star: item.product_quality ? item.product_quality : null,
            ctime: item.ctime ? item.ctime : null,
            editable: item.editable_date ? 1 : null,
            editable_date: item.editable_date ? item.editable_date : null,
            userid: item.userid,
            author_username: item.author_username,
            author_portrait:
              item.author_portrait ===
              "https://down-vn.img.susercontent.com/file/"
                ? null
                : item.author_portrait,
            product_items: [
              {
                itemid: item.itemid,
                name: item.name,
                modelid: item.modelid,
                model_name: item.model_name ? item.model_name : null,
              },
            ],
            detailed_rating: {
              product_quality: item.product_quality,
              seller_service: item.seller_service ? item.seller_service : null,
              delivery_service: item.delivery_service
                ? item.delivery_service
                : null,
              driver_service: item.driver_service ? item.driver_service : null,
            },
            images: [],
            ItemRatingReply: item.comment_reply
              ? {
                  itemid: item.itemid,
                  ctime: item.ctime_reply,
                  userid: item.userid_reply,
                  comment: item.comment_reply,
                }
              : null,
          };
          if (item.comment) {
            rcount_with_context++;
          }
          if (item.image) {
            rcount_with_image++;
          }
          const index = item.product_quality - 1;
          if (index >= 0 && index < 5) {
            rating_count[index]++;
          }
        }
        if (image) {
          resultMap[id].images.push(image);
        }
      });
      const resultArray = Object.values(resultMap);
      // type and filter
      const filteredResult = resultArray.filter((item) => {
        const rating_star = item.rating_star;
        const comment = item.comment;
        const images = item.images;
        if (type != 0 && rating_star != type) {
          return false;
        }
        if (filter == 1 && !comment) {
          return false;
        }
        if (filter == 2 && images.length == 0) {
          return false;
        }
        return true;
      });
      // Phân trang
      const paginatedResult = filteredResult.slice(offset, offset + limit);
      response.status(200).json({
        ratings: paginatedResult,
        total: filteredResult.length,
        item_rating_summary: {
          rating_avg:
            resultArray.length > 0
              ? parseFloat(
                  (
                    rating_count.reduce((a, b, i) => a + b * (i + 1), 0) /
                    resultArray.length
                  ).toFixed(1)
                )
              : 0,
          rating_total: resultArray.length,
          rating_count: rating_count,
          rcount_with_context: rcount_with_context,
          rcount_with_image: rcount_with_image,
        },
      });
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: error,
      });
    }
  }
);

// lay chi tiet danh gia san pham theo id don hang
router.get(
  "/get_ratings_by_order",
  checkAuth,
  checkRole,
  async (request, response) => {}
);

router.post(
  "/upload-image",
  upload.single("file"),
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const uniqueFileName = Date.now() + "-" + request.file.originalname;
      const blob = firebase.bucket.file(uniqueFileName);
      const blobWriter = blob.createWriteStream({
        metadata: {
          contentType: request.file.mimetype,
        },
      });
      blobWriter.on("error", (err) => {
        response.status(500).json({
          error: err.message,
        });
      });

      blobWriter.on("finish", async () => {
        try {
          const signedUrls = await blob.getSignedUrl({
            action: "read",
            expires: "03-01-2030",
          });
          const publicUrl = signedUrls[0];
          const query = `
            INSERT INTO RatingMedia(linkString, created_date)
            OUTPUT inserted.id AS id_media
            SELECT @url AS linkString, @createdDate AS created_date
          `;
          const result = await new sql.Request()
            .input("url", publicUrl)
            .input("createdDate", new Date())
            .query(query);
          response.status(201).json({
            Message: "Upload successful!",
            url: publicUrl,
            mediaID: result.recordset[0].id_media,
          });
        } catch (err) {
          response.status(500).json({
            error: err.message,
          });
        }
      });

      blobWriter.end(request.file.buffer);
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

// router.post("/import", async (request, response) => {
//   const transaction = new sql.Transaction();
//   try {
//     const dataJson = request.body;
//     const jsonDataImage = dataJson.images;
//     const dataJsonItem = dataJson.product_items;
//     const dataJsonUser = {
//       userid: dataJson.userid,
//       author_username: dataJson.author_username,
//       author_portrait: dataJson.author_portrait,
//     };
//     const dataJsonReply = dataJson.ItemRatingReply;
//     const dataJsonRating = dataJson.detailed_rating;
//     console.log("dataJson.itemid: ", dataJson.itemid);
//     // check null edit_date
//     dataJson.editable_date = dataJson.editable_date
//       ? dataJson.editable_date
//       : null;
//     console.log("dataJson.editable_date: ", dataJson.editable_date);
//     const queryGetProduct = `
//     SELECT id FROM Product WHERE item_id = @modelid
//     `;
//     const result1 = await new database
//       .Request()
//       .input("modelid", dataJson.itemid.toString().trim())
//       .query(queryGetProduct);
//     console.log("result1: ", result1.recordset);
//     if (result1.recordset.length == 0) {
//       response.status(400).json({
//         error: "Product not found",
//       });
//     }
//     const productID = result1.recordset[0].id;
//     const skus = await processSkus(productID);
//     let skus_value = [];
//     for (const sku of skus) {
//       let value = "";
//       let i = 0;
//       for (const attribute of sku.attribute) {
//         if (i == 0) {
//           value += attribute.locAttributeValueName;
//         } else {
//           value += "," + attribute.locAttributeValueName;
//         }
//         i++;
//       }
//       skus_value.push({
//         id: sku.productSKUID,
//         value: value,
//       });
//     }
//     console.log(skus_value);
//     let product_sku_id = "";
//     for (const vl of skus_value) {
//       if (vl.value == dataJson.product_items[0].model_name) {
//         product_sku_id = vl.id;
//       }
//     }
//     console.log("product_sku_id", product_sku_id);
//     if (product_sku_id == "") {
//       response.status(444).json({
//         error: "Product SKU not found",
//       });
//       return;
//     }
//     await transaction
//       .begin()
//       .then(async () => {
//         console.log("Begin transaction");
//         const query = `
//       INSERT INTO Rating(created_date, edit_date, product_quality, seller_service, delivery_service, driver_service, comment, product_sku_option,id_user_num, comment_reply, userid_reply, created_date_reply, orderid_num, author_username, author_portrait, product_sku_id)
//       OUTPUT inserted.id AS id_rating
//       SELECT @created_date AS created_date, @edit_date AS edit_date, @product_quality AS product_quality, @seller_service AS seller_service, @delivery_service AS delivery_service, @driver_service AS driver_service, @comment AS comment, @product_sku_option AS product_sku_option, @id_user_num AS id_user_num, @comment_reply AS comment_reply, @userid_reply AS userid_reply, @created_date_reply AS created_date_reply, @orderid_num AS orderid_num, @author_username AS author_username, @author_portrait AS author_portrait, @product_sku_id AS product_sku_id
//        `;
//         const result = await transaction
//           .Request()
//           .input("created_date", new Date(dataJson.ctime * 1000))
//           .input(
//             "edit_date",
//             dataJson.editable_date
//               ? new Date(dataJson.editable_date * 1000)
//               : null
//           )
//           .input("product_quality", dataJsonRating.product_quality)
//           .input("seller_service", dataJsonRating.seller_service)
//           .input("delivery_service", dataJsonRating.delivery_service)
//           .input("driver_service", dataJsonRating.driver_service)
//           .input("comment", dataJson.comment)
//           .input("product_sku_option", dataJson.product_items[0].model_name)
//           .input("id_user_num", dataJsonUser.userid.toString().trim())
//           .input("comment_reply", dataJsonReply ? dataJsonReply.comment : null)
//           .input(
//             "userid_reply",
//             dataJsonReply ? "75B9BA7C-0258-4830-9F08-66B74720229B" : null
//           )
//           .input(
//             "created_date_reply",
//             dataJsonReply ? new Date(dataJsonReply.ctime * 1000) : null
//           )
//           .input("orderid_num", dataJson.orderid)
//           .input("author_username", dataJsonUser.author_username)
//           .input("author_portrait", dataJsonUser.author_portrait)
//           .input("product_sku_id", product_sku_id)
//           .query(query);
//         console.log("insert rating success");
//         for (const element of jsonDataImage) {
//           const link = "https://down-vn.img.susercontent.com/file/" + element;
//           await insertMedia(link, result.recordset[0].id_rating, transaction);
//         }
//         console.log("End transaction");
//         await transaction.commit();
//         response.status(201).json({
//           status: 200,
//           message: "Create Order Success",
//           result: {
//             RatingID: result.recordset[0].id_rating,
//           },
//         });
//       })
//       .catch(async (err) => {
//         await transaction.rollback();
//         throw err;
//       });
//     return {};
//   } catch (error) {
//     console.log(error);
//     response.status(500).json({
//       error: "Internal Server Error",
//     });
//   }
// });
// async function processSkus(productID) {
//   try {
//     const query = `
//       SELECT
//       ps.id AS productSKUID,
//       ps.quantity AS quantity,
//       ps.price AS price,
//       ps.priceBefore AS priceBefore,
//       pav.id AS idAttributeValue1,
//       pav.valueName AS locAttributeValueName1,
//       pav2.id AS idAttributeValue2,
//       pav2.valueName AS locAttributeValueName2,
//       pa.name AS locAttributeName,
//       pa.id AS attributeID,
//       pa2.name AS locAttributeName2,
//       pa2.id AS attributeID2,
//       Media.id AS mediaID,
//       Media.linkString AS linkString,
//       Media.productAttributeValueID
//       FROM ProductSku AS ps
//       LEFT JOIN ProductAttributeValue AS pav ON ps.idAttributeValue1 = pav.id
//       LEFT JOIN ProductAttributeValue AS pav2 ON ps.idAttributeValue2 = pav2.id
//       LEFT JOIN ProductAttribute AS pa ON pav.productAttributeID = pa.id
//       LEFT JOIN ProductAttribute AS pa2 ON pav2.productAttributeID = pa2.id
//       JOIN Product ON ps.idProduct = Product.id
//       LEFT JOIN Media ON Product.id = Media.id_product
//       WHERE idProduct = @productID AND ps.quantity > 0 AND ps.enable = 1
//       `;
//     const result = await new database
//       .Request()
//       .input("productID", productID)
//       .query(query);
//     const resultMap = {};
//     const linkStringMap = {};
//     result.recordset.forEach((item) => {
//       const {
//         productSKUID,
//         mediaID,
//         idAttributeValue1,
//         idAttributeValue2,
//         attributeID,
//         attributeID2,
//         ...rest
//       } = item;
//       if (!resultMap[productSKUID]) {
//         resultMap[productSKUID] = {
//           productSKUID: productSKUID,
//           linkString: "",
//           price: item.price,
//           priceBefore: item.priceBefore,
//           quantity: item.quantity,
//           attribute: [],
//         };
//       }
//       const linkStringExist =
//         linkStringMap[mediaID] &&
//         linkStringMap[mediaID].linkString === item.linkString;
//       if (!linkStringExist) {
//         if (mediaID) {
//           linkStringMap[item.productAttributeValueID] = {
//             mediaID: mediaID,
//             linkString: item.linkString,
//             productAttributeValueID: item.productAttributeValueID,
//           };
//         }
//       }

//       const attribute1Exit = resultMap[productSKUID].attribute.some(
//         (attribute) => attribute.attributeValueID === idAttributeValue1
//       );

//       if (!attribute1Exit) {
//         if (idAttributeValue1) {
//           resultMap[productSKUID].attribute.push({
//             localizedAttributeValueID: idAttributeValue1,
//             locAttributeValueName: item.locAttributeValueName1,
//             locAttributeValueDescription: item.locAttributeValueDescription1,
//             attributeValueID: idAttributeValue1,
//             locAttributeName: item.locAttributeName,
//             attributeID: item.attributeID,
//           });
//         }
//       }
//       const attribute2Exit = resultMap[productSKUID].attribute.some(
//         (attribute) =>
//           attribute.attributeValueID === idAttributeValue2 &&
//           attribute.attributeID === item.attributeID2
//       );
//       if (!attribute2Exit) {
//         if (idAttributeValue2) {
//           resultMap[productSKUID].attribute.push({
//             localizedAttributeValueID: idAttributeValue2,
//             locAttributeValueName: item.locAttributeValueName2,
//             locAttributeValueDescription: item.locAttributeValueDescription2,
//             attributeValueID: idAttributeValue2,
//             locAttributeName: item.locAttributeName2,
//             attributeID: item.attributeID2,
//           });
//         }
//       }
//     });
//     for (const productSKUID in resultMap) {
//       const attributes = resultMap[productSKUID].attribute;
//       for (const attribute of attributes) {
//         const { localizedAttributeValueID } = attribute; // Thêm dòng này để đảm bảo localizedAttributeValueID được định nghĩa.
//         const linkStringMapItem = linkStringMap[localizedAttributeValueID];
//         if (
//           linkStringMapItem &&
//           localizedAttributeValueID == linkStringMapItem.productAttributeValueID
//         ) {
//           resultMap[productSKUID].linkString = linkStringMapItem.linkString;
//           break;
//         }
//       }
//     }

//     const resultArray = Object.values(resultMap);
//     return resultArray;
//   } catch (error) {
//     console.log(error);
//     throw "Error in processSkus";
//   }
// }
// async function insertMedia(data, id_rating, transaction) {
//   try {
//     const query = `
//       INSERT INTO RatingMedia(linkString ,created_date, id_rating)
//       SELECT @url AS linkString ,@created_date AS created_date, @id_rating AS id_rating
//     `;
//     const result = await transaction
//       .Request()
//       .input("url", data)
//       .input("created_date", new Date())
//       .input("id_rating", id_rating)
//       .query(query);
//   } catch (error) {
//     console.log(error);
//     throw "insertMedia Error";
//   }
// }

// router.post("/insert-user", async (request, response) => {
//   try {
//     const query = `
//     SELECT
//     id,
//     id_user_num,
//     author_username,
//     author_portrait,
//     orderid_num,
//     product_sku_id,
//     created_date
//     FROM Rating
//     WHERE order_item_id IS NULL
//     `;
//     const result = await new sql.query(query);
//     const data = result.recordset;
//     let res = [];
//     for (const element of data) {
//       await xuly(element, res);
//     }
//     response.status(201).json({
//       status: 200,
//     });
//     return;
//   } catch (error) {
//     console.log(error);
//     response.status(500).json({
//       error: "Internal Server Error",
//     });
//   }
// });

// async function xuly(element) {
//   const transaction = new sql.Transaction();
//   console.log("xuly", element);
//   try {
//     await transaction
//       .begin()
//       .then(async () => {
//         console.log("Begin transaction");

//         //check account exist
//         const queryCheckAccount = `
//           SELECT
//           [User].id AS id_user
//           FROM Account
//           JOIN [User] ON Account.id = [User].id_account
//           WHERE userLogin = @userLogin
//           `;
//         const resultCheckAccount = await transaction
//           .Request()
//           .input("userLogin", element.id_user_num.trim() + "@gmail.com")
//           .query(queryCheckAccount);
//         console.log("resultCheckAccount", resultCheckAccount.recordset[0]);
//         let idUser = "";
//         if (resultCheckAccount.recordset.length > 0) {
//           console.log("exist account");
//           idUser = resultCheckAccount.recordset[0].id_user;
//         } else {
//           console.log("create account");
//           const query1 = `
//           INSERT INTO [Account](userLogin, password, role, isVerify, createdDate)
//           OUTPUT inserted.id AS idAccount
//           SELECT @userLogin AS userLogin, @password AS password, @role AS role, @isVerify AS isVerify, @createdDate AS createdDate
//           `;
//           const result1 = await transaction
//             .Request()
//             .input("userLogin", element.id_user_num.trim() + "@gmail.com")
//             .input("password", element.id_user_num.trim() + "1@aA")
//             .input("role", 0)
//             .input("isVerify", 1)
//             .input("createdDate", new Date(element.created_date - 100000000))
//             .query(query1);
//           console.log("insert account success");
//           // create user
//           const query2 = `
//           INSERT INTO [User](id_account, contactFullName, userAvatar, createdDate)
//           OUTPUT inserted.id AS idUser
//           SELECT @idAccount AS id_account, @name AS contactFullName, @avatar AS userAvatar, @createdDate AS createdDate
//           `;
//           const result2 = await transaction
//             .Request()
//             .input("idAccount", result1.recordset[0].idAccount)
//             .input("name", element.author_username)
//             .input(
//               "avatar",
//               "https://down-vn.img.susercontent.com/file/" +
//                 element.author_portrait
//             )
//             .input("createdDate", new Date(element.created_date - 9999999))
//             .query(query2);
//           console.log("insert user success");
//           idUser = result2.recordset[0].idUser;
//         }
//         console.log("idUser", idUser);
//         // check order exist
//         const queryCheckOrder = `
//           SELECT
//           id,
//           totalPriceOrder
//           FROM [Order]
//           WHERE orderCode = @orderCode
//           `;
//         const resultCheckOrder = await transaction
//           .Request()
//           .input("orderCode", "SHOPEE" + element.orderid_num.trim())
//           .query(queryCheckOrder);
//         console.log("resultCheckOrder", resultCheckOrder.recordset[0]);
//         let idOrder = "";
//         let totalPriceOrder = 0;
//         if (resultCheckOrder.recordset.length > 0) {
//           console.log("exist order");
//           idOrder = resultCheckOrder.recordset[0].id;
//           totalPriceOrder = resultCheckOrder.recordset[0].totalPriceOrder;
//         } else {
//           // create order
//           const query3 = `
//           INSERT INTO [Order](createdDate, idUser, orderStatus, paymentMethod, receiverAddress, orderShippingFee, totalPriceOrder, orderCode)
//           OUTPUT inserted.id AS idOrder
//           SELECT @createdDate AS createdDate, @idUser AS idUser, @orderStatus AS orderStatus, @paymentMethod AS paymentMethod, @receiverAddress AS receiverAddress, @orderShippingFee AS orderShippingFee, @totalPriceOrder AS totalPriceOrder, @orderCode AS orderCode
//           `;
//           const receiverAddresss = getRe(element.author_username, idUser);

//           const result3 = await transaction
//             .Request()
//             .input("createdDate", new Date(element.created_date - 9999909))
//             .input("idUser", idUser)
//             .input("orderStatus", 4)
//             .input("paymentMethod", 0)
//             .input("receiverAddress", JSON.stringify(receiverAddresss))
//             .input("orderShippingFee", JSON.stringify({ shippingFee: 17000 }))
//             .input("totalPriceOrder", 0)
//             .input("orderCode", "SHOPEE" + element.orderid_num.trim())
//             .query(query3);
//           console.log("insert order success");
//           idOrder = result3.recordset[0].idOrder;
//         }

//         const getInfo = await getInfoProduct(
//           element.product_sku_id,
//           idOrder,
//           transaction
//         );
//         //update order total price
//         console.log("totalPriceOrder", getInfo[0], totalPriceOrder);

//         const query4 = `
//           UPDATE [Order]
//           SET totalPriceOrder = @totalPriceOrder
//           WHERE id = @idOrder
//           `;
//         await transaction
//           .Request()
//           .input("totalPriceOrder", getInfo[0] + totalPriceOrder)
//           .input("idOrder", idOrder)
//           .query(query4);
//         console.log("update order item success");
//         //update rating
//         const query5 = `
//           UPDATE Rating
//           SET order_item_id = @order_item_id
//           WHERE id = @idRating
//           `;
//         await transaction
//           .Request()
//           .input("order_item_id", getInfo[1].orderItemID)
//           .input("idRating", element.id)
//           .query(query5);
//         console.log("getInfo[1].orderItemID", getInfo[1].orderItemID);
//         console.log("element.id", element.id);
//         console.log("End transaction");
//         await transaction.commit();
//       })
//       .catch(async (err) => {
//         console.log("Error in transaction");
//         await transaction.rollback();
//         throw err;
//       });
//     return {};
//   } catch (error) {
//     console.log(error);
//     throw "Error in xuly";
//   }
// }

// function getRe(receiverContactName, userID) {
//   return {
//     receiverAddressID: "80085A97-36E2-48F7-9150-5E05BA9CFCDC",
//     receiverContactName: receiverContactName,
//     receiverPhone:
//       "03343" + (Math.floor(Math.random() * 90000) + 9999).toString(),
//     receiverEmail: receiverContactName + "@gmail.com",
//     receiverEmailID: "4131FF8D-10BB-44FD-96AD-B5DC12363A0C",
//     addressLabel: 1,
//     cityName: "Hồ Chí Minh",
//     districtName: "Quận Thủ Đức",
//     addressDetail:
//       Math.floor(Math.random() * 100) +
//       1 +
//       "/" +
//       Math.floor(Math.random() * 100) +
//       1,
//     cityID: "202",
//     districtID: "1463",
//     wardID: "21807",
//     wardName: "Phường Linh Tây",
//     userID: userID,
//   };
// }

// const db_action = require("../../utils/db_action");

// async function getInfoProduct(productSkuID, orderID, transaction) {
//   try {
//     console.log("get info product", productSkuID, orderID);
//     const query = `
//         INSERT INTO Order_item (product_id, orderId, productSku_id, quantity, price, price_before)
//         OUTPUT INSERTED.id, INSERTED.productSku_id, INSERTED.quantity, INSERTED.price, INSERTED.price_before, INSERTED.product_id
//         SELECT
//         p.id AS product_id,
//         @orderId AS orderId,
//         ps.id AS productSku_id,
//         @quantity AS quantity,
//         ps.price,
//         ps.priceBefore
//         FROM ProductSku AS ps
//         JOIN Product p ON ps.idProduct = p.id
//         WHERE ps.id = @productSkuID
//         `;

//     const result = await transaction
//       .Request()
//       .input("productSkuID", productSkuID)
//       .input("quantity", Math.floor(Math.random() * 3) + 1)
//       .input("orderId", orderID)
//       .query(query);
//     console.log("result", result);
//     if (result.recordset.length > 0) {
//       const queryGetSku = `
//             SELECT
//             ps.id AS productSku_id,
//             ps.idAttributeValue1 AS idAttributeValue1,
//             ps.idAttributeValue2 AS idAttributeValue2,
// 						p.name,
// 						p.description
//             FROM Product p
// 						JOIN ProductSku ps ON p.id = ps.idProduct
//             WHERE ps.id = @productSkuID;
//             `;
//       const resultGetSku = await transaction
//         .Request()
//         .input("productSkuID", result.recordset[0].productSku_id)
//         .query(queryGetSku);
//       const productSKU = {
//         productSKUID: result.recordset[0].productSku_id,
//         idAttributeValue1: resultGetSku.recordset[0].idAttributeValue1,
//         idAttributeValue2: resultGetSku.recordset[0].idAttributeValue2,
//       };
//       medias = await db_action.getImageListBySKU(
//         result.recordset[0].product_id,
//         productSKU
//       );
//       attributes = await db_action.getAttributes(
//         result.recordset[0].product_id,
//         productSKU
//       );
//       const orderItem = {
//         orderItemID: result.recordset[0].id,
//         productID: result.recordset[0].product_id,
//         productName: resultGetSku.recordset[0].name,
//         productDescription: resultGetSku.recordset[0].description.substring(
//           0,
//           100
//         ),
//         productSKUID: result.recordset[0].productSku_id,
//         medias: medias,
//         quantity: result.recordset[0].quantity,
//         price: result.recordset[0].price,
//         priceBefore: result.recordset[0].price_before,
//         attribute: attributes,
//       };
//       const queryUpdateOrderItem = `
//             UPDATE Order_item
//             SET orderItemJsonToString = @orderItemJsonToString
//             WHERE id = @orderItemID;
//             `;
//       await transaction
//         .Request()
//         .input("orderItemJsonToString", JSON.stringify(orderItem))
//         .input("orderItemID", orderItem.orderItemID)
//         .query(queryUpdateOrderItem);
//       console.log("orderItem", orderItem);
//       return [
//         result.recordset[0].price * result.recordset[0].quantity,
//         orderItem,
//       ];
//     } else {
//       throw "Not Exist cartID";
//     }
//   } catch (error) {
//     console.log("Error in getInfoProduct");
//     throw error;
//   }
// }
