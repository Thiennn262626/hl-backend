const ContentBasedRecommender = require("./ContentBasedRecommender");
const RedisService = require("../services/redis.service");
const { sql } = require("../config");

async function getProductToTraining() {
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
      WHERE enable = 1
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

async function TrainingContendBaseGetByProduct(id) {
  try {
    resultArray = await getProductToTraining();

    const recommender = new ContentBasedRecommender();
    recommender.train(resultArray);
    const relatedProducts = recommender.getSimilarDocuments(id, 0, 50);
    var key = "recommendation-content-based-" + id;
    //save to redis
    console.log("save to redis", key);
    await RedisService.setJson(key, relatedProducts);
    return relatedProducts;
  } catch (err) {
    console.log(err);
  }
}

async function TrainingContendBase() {
  try {
    resultArray = await getProductToTraining();
    const recommender = new ContentBasedRecommender();
    recommender.train(resultArray);
    for (let i = 0; i < resultArray.length; i++) {
      const relatedProducts = recommender.getSimilarDocuments(
        resultArray[i].id,
        0,
        50
      );
      var key = "recommendation-content-based-" + resultArray[i].id;
      console.log("save to redis", key);
      await RedisService.setJson(key, relatedProducts);
    }
    return true;
  } catch (err) {
    console.log(err);
  }
}

async function runAtInterval() {
  try {
    console.log("start Recommendation", new Date().toISOString());
    await TrainingContendBase();
    console.log("Recommendation updated", new Date().toISOString());
  } catch (error) {
    console.error("Error getting recommendation:", error);
  }
}

function scheduleInterval() {
  setTimeout(() => {
    console.log("start runAtInterval", new Date().toISOString());
    runAtInterval();
    setInterval(runAtInterval, 30 * 60 * 1000);
  }, 3000);
}

module.exports = {
  scheduleInterval,
  TrainingContendBaseGetByProduct,
  TrainingContendBase,
};
