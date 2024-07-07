const express = require("express");
const axios = require("axios");

const router = express.Router();

const { sql } = require("../../config");
const RedisService = require("../../services/redis.service");
const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");
const GetList = require("../../utils/product_controller/get_list");

const { TrainingContendBaseGetByProduct } = require("../../lib/scheduler");
const e = require("express");
async function getProductDetail(idProduct) {
  try {
    const queryProduct = `
      SELECT 
      p.id AS productID,
      p.name AS productName,
      p.description AS productDescription,
      p.slogan AS productSlogan,
      p.notes AS productNotes,
      p.madeIn AS productMadeIn,
      p.uses AS productUses,
      p.ingredient AS productIngredient,
      p.objectsOfUse AS productObjectsOfUse,
      p.preserve AS productPreserve, 
      p.instructionsForUse AS productInstructionsForUse,
      p.height AS productHeight,
      p.width AS productWidth,
      p.length AS productLength,
      p.weight AS productWeight, 
      p.enable AS productEnable, 
      ps.id AS productSKUID,
      ps.price AS price,
      ps.priceBefore AS priceBefore,
      m.id AS mediaID,
      m.linkString AS linkString,
      m.title AS title,
      m.description AS description,
      c.id AS productCategoryID,
      c.name AS productCategoryName,
      c.image AS linkStringCate
      FROM Product as p 
      JOIN ProductSku as ps ON p.id = ps.idProduct 
      LEFT JOIN Media AS m ON p.id = m.id_product
      LEFT JOIN ProductAttributeValue AS pav ON ps.idAttributeValue1 = pav.id AND m.productAttributeValueID = pav.id
      LEFT JOIN Category as c ON p.id_Category = c.id
      WHERE p.id = @idProduct
    `;

    const result = await new sql.Request()
      .input("idProduct", idProduct)
      .query(queryProduct);

    const query_summary = `
    SELECT
    COUNT(r.id) AS rating_total,
    SUM(CASE WHEN r.product_quality = 1 THEN 1 ELSE 0 END) AS rating_1_star,
    SUM(CASE WHEN r.product_quality = 2 THEN 1 ELSE 0 END) AS rating_2_star,
    SUM(CASE WHEN r.product_quality = 3 THEN 1 ELSE 0 END) AS rating_3_star,
    SUM(CASE WHEN r.product_quality = 4 THEN 1 ELSE 0 END) AS rating_4_star,
    SUM(CASE WHEN r.product_quality = 5 THEN 1 ELSE 0 END) AS rating_5_star
    FROM Product AS p
    JOIN ProductSku AS ps ON p.id = ps.idProduct
    JOIN Rating AS r ON ps.id = r.product_sku_id
    JOIN [User] AS u ON r.id_user = u.id
    WHERE p.id =  @product_id
    `;
    const result_summary = await new sql.Request()
      .input("product_id", idProduct)
      .query(query_summary);
    const resultMap = {};
    result.recordset.forEach((item) => {
      const { productID, productSKUID, mediaID } = item;
      if (!resultMap[productID]) {
        resultMap[productID] = {
          productID: productID,
          productName: item.productName,
          productDescription: item.productDescription,
          productSlogan: item.productSlogan,
          productNotes: item.productNotes,
          productMadeIn: item.productMadeIn,
          productUses: item.productUses,
          productIngredient: item.productIngredient,
          productObjectsOfUse: item.productObjectsOfUse,
          productPreserve: item.productPreserve,
          productInstructionsForUse: item.productInstructionsForUse,
          productHeight: item.productHeight,
          productWidth: item.productWidth,
          productLength: item.productLength,
          productWeight: item.productWeight,
          productEnable: item.productEnable ? 1 : 0,
          medias: [],
          seller: {
            sellerID: "75B9BA7C-0258-4830-9F08-66B74720229B",
            businessName: "HLSHOP",
            contactFullName: "ADMIN",
            userType: 0,
            linkString:
              "https://storage.googleapis.com/hlsop-393ef.appspot.com/image.png?GoogleAccessId=firebase-adminsdk-5uq3u%40hlsop-393ef.iam.gserviceaccount.com&Expires=16730298000&Signature=mdOGFfym9%2FHsZgKS5l1NnpGX7yWhHahhEB7TXkPv9zbE8GbJ6Akf1HSNNpyLD7VRY5O%2BlWTuQWdv2wu6bFyXZmvlp%2FgR5AoNqamat8NqZ79QVIT0yyN36D6dVjliL2U61%2Fg2Cl6ZSYXnXudcC6TXFVhlbsCb7gua7tBCYbB1XDPC4EiAT47ztd256TmB%2B1jwMBz3w24hB7xt7nWwv6Pk3oc4XiyjeZAIjAsVYIiCwMTjg0lvkoC279wzfeEZapDkWwS8f4NgT8faJbaLrP4ZOTMl2EQYfomVdQwTjdxxt7avrRJyaRhd1yzV63afuEx6%2Ff71QmgY9Gxp7U%2F%2Fygjr3g%3D%3D",
          },
          productCategory: {
            productCategoryID: item.productCategoryID,
            productCategoryName: item.productCategoryName,
            linkString: item.linkStringCate,
          },
          productSKU: [],
          item_rating_summary: null,
        };
      }
      const mediaExist = resultMap[productID].medias.some(
        (media) => media.mediaID === mediaID
      );
      if (!mediaExist) {
        resultMap[productID].medias.push({
          mediaID: mediaID,
          linkString: item.linkString,
          title: item.title ? item.title : "",
          description: item.description ? item.description : "",
        });
      }

      // Kiểm tra xem productSKU có tồn tại trong productSKU hay không
      const skuExist = resultMap[productID].productSKU.some(
        (sku) =>
          sku.productSKUID === productSKUID ||
          sku.linkString === item.linkString
      );
      if (!skuExist) {
        resultMap[productID].productSKU.push({
          productSKUID: productSKUID,
          linkString: item.linkString,
          price: item.price.toString(),
          priceBefore: item.priceBefore.toString(),
        });
      }
    });
    const rating_count = [
      result_summary.recordset[0].rating_1_star,
      result_summary.recordset[0].rating_2_star,
      result_summary.recordset[0].rating_3_star,
      result_summary.recordset[0].rating_4_star,
      result_summary.recordset[0].rating_5_star,
    ];
    const rating_total = result_summary.recordset[0].rating_total || 0;
    const item_rating_summary = {
      rating_avg:
        rating_total > 0
          ? parseFloat(
              (
                rating_count.reduce((a, b, i) => a + b * (i + 1), 0) /
                rating_total
              ).toFixed(1)
            )
          : 0,
      rating_total: rating_total,
      rating_count: rating_count,
    };
    resultMap[idProduct].item_rating_summary = item_rating_summary;
    const resultArray = Object.values(resultMap);
    return resultArray[0];
  } catch (error) {
    throw error;
  }
}
router.get("/get-detail", async (request, response) => {
  try {
    const idProduct = request.query.ProductID;
    if (!idProduct) {
      response.status(400).json({
        error: "ProductID is required",
      });
      return;
    }

    let result = await RedisService.getJson(`product_${idProduct}`);
    if (!result) {
      //;
      result = await getProductDetail(idProduct);
      await RedisService.setJson(`product_${idProduct}`, result);
      await RedisService.expire(`product_${idProduct}`, 100);
    }
    response.status(200).json(result);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: error,
    });
  }
});

