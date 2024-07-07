const { sql } = require("../../config");
// const RedisService = require("../../services/redis.service");

async function getIDlisthot() {
  try {
    const attentions = await getListAttention(-10);
    const subscribes = await getListSubscribe(-10);

    // Lấy top 50 từ mỗi danh sách
    const topAttentions = attentions.slice(0, 50);
    const topSubscribes = subscribes.slice(0, 50);

    // Tạo một map để lưu thông tin sản phẩm với trọng số
    const productMap = new Map();

    // Xử lý danh sách attentions
    topAttentions.forEach((item) => {
      productMap.set(item.product_id, {
        product_id: item.product_id,
        totalAttention: item.totalAttention,
        totalSubcribe: 0,
      });
    });

    // Xử lý danh sách subscribes với trọng số 5
    topSubscribes.forEach((item) => {
      if (productMap.has(item.product_id)) {
        productMap.get(item.product_id).totalSubcribe = item.totalSubcribe * 5;
      } else {
        productMap.set(item.product_id, {
          product_id: item.product_id,
          totalAttention: 0,
          totalSubcribe: item.totalSubcribe * 5,
        });
      }
    });

    // Kết hợp các giá trị và tính tổng với trọng số
    const combinedList = Array.from(productMap.values()).map((item) => ({
      product_id: item.product_id,
      total: item.totalAttention + item.totalSubcribe,
    }));

    // Sắp xếp danh sách kết hợp dựa trên tổng số
    combinedList.sort((a, b) => b.total - a.total);
    // Trả về danh sách các product_id
    return combinedList.map((item) => item.product_id);
  } catch (error) {
    throw error;
  }
}

async function getListAttention(day) {
  try {
    const query = `
    SELECT 
    a.product_id,
    COUNT(*) AS totalAttention
    FROM Attention AS a
    JOIN Product AS p ON p.id = a.product_id
    WHERE a.createdDate >= DATEADD(day, @day, GETDATE()) AND p.enable = 1
    GROUP BY a.product_id
    ORDER BY totalAttention DESC;
    `;
    const result = await new sql.Request()
      .input("day", parseInt(day))
      .query(query);
    return result.recordset;
  } catch (error) {
    throw "Error get list attention";
  }
}

async function getListSubscribe(day) {
  try {
    const query = `
    SELECT 
    s.idProduct AS product_id,
    COUNT(*) AS totalSubcribe
    FROM Subcribe AS s
    JOIN Product AS p ON p.id = s.idProduct
    WHERE s.createdDate >= DATEADD(day, @day, GETDATE()) AND p.enable = 1
    GROUP BY s.idProduct
    ORDER BY totalSubcribe DESC;
    `;
    const result = await new sql.Request()
      .input("day", parseInt(day))
      .query(query);
    return result.recordset;
  } catch (error) {
    throw "Error get list subcribe";
  }
}

async function getIDlistgoodprice() {
  try {
    const query = `
    SELECT 
    p.id AS product_id,
    AVG(ps.price) AS avg_price
    FROM Product AS p
    JOIN ProductSku AS ps ON p.id = ps.idProduct
    WHERE p.enable = 1
    GROUP BY p.id
    ORDER BY avg_price ASC;
    `;
    const result = await new sql.Request().query(query);
    const top120 = result.recordset.slice(0, 120);
    shuffleArray(top120);
    return top120.map((item) => item.product_id);
  } catch (error) {
    throw error;
  }
}
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function getIDlistnew() {
  try {
    const query = `
    SELECT 
    p.id AS product_id
    FROM Product AS p
    WHERE p.enable = 1
    ORDER BY p.createdDate DESC
    `;
    const result = await new sql.Request().query(query);
    const top120 = result.recordset.slice(0, 120);
    shuffleArray(top120);
    return top120.map((item) => item.product_id);
  } catch (error) {
    throw error;
  }
}

async function getIDlistbestseller() {
  try {
    const query = `
    SELECT 
    oi.product_id,
    SUM(oi.quantity) AS total_sold
    FROM Order_item AS oi
    JOIN [Order] AS o ON o.id = oi.orderId
    JOIN Product AS p ON p.id = oi.product_id
    WHERE o.createdDate >= DATEADD(day, @day, GETDATE()) AND p.enable = 1
    GROUP BY oi.product_id
    ORDER BY total_sold DESC;
    `;
    const result = await new sql.Request().input("day", -30).query(query);
    const top100 = result.recordset.slice(0, 100);
    shuffleArray(top100);
    return top100.map((item) => item.product_id);
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getIDlisthot,
  getIDlistgoodprice,
  getIDlistnew,
  getIDlistbestseller,
};
