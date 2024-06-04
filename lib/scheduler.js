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
    console.log("start getProductToTraining", new Date().toISOString());
    let resultArray = await RedisService.getJson("getProductToTraining");
    if (!resultArray) {
      resultArray = await getProductToTraining();
      await RedisService.setJson("getProductToTraining", resultArray);
      await RedisService.expire("getProductToTraining", 60 * 60);
    }
    console.log("start training", new Date().toISOString());
    const recommender = new ContentBasedRecommender();
    recommender.train(resultArray);
    console.log("end training", new Date().toISOString());
    const relatedProducts = recommender.getSimilarDocuments(id, 0, 50);
    var key = "recommendation-content-based-" + id;
    //save to redis
    console.log("save to redis", key);
    await RedisService.setJson(key, relatedProducts);
    await RedisService.expire(key, 60 * 60);
    return relatedProducts;
  } catch (err) {
    console.log(err);
  }
}

async function TrainingContendBase() {
  try {
    console.log("start getProductToTraining", new Date().toISOString());
    let resultArray = await RedisService.getJson("getProductToTraining");
    if (!resultArray) {
      resultArray = await getProductToTraining();
      await RedisService.setJson("getProductToTraining", resultArray);
      await RedisService.expire("getProductToTraining", 60 * 60);
    }
    console.log("start training", new Date().toISOString());
    const recommender = new ContentBasedRecommender();
    recommender.train(resultArray);
    console.log("end training", new Date().toISOString());
    for (let i = 0; i < resultArray.length; i++) {
      const relatedProducts = recommender.getSimilarDocuments(
        resultArray[i].id,
        0,
        50
      );
      var key = "recommendation-content-based-" + resultArray[i].id;
      //check key is valid
      // let checkKey = await RedisService.getJson(key);
      // if (checkKey) {
      //   continue;
      // }
      //save to redis
      console.log("save to redis", key);
      await RedisService.setJson(key, relatedProducts);
      await RedisService.expire(key, 60 * 60);
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
  }, 300000);
}

module.exports = {
  scheduleInterval,
  TrainingContendBaseGetByProduct,
};