router.get("/get-list-best-seller", async (request, response) => {
  const key = "list_id_best_seller";
  try {
    //Sản phẩm có lượt xem hoặc lượt yêu thích cao
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;

    let resultID = await RedisService.getJson(key);
    if (!resultID) {
      resultID = await GetList.getIDlistbestseller();
      await RedisService.setJson(key, resultID);
      await RedisService.expire(key, 60 * 5);
    }
    const paginatedResultID = resultID.slice(offset, offset + limit);
    const products = await getListProductByListID(paginatedResultID);
    response.status(200).json({ result: products, total: resultID.length });
  } catch (error) {
    console.error(error);
    response.status(500).json({ errorCode: error });
  }
});

// router.get(
//   "/get-list-recommend-by-user",
//   checkAuth,
//   checkRole,
//   async (request, response) => {
//     try {
//       const userid = request.user_id;
//       console.log("userid: ", userid);
//       var offset = parseInt(request.query.offset) || 0;
//       var limit = parseInt(request.query.limit) || 10;

//       let resultArray = await RedisService.getJson("listProduct");
//       if (!resultArray) {
//         resultArray = await getListProduct();
//         await RedisService.setJson("listProduct", resultArray);
//         await RedisService.expire("listProduct", 60 * 60 * 24);
//       }
//       //call api from web
//       res = await recommendByUser(userid);
//       if (res.result) {
//         const id_list = res.result;

