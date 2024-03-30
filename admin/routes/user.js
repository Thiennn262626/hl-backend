const express = require("express");
const router = express.Router();
require("dotenv").config();
const axios = require("axios");

module.exports = router;

const checkAuth = require("../../middleware/check_auth");
const checkRoleAdmin = require("../../middleware/check_role_admin");

const database = require("../../config");
router.get(
  "/get-profile",
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const queryUser = "SELECT * FROM [User] WHERE id_account = @idAccount";
      const userResult = await database
        .request()
        .input("idAccount", request.userData.uuid)
        .query(queryUser);

      const queryAccount = "SELECT * FROM Account WHERE id = @idAccount";
      const resultAccount = await database
        .request()
        .input("idAccount", request.userData.uuid)
        .query(queryAccount);

      const queryEmail =
        "SELECT id AS emailID, emailAddress, emailLabel, isDefault, isVerify FROM Email WHERE idUser = @idUser";
      const resultEmail = await database
        .request()
        .input("idUser", userResult.recordset[0].id)
        .query(queryEmail);

      const queryPhone =
        "SELECT id AS phoneID, phoneNo, extendNumber, phoneLabel, phoneArea, countryArea, isDefault, isVerify FROM Phone WHERE idUser = @idUser";
      const resultPhone = await database
        .request()
        .input("idUser", userResult.recordset[0].id)
        .query(queryPhone);

      const responseData = {
        userID: request.userData.uuid,
        userLoginID: resultAccount.recordset[0].userLogin,
        contactFullName: userResult.recordset[0].contactFullName,
        slogan: userResult.recordset[0].slogan,
        gender: userResult.recordset[0].gender,
        pID: userResult.recordset[0].pID,
        createdDate: userResult.recordset[0].createdDate,
        accountType: resultAccount.recordset[0].role,
        accountStatus: resultAccount.recordset[0].isVerify,
        userType: resultAccount.recordset[0].role,
        emails: resultEmail.recordset,
        phones: resultPhone.recordset,
        urls: [
          {
            urlID: "1010a4e3-2b79-4cf6-9e7a-716cdacc464f",
            urlString: "google.com",
            isDefault: 0,
          },
          {
            urlID: "61441d2c-aa96-4790-b139-0eee81b8cf31",
            urlString: "haha",
            isDefault: 0,
          },
        ],
        userAvatar: userResult.recordset[0].userAvatar,
        userCover: userResult.recordset[0].userCover,
      };

      response.status(200).json(responseData);
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

const { insertProduct1 } = require("./product");
const e = require("express");

router.post("/import-file", async (request, response) => {
  try {
    const jsonDataitem = request.body.data.item;
    const jsonDataImage = request.body.data.product_images.images;
    const jsonDataAttributes = jsonDataitem.tier_variations;
    const jsonDataProductSKUs = jsonDataitem.models;
    const productMoreInfo = jsonDataitem.attributes;

    var productMadeIn = "";
    if (productMoreInfo != null) {
      productMoreInfo.forEach((element) => {
        if (element.name == "Xuất xứ") {
          productMadeIn = element.value;
        }
      });
    }

    attributes = [];
    productSKUs = [];
    avatarMediaIDS = [];
    var i = 0;
    jsonDataAttributes.forEach((element) => {
      const attribute = {
        locAttributeName: element.name,
        attributeValue: [],
      };
      var index = 0;
      element.options.forEach(async (value) => {
        if (i == 0) {
          const link =
            "https://down-vn.img.susercontent.com/file/" + jsonDataitem.image;
          if (element.images != null) {
            const link =
              "https://down-vn.img.susercontent.com/file/" +
              element.images[index];
          }
          const id = await insertMedia(link);
          attribute.attributeValue.push({
            locAttributeValueName: value,
            mediaID: id,
          });
        } else {
          attribute.attributeValue.push({
            locAttributeValueName: value,
          });
        }

        index++;
      });
      i++;
      attributes.push(attribute);
    });
    jsonDataProductSKUs.forEach((element) => {
      const productSKU = {
        totalStock: Math.floor(Math.random() * 1500) + 50,
        price: element.price / 100000,
        priceBefore: element.price_before_discount / 100000,
        sold: element.sold,
      };
      productSKUs.push(productSKU);
    });

    for (const element of jsonDataImage) {
      const link = "https://down-vn.img.susercontent.com/file/" + element;
      const id = await insertMedia(link);
      avatarMediaIDS.push({
        mediaID: id,
      });
    }
    var productDescription = jsonDataitem.description.replace(
      /(?:\r\n|\r|\n)/g,
      ". "
    );
    if (productDescription.length > 4000) {
      productDescription = productDescription.substring(0, 4000);
    }
    result = {
      productName: jsonDataitem.title,
      productSlogan: jsonDataitem.title,
      productDescription: productDescription,
      productNotes: "productNotes",
      productMadeIn: productMadeIn ? productMadeIn : "Viet Nam",
      productUses: "productUses",
      productIngredient: "productIngredient",
      productObjectsOfUse: "productObjectsOfUse",
      productPreserve: "productPreserve",
      productInstructionsForUse: "productInstructionsForUse",
      productHeight: 10,
      productWidth: 15,
      productLength: 15,
      productWeight: 350,
      productCategoryID: "CD080CF9-803F-4046-BD75-4DFD1E6DBB4A",
      avatarMediaIDS: avatarMediaIDS,
      attributes: attributes,
      productSKUs: productSKUs,
      item_id: jsonDataitem.item_id,
    };
    const result0 = await insertProduct1(result);
    response.status(201).json({ result0: result0, title: jsonDataitem.title });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: error,
    });
  }
});

async function insertMedia(data) {
  try {
    console.log(data);
    const query = `
      INSERT INTO Media(linkString ,createdDate)
      OUTPUT inserted.id AS id_media
      SELECT @url AS linkString ,@createdDate AS createdDate
    `;
    const result = await database
      .request()
      .input("url", data)
      .input("createdDate", new Date())
      .query(query);
    console.log(result.recordset[0].id_media);
    return result.recordset[0].id_media;
  } catch (error) {
    console.log(error);
    return null;
  }
}
