const express = require("express");
const router = express.Router();
require("dotenv").config();
const database = require("../../config");

const checkAuth = require("../../middleware/check_auth");
const checkRoleAdmin = require("../../middleware/check_role_admin");
const firebase = require("../../firebase.js");

const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single("file");

router.get("/get-list", async (request, response) => {
  try {
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;

    const query = ` SELECT 
      id AS productCategoryID,
      name AS productCategoryName,
      image AS linkString
      FROM Category
      ORDER BY name
      `;
    const result = await database.request().query(query);
    const resultMap = {};
    result.recordset.forEach((item) => {
      const { productCategoryID, ...rest } = item;
      if (!resultMap[productCategoryID]) {
        resultMap[productCategoryID] = {
          productCategoryID: productCategoryID,
          ...rest,
        };
      }
    });
    const resultArray = Object.values(resultMap);
    // Phân trang
    const paginatedResult = resultArray.slice(offset, offset + limit);
    response.status(200).json({
      result: paginatedResult,
      total: resultArray.length,
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.post(
  "/create-category",
  upload,
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const name = request.body.name;
      var image = "";
      if (!request.file) {
        response.status(400).json({
          message: "Ban chua upload anh",
        });
      } else {
        const blob = firebase.bucket.file(request.file.originalname);
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
              expires: "03-01-2500", // Ngày hết hạn của đường dẫn
            });
            const publicUrl = signedUrls[0];
            image = image + publicUrl;
            const queryCategory =
              "INSERT INTO Category(name, image) VALUES(@name, @image)";
            const categoryResult = await database
              .request()
              .input("name", name)
              .input("image", image)
              .query(queryCategory);

            response.status(200).json({
              name: name,
              image: image,
            });
          } catch (error) {
            console.log(error);
            response.status(500).json({
              error: "Internal Server Error",
            });
          }
        });

        blobWriter.end(request.file.buffer);
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.put(
  "/update-category",
  upload,
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const name = request.body.name;
      const idCategory = request.body.idCategory;
      var image = "";
      if (!request.file) {
        const queryCategory =
          "UPDATE Category SET name = @name WHERE id = @idCategory";
        const categoryResult = await database
          .request()
          .input("name", name)
          .input("idCategory", idCategory)
          .query(queryCategory);

        response.status(200).json({
          message: "Upload thanh cong",
        });
      } else {
        const blob = firebase.bucket.file(request.file.originalname);
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
              expires: "03-01-2500", // Ngày hết hạn của đường dẫn
            });
            const publicUrl = signedUrls[0];
            image = image + publicUrl;
            const queryCategory =
              "UPDATE Category SET name = @name, image = @image WHERE id = @idCategory";
            const categoryResult = await database
              .request()
              .input("name", name)
              .input("image", image)
              .input("idCategory", idCategory)
              .query(queryCategory);

            response.status(200).json({
              message: "Upload thanh cong",
            });
          } catch (error) {
            console.log(error);
            response.status(500).json({
              error: "Internal Server Error",
            });
          }
        });

        blobWriter.end(request.file.buffer);
      }
    } catch {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.get("/get-list", async (request, response) => {
  try {
    var offset = request.query.offset;
    var limit = request.query.limit;

    console.log(typeof page);
    console.log(typeof pageSize);
    if (offset == null || offset < 1) {
      offset = 1;
    }

    if (limit == null) {
      limit = 10;
    }

    offset = (offset - 1) * limit;

    const queryCategory =
      "SELECT * FROM Category ORDER BY name OFFSET @page ROWS FETCH NEXT @pageSize ROWS ONLY";
    const categoryResult = await database
      .request()
      .input("page", parseInt(offset))
      .input("pageSize", parseInt(limit))
      .query(queryCategory);

    const queryTotalCategory = "SELECT COUNT(*) AS TotalRecords FROM category;";
    const ResultTotalCategory = await database
      .request()
      .query(queryTotalCategory);

    var results = [];
    for (var i = 0; i < categoryResult.recordset.length; i++) {
      var result = {
        productCategoryID: categoryResult.recordset[i].id,
        productCategoryName: categoryResult.recordset[i].name,
        linkString: categoryResult.recordset[i].image,
      };

      results.push(result);
    }
    response.status(200).json({
      result: results,
      total: ResultTotalCategory.recordset[0].TotalRecords,
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

module.exports = router;