//         // Lọc resultArray để chỉ bao gồm các phần tử có productID trong id_list
//         let filteredResultArray = resultArray.filter((item) =>
//           id_list.includes(item.productID)
//         );

//         // Sắp xếp filteredResultArray theo thứ tự của id_list
//         filteredResultArray.sort((a, b) => {
//           return id_list.indexOf(a.productID) - id_list.indexOf(b.productID);
//         });

//         resultArray = filteredResultArray;
//       }

//       // Phân trang
//       const paginatedResult = resultArray.slice(offset, offset + limit);

//       response.status(200).json({
//         result: paginatedResult,
//         total: res.result.length,
//       });
//     } catch (error) {
//       console.error(error);
//       response.status(500).json({ errorCode: error });
//     }
//   }
// );
router.get(
  "/get-list-recommend-by-user",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      var offset = parseInt(request.query.offset) || 0;
      var limit = parseInt(request.query.limit) || 10;
      console.log("offset: ", offset, "limit: ", limit);
      const key = `list_id_of_user_${request.user_id}`;
      resultID = await RedisService.getJson(key);
      console.log("resultID: ", resultID);
      // if (offset === 0) {
      //   resultID = await processIDS(request.user_id);
      //   await RedisService.setJson(key, resultID);
      // } else {
      //   resultID = await RedisService.getJson(key);
      //   if (!resultID) {
      //     resultID = await processIDS(request.user_id);
      //     await RedisService.setJson(key, resultID);
      //   }
      // }
      console.log("resultID: ", resultID?.length);
      const paginatedResultID = resultID.slice(offset, offset + limit);
      const products = await getListProductByListID(paginatedResultID);
      response.status(200).json({ result: products, total: resultID.length });
    } catch (error) {
      console.error(error);
      response.status(500).json({ errorCode: error });
    }
  }
);

