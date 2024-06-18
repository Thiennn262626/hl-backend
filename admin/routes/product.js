const express = require("express");
const router = express.Router();
//
const { sql } = require("../../config");

const checkAuth = require("../../middleware/check_auth");
const checkRoleAdmin = require("../../middleware/check_role_admin");

const firebase = require("../../firebase");

const multer = require("multer");
const e = require("express");
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
});

router.post(
  "/create-product",
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    let transaction = new sql.Transaction();
    try {
      const jsonData = request.body;
      const name = jsonData.productName;
      const slogan = jsonData.productSlogan;
      const description = jsonData.productDescription;
      const notes = jsonData.productNotes || "productNotes";
      const madeIn = jsonData.productMadeIn;
      const uses = jsonData.productUses || "productUses";
      const ingredient = jsonData.productIngredient || "productIngredient";
      const objectsOfUse =
        jsonData.productObjectsOfUse || "productObjectsOfUse";
      const preserve = jsonData.productPreserve || "productPreserve";
      const instructionsForUse =
        jsonData.productInstructionsForUse || "productInstructionsForUse";
      const height = jsonData.productHeight;
      const width = jsonData.productWidth;
      const length = jsonData.productLength;
      const weight = jsonData.productWeight;
      const sellQuantity = 0;
      const createdDate = new Date();
      const idCategory = jsonData.productCategoryID;
      const idAccount = request.userData.uuid;
      const attributes = jsonData.attributes;
      const avatarMediaIDS = jsonData.avatarMediaIDS;
      const productSKUs = jsonData.productSKUs;
      await transaction
        .begin()
        .then(async () => {
          const id_product = await insertProduct(
            transaction,
            name,
            slogan,
            description,
            notes,
            madeIn,
            uses,
            ingredient,
            objectsOfUse,
            preserve,
            instructionsForUse,
            height,
            width,
            length,
            weight,
            sellQuantity,
            createdDate,
            idCategory,
            idAccount
          );

          for (let i = 0; i < avatarMediaIDS.length; i++) {
            var isDefault = 0;
            const MediaID = avatarMediaIDS[i];
            if (i === 0) {
              isDefault = 1;
            }
            await insertMedia(
              transaction,
              id_product,
              MediaID.media_url,
              isDefault
            );
          }

          const array_attribute = await insertProductAttributeAndValue(
            transaction,
            attributes,
            id_product
          );
          console.log(array_attribute);
          await processProductSKU(
            transaction,
            productSKUs,
            id_product,
            array_attribute
          );
          // await transaction.commit();
          response.status(200).json({
            status: 200,
            message: "Create product successfully",
            result: {
              productID: id_product,
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
  }
);

// async function insertProduct1(jsonData) {
//   try {
//     let transaction = new sql.Transaction();
//     const item_id = jsonData.item_id;
//     const name = jsonData.productName;
//     const slogan = jsonData.productSlogan;
//     const description = jsonData.productDescription;
//     const notes = jsonData.productNotes;
//     const madeIn = jsonData.productMadeIn;
//     const uses = jsonData.productUses;
//     const ingredient = jsonData.productIngredient;
//     const objectsOfUse = jsonData.productObjectsOfUse;
//     const preserve = jsonData.productPreserve;
//     const instructionsForUse = jsonData.productInstructionsForUse;
//     const height = jsonData.productHeight;
//     const width = jsonData.productWidth;
//     const length = jsonData.productLength;
//     const weight = jsonData.productWeight;
//     const sellQuantity = 0;
//     const createdDate = new Date();
//     const idCategory = jsonData.productCategoryID;
//     const idAccount = "89B43CEB-BA13-48FF-881C-0EF82880F569";
//     const attributes = jsonData.attributes;
//     const avatarMediaIDS = jsonData.avatarMediaIDS;
//     const productSKUs = jsonData.productSKUs;
//     await transaction
//       .begin()
//       .then(async () => {
//         const id_product = await insertProduct(
//           transaction,
//           name,
//           slogan,
//           description,
//           notes,
//           madeIn,
//           uses,
//           ingredient,
//           objectsOfUse,
//           preserve,
//           instructionsForUse,
//           height,
//           width,
//           length,
//           weight,
//           sellQuantity,
//           createdDate,
//           idCategory,
//           idAccount,
//           item_id
//         );

//         for (let i = 0; i < avatarMediaIDS.length; i++) {
//           var isDefault = 0;
//           const MediaID = avatarMediaIDS[i];
//           if (i === 0) {
//             isDefault = 1;
//           }
//           await updateMedia0(
//             transaction,
//             id_product,
//             MediaID.mediaID,
//             isDefault
//           );
//         }

//         const array_attribute = await insertProductAttributeAndValue(
//           transaction,
//           attributes,
//           id_product
//         );
//         await processProductSKU(
//           transaction,
//           productSKUs,
//           id_product,
//           array_attribute
//         );
//         await transaction.commit();
//       })
//       .catch(async (err) => {
//         await transaction.rollback();
//         throw err;
//       });
//     return {
//       status: 200,
//       message: "Create product successfully",
//     };
//   } catch (error) {
//     console.log(error);
//     if (error.code === "EREQUEST") {
//       return "Database error";
//     }
//     if (error.code === "EABORT") {
//       return "Invalid input data";
//     }
//     return error;
//   }
// }

// async function updateMedia0(transaction, id_product, MediaID, isDefault = 0) {
//   try {
//     const query = `
//       UPDATE Media
//       SET id_product = @id_product,
//       isDefault = @isDefault
//       WHERE id = @MediaID
//     `;
//     const result = await transaction
//       .request()
//       .input("id_product", id_product)
//       .input("MediaID", MediaID)
//       .input("isDefault", isDefault)
//       .query(query);
//   } catch (error) {
//     throw "Error update media Product";
//   }
// }

async function insertMedia(
  transaction,
  id_product,
  linkString,
  isDefault = 0,
  title = "",
  description = "",
  productAttributeValueID
) {
  try {
    const query = `
    INSERT INTO Media(id_product, linkString, createdDate, productAttributeValueID, title, description, isDefault)
    VALUES (@id_product, @linkString, @createdDate, @productAttributeValueID, @title, @title, @isDefault);
    `;
    const result = await transaction
      .request()
      .input("id_product", id_product)
      .input("linkString", linkString)
      .input("createdDate", new Date())
      .input("isDefault", isDefault)
      .input("title", title)
      .input("description", description)
      .input("productAttributeValueID", productAttributeValueID)
      .query(query);
  } catch (error) {
    console.log(error);
    throw "Error create media";
  }
}

async function processProductSKU(
  transaction,
  productSKUs,
  id_product,
  array_attribute
) {
  try {
    if (array_attribute.length === 0) {
      await insertProductSKU(
        transaction,
        productSKUs[0],
        id_product,
        null,
        null
      );
    } else {
      if (array_attribute.length === 1) {
        for (
          let i = 0;
          i < array_attribute[0].productAttributeValueIDs.length;
          i++
        ) {
          // const id_product_attribute1 = array_attribute[0].productAttributeID;
          const id_product_attribute_value1 =
            array_attribute[0].productAttributeValueIDs[i];
          await insertProductSKU(
            transaction,
            productSKUs[i],
            id_product,
            id_product_attribute_value1
          );
        }
      } else {
        if (array_attribute.length === 2) {
          for (
            let i = 0;
            i < array_attribute[0].productAttributeValueIDs.length;
            i++
          ) {
            // const id_product_attribute1 = array_attribute[0].productAttributeID;
            const id_product_attribute_value1 =
              array_attribute[0].productAttributeValueIDs[i];
            for (
              let j = 0;
              j < array_attribute[1].productAttributeValueIDs.length;
              j++
            ) {
              // const id_product_attribute2 =
              //   array_attribute[1].productAttributeID;
              const id_product_attribute_value2 =
                array_attribute[1].productAttributeValueIDs[j];
              await insertProductSKU(
                transaction,
                productSKUs[
                  i * array_attribute[1].productAttributeValueIDs.length + j
                ],
                id_product,
                id_product_attribute_value1,
                id_product_attribute_value2
              );
            }
          }
        }
      }
    }
    // duyet qua tung product attribute
  } catch (error) {
    throw error;
  }
}

async function insertProductSKU(
  transaction,
  productSKUs,
  id_product,
  id_product_attribute1,
  id_product_attribute2
) {
  try {
    console.log(productSKUs);
    const query = `
      INSERT INTO ProductSKU(quantity, sold, price, priceBefore, enable, idProduct, idAttributeValue1, idAttributeValue2)
      OUTPUT inserted.id AS id_product_sku 
      SELECT 
        @quantity, @sold, @price, @priceBefore, @enable, @id_product, @id_product_attribute1, @id_product_attribute2
      `;
    const result = await transaction
      .request()
      .input("quantity", Number(productSKUs.totalStock))
      .input("sold", productSKUs.sold ? productSKUs.sold : 0)
      .input("price", Number(productSKUs.price))
      .input("priceBefore", Number(productSKUs.priceBefore))
      .input("enable", true)
      .input("id_product", id_product)
      .input(
        "id_product_attribute1",
        id_product_attribute1 ? id_product_attribute1 : null
      )
      .input(
        "id_product_attribute2",
        id_product_attribute2 ? id_product_attribute2 : null
      )
      .query(query);
    return result.recordset[0].id_product_sku;
  } catch (error) {
    console.log(error);
    throw "Error insert product sku";
  }
}

async function insertProductAttributeAndValue(
  transaction,
  attributes,
  id_product
) {
  try {
    const resultMap = {};
    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i];
      const id_product_attribute = await insertProductAttribute(
        transaction,
        attribute,
        id_product,
        i + 1
      );
      resultMap[id_product_attribute] = {
        productAttributeID: id_product_attribute,
        productAttributeValueIDs: [],
      };

      if (attribute.attributeValue && attribute.attributeValue.length > 0) {
        for (let j = 0; j < attribute.attributeValue.length; j++) {
          const attributeValue = attribute.attributeValue[j];
          const id_product_attribute_value = await insertProductAttributeValue(
            transaction,
            attributeValue,
            id_product_attribute
          );
          resultMap[id_product_attribute].productAttributeValueIDs.push(
            id_product_attribute_value
          );
          if (i === 0) {
            console.log("i = 0", attributeValue.media_url);
            await insertMedia(
              transaction,
              id_product,
              attributeValue.media_url,
              0,
              attributeValue.locAttributeValueName,
              attributeValue.locAttributeValueName,
              id_product_attribute_value
            );
          }
        }
      }
    }
    const resultArray = Object.values(resultMap);
    return resultArray;
  } catch (error) {
    throw "Error insert product attribute and value: ";
  }
}

async function insertProductAttributeValue(
  transaction,
  attributeValue,
  id_product_attribute
) {
  try {
    const query = `
      INSERT INTO ProductAttributeValue(valueName, productAttributeID)
      OUTPUT inserted.id AS id_product_attribute_value
      SELECT 
        @valueName, @id_product_attribute
      `;
    const result = await transaction
      .request()
      .input("valueName", attributeValue.locAttributeValueName)
      .input("id_product_attribute", id_product_attribute)
      .query(query);
    return result.recordset[0].id_product_attribute_value;
  } catch (error) {
    throw "Error insert product attribute value: ";
  }
}

async function insertProductAttribute(
  transaction,
  attribute,
  id_product,
  index
) {
  try {
    const query = `
      INSERT INTO ProductAttribute(name, description, type, id_product)
      OUTPUT inserted.id AS id_product_attribute
      SELECT 
        @name, @description, @type, @id_product
      `;
    const result = await transaction
      .request()
      .input("name", attribute.locAttributeName)
      .input("description", attribute.locAttributeName)
      .input("type", index)
      .input("id_product", id_product)
      .query(query);
    return result.recordset[0].id_product_attribute;
  } catch (error) {
    throw "Error insert product attribute: ";
  }
}

async function insertProduct(
  transaction,
  name,
  slogan,
  description,
  notes,
  madeIn,
  uses,
  ingredient,
  objectsOfUse,
  preserve,
  instructionsForUse,
  height,
  width,
  length,
  weight,
  sellQuantity,
  createdDate,
  idCategory,
  idAccount
) {
  try {
    const query = `
      INSERT INTO Product(name, slogan, description, notes, uses, madeIn, sellQuantity, createdDate, id_Category, id_User, ingredient, objectsOfUse, preserve, instructionsForUse, height, width, length, weight, enable)
      OUTPUT inserted.id AS id_product
      SELECT 
        @name, @slogan, @description, @notes, @uses, @madeIn, @sellQuantity, @createdDate, Category.id, [User].id, @ingredient, @objectsOfUse, @preserve, @instructionsForUse, @height, @width, @length, @weight, 1
      FROM [User], Category
      WHERE [User].id_account = @idAccount AND Category.id = @idCategory `;
    const result = await transaction
      .request()
      .input("name", name)
      .input("slogan", slogan)
      .input("description", description)
      .input("notes", notes)
      .input("uses", uses)
      .input("madeIn", madeIn)
      .input("ingredient", ingredient) //
      .input("objectsOfUse", objectsOfUse)
      .input("preserve", preserve)
      .input("instructionsForUse", instructionsForUse)
      .input("height", Number(height))
      .input("width", Number(width))
      .input("length", Number(length))
      .input("weight", Number(weight)) //
      .input("sellQuantity", Number(sellQuantity))
      .input("createdDate", createdDate)
      .input("idCategory", idCategory)
      .input("idAccount", idAccount)
      .query(query);
    return result.recordset[0].id_product;
  } catch (error) {
    console.log(error);
    throw "Error insert product: ";
  }
}

router.post(
  "/upload-image",
  upload.single("file"),
  checkAuth,
  checkRoleAdmin,
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
          response.status(201).json({
            Message: "Upload successful!",
            url: publicUrl,
          });
        } catch (err) {
          console.log(err);
          response.status(500).json({
            error: err,
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

function processSortBy(sortBy) {
  switch (sortBy) {
    case 0:
      return {
        fist: `WITH PagedProduct AS (
              SELECT p.id AS productID
              FROM Product as p
              ORDER BY p.enable DESC
              OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
              )`,
        end: "ORDER BY p.enable DESC",
      };
    case 1:
      return {
        fist: `WITH PagedProduct AS (
              SELECT p.id AS productID
              FROM Product as p
              ORDER BY p.enable ASC
              OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
              )`,
        end: "ORDER BY p.enable ASC",
      };
    case 2:
      return {
        fist: `WITH PagedProduct AS (
              SELECT DISTINCT productID, price
              FROM (
                  SELECT p.id AS productID, ps.price
                  FROM Product AS p
                  RIGHT JOIN ProductSku AS ps ON p.id = ps.idProduct
                  WHERE ps.price = (
                      SELECT MIN(psk.price)
                      FROM ProductSku AS psk
                      WHERE p.id = psk.idProduct
                  )
              ) AS Subquery
              ORDER BY price ASC
              OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
              )`,
        end: "ORDER BY pp.price",
      };
    case 3:
      return {
        fist: `WITH PagedProduct AS (
              SELECT DISTINCT productID, price
              FROM (
                  SELECT p.id AS productID, ps.price
                  FROM Product AS p
                  RIGHT JOIN ProductSku AS ps ON p.id = ps.idProduct
                  WHERE ps.price = (
                      SELECT MAX(psk.price)
                      FROM ProductSku AS psk
                      WHERE p.id = psk.idProduct
                  )
              ) AS Subquery
              ORDER BY price DESC
              OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
              )`,
        end: "ORDER BY pp.price DESC",
      };
    case 4:
      return {
        fist: `WITH PagedProduct AS (
              SELECT p.id AS productID
              FROM Product as p
              ORDER BY p.name ASC 
              OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
              )`,
        end: "ORDER BY p.name ASC",
      };
    case 5:
      return {
        fist: `WITH PagedProduct AS (
              SELECT p.id AS productID
              FROM Product as p
              ORDER BY p.name DESC 
              OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
              )`,
        end: "ORDER BY p.name DESC",
      };
    case 6:
      return {
        fist: `WITH PagedProduct AS (
              SELECT p.id AS productID
              FROM Product as p
              ORDER BY p.createdDate DESC
              OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
              )`,
        end: "ORDER BY p.createdDate DESC",
      };
    case 7:
      return {
        fist: `WITH PagedProduct AS (
              SELECT p.id AS productID
              FROM Product as p
              ORDER BY p.createdDate ASC
              OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
              )`,
        end: "ORDER BY p.createdDate ASC",
      };
    case 8:
      return {
        fist: `WITH PagedProduct AS (
              SELECT p.id AS productID
              FROM Product as p
              JOIN ProductSku as ps ON p.id = ps.idProduct
              WHERE ps.quantity = (
                                  SELECT MIN(ps.quantity)
                                  FROM ProductSku as ps 
                                  WHERE p.id = ps.idProduct
                                  )
              ORDER BY ps.quantity
              OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
              )`,
        end: "ORDER BY ps.quantity",
      };
    case 9:
      return {
        fist: `WITH PagedProduct AS (
              SELECT p.id AS productID
              FROM Product as p
              JOIN ProductSku as ps ON p.id = ps.idProduct
              WHERE ps.quantity = (
                                  SELECT MAX(ps.quantity)
                                  FROM ProductSku as ps 
                                  WHERE p.id = ps.idProduct
                                  )
              ORDER BY ps.quantity DESC
              OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
              )`,
        end: "ORDER BY ps.quantity DESC",
      };
    default:
      return "";
  }
  //0: dang ban, 1: dang khoa, 2: gia tang dan, 3: gia giam dan,
  //4: ten a-z, 5: ten z-a, 6: moi nhat, 7: cu nhat,
  //8: so luong ton kho tang dan, 9: so luong ton kho giam dan
}

async function getListProduct(offset, limit, sortBy) {
  try {
    let sort = processSortBy(sortBy);
    const queryProduct = `
		 ${sort.fist} 
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
		FROM PagedProduct AS pp
		JOIN Product as p ON p.id = pp.productID
		JOIN ProductSku as ps ON p.id = ps.idProduct
		JOIN Media as m ON p.id = m.id_product
    ${sort.end}
    `;
    const result = await new sql.Request()
      .input("offset", offset)
      .input("limit", limit)
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
          productEnable: item.productEnable,
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

async function getLengthProduct() {
  try {
    const query = `
    SELECT COUNT(p.id) AS total
    FROM Product as p
    `;
    const result = await new sql.Request().query(query);
    return result.recordset[0].total;
  } catch (error) {
    throw error;
  }
}
router.get(
  "/get-all-product",
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      var offset = parseInt(request.query.offset) || 0;
      var limit = parseInt(request.query.limit) || 10;
      var sortBy = parseInt(request.query.sortBy);
      // var search = request.query.search;
      const resultArray = await getListProduct(offset, limit, sortBy);
      const length = await getLengthProduct();
      response.status(200).json({
        result: resultArray,
        total: length,
      });
    } catch (error) {
      console.error(error);
      response.status(500).json({ errorCode: "Internal Server Error" });
    }
  }
);

router.get(
  "/get-product-sku-by-product-id",
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const productID = request.query.productID;
      const skuss = await processSkus(productID);
      response.status(200).json({
        productID: productID,
        productSKU: skuss,
      });
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

async function processSkus(productID) {
  try {
    const query = `
      SELECT 
      ps.id AS productSKUID,
      ps.quantity AS quantity,
      ps.price AS price,
      ps.priceBefore AS priceBefore,
      ps.enable AS SkuEnable,
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
      WHERE idProduct = @productID
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
          linkString: item.linkString,
          price: item.price,
          priceBefore: item.priceBefore,
          quantity: item.quantity,
          SkuEnable: item.SkuEnable,
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
        const { localizedAttributeValueID } = attribute;
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

router.post("/enable-product", checkAuth, checkRoleAdmin, async (req, res) => {
  try {
    const { productID, enable } = req.body;
    console.log(productID, enable);
    if (enable === 0 || enable === 1) {
      const query = `
      UPDATE Product
      SET enable = @enable
      WHERE id = @productID
    `;
      const result = await new sql.Request()
        .input("productID", productID)
        .input("enable", enable)
        .query(query);
      if (enable === 1) {
        res.status(200).json({
          message: "Enable product successfully",
        });
      } else {
        res.status(200).json({
          message: "Disable product successfully",
        });
      }
    } else {
      res.status(500).json({
        message: "Invalid input data",
      });
    }
  } catch (error) {
    console.log(error);
    if (error.code === "EREQUEST") {
      return response.status(500).json({
        error: "Not Exist Product",
      });
    }
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.post("/enable-sku", checkAuth, checkRoleAdmin, async (req, res) => {
  try {
    const { productSKUID, enable } = req.body;
    console.log(productSKUID, enable);
    if (enable === 0 || enable === 1) {
      const query = `
      UPDATE ProductSKU
      SET enable = @enable
      WHERE id = @productSKUID
    `;
      const result = await new sql.Request()
        .input("productSKUID", productSKUID)
        .input("enable", enable)
        .query(query);
      if (enable === 1) {
        res.status(200).json({
          message: "Enable SKU successfully",
        });
      } else {
        res.status(200).json({
          message: "Disable SKU successfully",
        });
      }
    } else {
      res.status(500).json({
        message: "Invalid input data",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.post("/restock-sku", checkAuth, checkRoleAdmin, async (req, res) => {
  try {
    const { productSKUID, totalStock } = req.body;
    console.log(productSKUID, totalStock);
    const query = `
      UPDATE ProductSKU
      SET quantity = @totalStock
      WHERE id = @productSKUID
    `;
    const result = await new sql.Request()
      .input("productSKUID", productSKUID)
      .input("totalStock", totalStock)
      .query(query);
    res.status(200).json({
      message: "Restock SKU successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

module.exports = router;
// module.exports.insertProduct1 = insertProduct1;
