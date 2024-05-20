const { sql } = require("../../config");

const express = require("express");
const router = express.Router();
const RedisService = require("../../services/redis.service");

const ContentBasedRecommender = require("../../lib/ContentBasedRecommender");

async function getProduct() {
  try {
    const query = `
      SELECT
      id,
      name,
      slogan,
      description,
      notes,
      madeIn,
      uses,
      objectsOfUse,
      preserve,
      instructionsForUse
      FROM Product
    `;
    const result = await sql.query(query);
    const updatedRecordset = result.recordset.map((record) => {
      const updatedRecord = { ...record };
      if (updatedRecord.uses === "productUses") {
        updatedRecord.uses = "";
      }
      if (updatedRecord.notes === "productNotes") {
        updatedRecord.notes = "";
      }
      if (updatedRecord.objectsOfUse === "productObjectsOfUse") {
        updatedRecord.objectsOfUse = "";
      }
      if (updatedRecord.preserve === "productPreserve") {
        updatedRecord.preserve = "";
      }
      if (updatedRecord.instructionsForUse === "productInstructionsForUse") {
        updatedRecord.instructionsForUse = "";
      }
      return updatedRecord;
    });
    return updatedRecordset.map((product) => ({
      id: product.id,
      content: `${product.name} ${product.description} ${product.madeIn} ${product.uses} ${product.objectsOfUse} ${product.preserve} ${product.instructionsForUse}`,
    }));
  } catch (err) {
    console.log(err);
  }
}

router.get("/test", async (req, res) => {
  try {
    const products = await getProduct();

    const recommender = new ContentBasedRecommender();

    recommender.train(products);
    let result = [];
    for (let product of products) {
      const relatedProducts = recommender.getSimilarDocuments(
        product.id,
        0,
        50
      );
      const tags = recommender._getTokensFromString(product.content);
      result.push({
        content: product.id,
        relatedProducts: relatedProducts,
        tags: tags,
      });
    }
    res.status(200).json({ message: "success", data: result });
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