async function processIDS(user_id) {
  try {
    console.log("processIDS of user_id: ", user_id);
    const keys = [
      `newest_order_${user_id}`,
      `cart_${user_id}`,
      `subcribe_${user_id}`,
      `attention_${user_id}`,
      `collaborative_filtering_user_${user_id}`,
      "collaborative_filtering_by_time",
    ];

    const [
      lastOrder,
      lastCart,
      lastSubcribe,
      lastAttention,
      products_rcm,
      collaborative_filtering,
    ] = await Promise.all(keys.map((key) => RedisService.getJson(key)));

    const possibleLists = [
      lastOrder,
      lastCart,
      lastSubcribe,
      lastAttention,
      products_rcm?.slice(0, 5),
    ].filter((list) => list && list.length > 0);
    // Chọn ngẫu nhiên một mảng từ các mảng không rỗng
    const randomList =
      possibleLists[Math.floor(Math.random() * possibleLists.length)];
    console.log("randomList: ", randomList);
    let newID = [];
    if (randomList) {
      const listRamdon = randomList.slice(0, 5); // Lấy 5 phần tử đầu tiên
      for (const item of listRamdon) {
        const recommendation = await RedisService.getJson(
          `recommendation-content-based-${item}`
        );
        newID = newID.concat(recommendation?.slice(0, 10)); // Lấy 5 phần tử đầu tiên của mỗi recommendation
      }
      let idArray = newID
        .filter((item) => item !== undefined) // Loại bỏ các giá trị undefined
        .map((item) => item.id); // Chuyển đổi thành mảng chỉ chứa id
      newID = Array.from(new Set(idArray)); // Loại bỏ các id trùng lặp
    }
    console.log("newID: ", newID?.length);
    const resultIDSet = new Set([
      ...(newID || []),
      ...(lastOrder || []),
      ...(lastCart || []),
      ...(products_rcm || []),
      ...(lastSubcribe || []),
      ...(lastAttention || []),
      ...(collaborative_filtering || []),
    ]);

    const resultID = Array.from(resultIDSet);

    return resultID;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function getListProductByListID(paginatedResultID) {
  try {
    const queryProduct = `
      DECLARE @NewValues NVARCHAR(MAX);
      SET @NewValues = @paginatedResult;
      WITH NumberedValues AS (
          SELECT ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS RowNumber, value AS productID
          FROM OPENJSON(@NewValues)
      )
      SELECT
          p.id AS productID,
          p.name AS productName,
          p.description AS productDescription,
          p.slogan AS productSlogan,
          p.notes AS productNotes,
          p.madeIn AS productMadeIn,
          p.sellQuantity AS sellQuantity,
          p.createdDate AS createdDate,
          p.enable AS productEnable,
          ps.id AS productSKUID,
          ps.price AS price,
          ps.priceBefore AS priceBefore,
          m.id AS mediaID,
          m.linkString AS linkString,
          m.title AS title,
          m.description AS description
        FROM NumberedValues AS nv
        JOIN Product as p ON p.id = nv.productID
        JOIN ProductSku as ps ON p.id = ps.idProduct
        JOIN Media as m ON p.id = m.id_product
        WHERE p.enable = 1
        ORDER BY nv.RowNumber;
            `;
    const result = await new sql.Request()
      .input("paginatedResult", sql.NVarChar, JSON.stringify(paginatedResultID))
      .query(queryProduct);
    const resultMap = {};
    result.recordset.forEach((item) => {
      const { productID, productSKUID, mediaID } = item;
      if (!resultMap[productID]) {
        resultMap[productID] = {
          productID: productID,
          productName: item.productName,
          productDescription: item.productDescription,
          productSlogan: item.productSlogan,
          productNotes: item.productNotes,
          productMadeIn: item.productMadeIn,
          sellQuantity: item.sellQuantity,
          createdDate: item.createdDate,
          medias: [
            {
              mediaID: mediaID,
              linkString: item.linkString,
              title: item.title ? item.title : "",
              description: item.description ? item.description : "",
            },
          ],
          productSKU: [
            {
              productSKUID: productSKUID,
              price: item.price,
              priceBefore: item.priceBefore,
            },
          ],
        };
      }
    });

    const resultArray = Object.values(resultMap);
    return resultArray;
  } catch (error) {
    throw error;
  }
}
async function recommendByUser(user_id) {
  try {
    products_rcm = await RedisService.getJson(
      `collaborative_filtering_user_${user_id}`
    );
    console.log("products_rcm: ", products_rcm);
    if (products_rcm) {
      return {
        result: products_rcm,
      };
    }
    throw "No recommended product for this user";
  } catch (error) {
    console.error(error);
    throw error;
  }
}

router.get("/get-list-new", async (request, response) => {
  const key = "list_id_new";
  try {
    //Sản phẩm mới nhất được thêm vào cửa hàng
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;

    let resultID = await RedisService.getJson(key);
    if (!resultID) {
      resultID = await GetList.getIDlistnew();
      await RedisService.setJson(key, resultID);
      await RedisService.expire(key, 60 * 5);
    }
    const paginatedResultID = resultID.slice(offset, offset + limit);
    const products = await getListProductByListID(paginatedResultID);
    response.status(200).json({ result: products, total: resultID.length });
  } catch (error) {
    console.error(error);
    response.status(500).json({ errorCode: error });
  }
});

// async function getListProduct() {
//   try {
//     const queryProduct = `
//     SELECT
//     p.id AS productID,
//     p.name AS productName,
//     p.description AS productDescription,
//     p.slogan AS productSlogan,
//     p.notes AS productNotes,
//     p.madeIn AS productMadeIn,
//     p.sellQuantity AS sellQuantity,
//     p.createdDate AS createdDate,
//     ps.id AS productSKUID,
//     ps.price AS price,
//     ps.priceBefore AS priceBefore,
//     m.id AS mediaID,
//     m.linkString AS linkString,
//     m.title AS title,
//     m.description AS description
//     FROM Product as p
//     JOIN ProductSku as ps ON p.id = ps.idProduct
//     JOIN Media as m ON p.id = m.id_product
//     WHERE ps.quantity > 0 AND ps.enable = 1 AND p.enable = 1
//             `;
//     const result = await new sql.Request().query(queryProduct);

//     const resultMap = {};
//     result.recordset.forEach((item) => {
//       const { productID, productSKUID, mediaID } = item;
//       if (!resultMap[productID]) {
//         resultMap[productID] = {
//           productID: productID,
//           productName: item.productName,
//           productDescription: item.productDescription,
//           productSlogan: item.productSlogan,
//           productNotes: item.productNotes,
//           productMadeIn: item.productMadeIn,
//           sellQuantity: item.sellQuantity,
//           createdDate: item.createdDate,
//           medias: [
//             {
//               mediaID: mediaID,
//               linkString: item.linkString,
//               title: item.title ? item.title : "",
//               description: item.description ? item.description : "",
//             },
//           ],
//           productSKU: [
//             {
//               productSKUID: productSKUID,
//               price: item.price,
//               priceBefore: item.priceBefore,
//             },
//           ],
//         };
//       }
//     });

//     const resultArray = Object.values(resultMap);
//     return resultArray;
//   } catch (error) {
//     throw error;
//   }
// }

// router.get("/backup-elastic", async (request, response) => {
//   try {
//     const query = "SELECT id FROM Product";
//     const result = await sql.query(query);
//     for (const item of result.recordset) {
//       const result = await getProductDetail(item.id);
//       console.log(result.productID);
//       await client.index(
//         {
//           index: "products",
//           id: result.productID,
//           body: result,
//         },
//         function (err, resp, status) {
//           console.log(resp);
//         }
//       );
//     }
//     response.status(200).json({
//       message: "Backup data to Elasticsearch successfully",
//     });
//   } catch (error) {
//     console.error(error);
//     response.status(500).json({ errorCode: error });
//   }
// });
var client = require("../../services/elasticsearch.service");

router.get("/get-list-search", async (request, response) => {
  try {
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;
    var search = request.query.search || "";
    var sort = parseInt(request.query.sortBy);

    let sortOptions = [];

    switch (sort) {
      case 1:
        sortOptions.push({ "productSKU.price": { order: "asc" } });
        break;
      case 2:
        sortOptions.push({ "productSKU.price": { order: "desc" } });
        break;
      case 3:
        sortOptions.push({ createdDate: { order: "desc" } });
        break;
      case 4:
        sortOptions.push({ createdDate: { order: "asc" } });
        break;
      default:
        sortOptions = [];
        break;
    }

    let query = {
      bool: {
        must: [
          {
            term: { productEnable: 1 },
          },
        ],
      },
    };

    if (search) {
      query.bool.must.push({
        multi_match: {
          query: search,
          fields: ["productName", "productSlogan", "productDescription"],
        },
      });

      query.bool.should = [
        {
          match_phrase: {
            productName: {
              query: search,
              boost: 4,
            },
          },
        },
        {
          match_phrase: {
            productSlogan: {
              query: search,
              boost: 3,
            },
          },
        },
        {
          match_phrase: {
            productDescription: {
              query: search,
              boost: 2,
            },
          },
        },
      ];
    } else {
      query.bool.must.push({ match_all: {} });
    }

    const result = await client.search({
      index: "products",
      body: {
        query: query,
        sort: sortOptions,
        from: offset,
        size: limit,
      },
    });

    const products = result.hits.hits.map((item) => item._source);
    response
      .status(200)
      .json({ result: products, total: result.hits.total.value });
  } catch (error) {
    console.error("Error during Elasticsearch search:", error);
    response.status(500).json({ result: [], total: 0, status: "error" });
  }
});

router.get("/get-list-hot", async (request, response) => {
  const key = "list_id_hot";
  try {
    //Sản phẩm có lượt xem hoặc lượt yêu thích cao
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;
    //tinh luot xem va luot yeu thich cao trong 10 ngay gan nhat
    let resultID = await RedisService.getJson(key);
    if (!resultID) {
      resultID = await GetList.getIDlisthot();
      await RedisService.setJson(key, resultID);
      await RedisService.expire(key, 60 * 5);
    }
    const paginatedResultID = resultID.slice(offset, offset + limit);
    const products = await getListProductByListID(paginatedResultID);
    response.status(200).json({ result: products, total: resultID.length });
  } catch (error) {
    console.log("time e: ", new Date().toISOString());
    console.error(error);
    response.status(500).json({ errorCode: error });
  }
});

router.get("/get-list-good-price-today", async (request, response) => {
  const key = "list_id_good_price_today";
  try {
    //Sản phẩm có giá cả phải chăng
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;

    let resultID = await RedisService.getJson(key);
    if (!resultID) {
      resultID = await GetList.getIDlistgoodprice();
      await RedisService.setJson(key, resultID);
      await RedisService.expire(key, 60 * 5);
    }
    const paginatedResultID = resultID.slice(offset, offset + limit);
    const products = await getListProductByListID(paginatedResultID);
    response.status(200).json({ result: products, total: resultID.length });
  } catch (error) {
    console.error(error);
    response.status(500).json({ errorCode: error });
  }
});
router.get("/get-list-same-category", async (request, response) => {
  try {
    var productID = request.query.productID;
    // var productCategoryID = request.query.productCategoryID;
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;

    res = await recommendByProduct(productID);
    if (res.result) {
      const resultID = res.result;
      const paginatedResultID = resultID.slice(offset, offset + limit);
      const products = await getListProductByListID(paginatedResultID);
      response.status(200).json({ result: products, total: resultID.length });
    } else {
      response.status(200).json({ result: [], total: 0 });
    }
  } catch (error) {
    console.error(error);
    response.status(500).json({ errorCode: error });
  }
});
async function recommendByProduct(productID) {
  try {
    // var key = "recommendation-content-based-" + productID;
    // const rcm = await RedisService.getJson(key);

    // if (rcm) {
    //   const top50_product_id = rcm.map((item) => item.id);
    //   return {
    //     result: top50_product_id,
    //   };
    // } else {
    const rcm = await TrainingContendBaseGetByProduct(productID);
    const top50_product_id = rcm.map((item) => item.id);
    console.log(
      `recommendation-content-based-${productID}`,
      top50_product_id.length
    );
    return {
      result: top50_product_id,
    };
    // }
  } catch (error) {
    throw error;
  }
}

router.get("/get-product-attribute", async (request, response) => {
  try {
    const productID = request.query.productID;
    if (!productID) {
      response.status(400).json({
        error: "ProductID is required",
      });
      return;
    }
    let responseData = await RedisService.getJson(
      "product_attribute_" + productID
    );
    if (!responseData) {
      responseData = await getProductAttributes(productID);
      await RedisService.setJson(
        "product_attribute_" + productID,
        responseData
      );
      await RedisService.expire("product_attribute_" + productID, 3000);
    }
    response.status(200).json(responseData);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: error,
    });
  }
});

async function getProductAttributes(productID) {
  const query = `
    SELECT
      pa.id AS attributeID,
      pa.name AS locAttributeName,
      pa.description AS locAttributeDescription,
      pav.id AS attributeValueID,
      pav.valueName AS locAttributeValueName,
      pav.valueName AS locAttributeValueDescription
    FROM ProductAttribute pa
    LEFT JOIN ProductAttributeValue pav ON pa.id = pav.productAttributeID
    WHERE pa.id_product = @productID
    ORDER BY pa.type, pav.id;
  `;

  const result = await new sql.Request()
    .input("productID", productID)
    .query(query);

  const responseData = [];

  result.recordset.forEach((row) => {
    if (row.locAttributeName !== "" && row.locAttributeValueName !== "") {
      const existingAttribute = responseData.find(
        (attr) => attr.attributeID === row.attributeID
      );

      if (existingAttribute) {
        existingAttribute.attributeValue.push({
          attributeValueID: row.attributeValueID,
          locAttributeValueName: row.locAttributeValueName,
          locAttributeValueDescription: row.locAttributeValueDescription,
        });
      } else {
        responseData.push({
          attributeID: row.attributeID,
          locAttributeName: row.locAttributeName,
          locAttributeDescription: row.locAttributeDescription,
          attributeValue: [
            {
              attributeValueID: row.attributeValueID,
              locAttributeValueName: row.locAttributeValueName,
              locAttributeValueDescription: row.locAttributeValueDescription,
            },
          ],
        });
      }
    }
  });

  return responseData;
}

router.get("/get-product-sku-by-product-id", async (request, response) => {
  try {
    const productID = request.query.productID;
    if (!productID) {
      response.status(400).json({
        error: "ProductID is required",
      });
      return;
    }

    let skuss = await RedisService.getJson("product_sku_" + productID);
    if (!skuss) {
      //;
      skuss = await processSkus(productID);
      await RedisService.setJson("product_sku_" + productID, skuss);
      await RedisService.expire("product_sku_" + productID, 3000);
    }
    response.status(200).json({
      productID: productID,
      productSKU: skuss,
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: error,
    });
  }
});

async function processSkus(productID) {
  try {
    const query = `
      SELECT 
      ps.id AS productSKUID,
      ps.quantity AS quantity,
      ps.price AS price,
      ps.priceBefore AS priceBefore,
      pav.id AS idAttributeValue1,
      pav.valueName AS locAttributeValueName1,
      pav2.id AS idAttributeValue2,
      pav2.valueName AS locAttributeValueName2,
      pa.name AS locAttributeName,
      pa.id AS attributeID,
      pa2.name AS locAttributeName2,
      pa2.id AS attributeID2,
      Media.id AS mediaID,
      Media.linkString AS linkString,
      Media.productAttributeValueID
      FROM ProductSku AS ps
      LEFT JOIN ProductAttributeValue AS pav ON ps.idAttributeValue1 = pav.id
      LEFT JOIN ProductAttributeValue AS pav2 ON ps.idAttributeValue2 = pav2.id
      LEFT JOIN ProductAttribute AS pa ON pav.productAttributeID = pa.id
      LEFT JOIN ProductAttribute AS pa2 ON pav2.productAttributeID = pa2.id
      JOIN Product ON ps.idProduct = Product.id 
      LEFT JOIN Media ON Product.id = Media.id_product
      WHERE idProduct = @productID AND ps.quantity > 0 AND ps.enable = 1
      `;
    const result = await new sql.Request()
      .input("productID", productID)
      .query(query);
    const resultMap = {};
    const linkStringMap = {};
    result.recordset.forEach((item) => {
      const {
        productSKUID,
        mediaID,
        idAttributeValue1,
        idAttributeValue2,
        attributeID,
        attributeID2,
        ...rest
      } = item;
      if (!resultMap[productSKUID]) {
        resultMap[productSKUID] = {
          productSKUID: productSKUID,
          linkString: "",
          price: item.price,
          priceBefore: item.priceBefore,
          quantity: item.quantity,
          attribute: [],
        };
      }
      const linkStringExist =
        linkStringMap[mediaID] &&
        linkStringMap[mediaID].linkString === item.linkString;
      if (!linkStringExist) {
        if (mediaID) {
          linkStringMap[item.productAttributeValueID] = {
            mediaID: mediaID,
            linkString: item.linkString,
            productAttributeValueID: item.productAttributeValueID,
          };
        }
      }

      const attribute1Exit = resultMap[productSKUID].attribute.some(
        (attribute) => attribute.attributeValueID === idAttributeValue1
      );

      if (!attribute1Exit) {
        if (idAttributeValue1) {
          resultMap[productSKUID].attribute.push({
            localizedAttributeValueID: idAttributeValue1,
            locAttributeValueName: item.locAttributeValueName1,
            locAttributeValueDescription: item.locAttributeValueDescription1,
            attributeValueID: idAttributeValue1,
            locAttributeName: item.locAttributeName,
            attributeID: item.attributeID,
          });
        }
      }
      const attribute2Exit = resultMap[productSKUID].attribute.some(
        (attribute) =>
          attribute.attributeValueID === idAttributeValue2 &&
          attribute.attributeID === item.attributeID2
      );
      if (!attribute2Exit) {
        if (idAttributeValue2) {
          resultMap[productSKUID].attribute.push({
            localizedAttributeValueID: idAttributeValue2,
            locAttributeValueName: item.locAttributeValueName2,
            locAttributeValueDescription: item.locAttributeValueDescription2,
            attributeValueID: idAttributeValue2,
            locAttributeName: item.locAttributeName2,
            attributeID: item.attributeID2,
          });
        }
      }
    });
    for (const productSKUID in resultMap) {
      const attributes = resultMap[productSKUID].attribute;
      for (const attribute of attributes) {
        const { localizedAttributeValueID } = attribute; // Thêm dòng này để đảm bảo localizedAttributeValueID được định nghĩa.
        const linkStringMapItem = linkStringMap[localizedAttributeValueID];
        if (
          linkStringMapItem &&
          localizedAttributeValueID == linkStringMapItem.productAttributeValueID
        ) {
          resultMap[productSKUID].linkString = linkStringMapItem.linkString;
          break;
        }
      }
    }

    const resultArray = Object.values(resultMap);
    return resultArray;
  } catch (error) {
    console.log(error);
    throw "Error in processSkus";
  }
}

module.exports = router;
