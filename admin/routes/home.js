const express = require("express");
const router = express.Router();
const { sql } = require("../../config");
const { DateTime } = require("luxon");

const checkAuth = require("../../middleware/check_auth");
const checkRoleAdmin = require("../../middleware/check_role_admin");

router.get(
  "/get-data-chart-analy-sale",
  checkAuth,
  checkRoleAdmin,
  async (req, res) => {
    try {
      const month = parseInt(req.query.month);
      const year = parseInt(req.query.year);

      const { startDate, endDate, currentDate } = getStartEndDate(month, year);

      console.log("startDate:", startDate.toISO(), "endDate:", endDate.toISO());

      // Check if the end date exceeds the current date
      if (endDate > currentDate) {
        console.log("End date exceeds current date");
        return res.status(200).json([]);
      }

      // Fetch data based on the calculated date range
      const data = await fetchDataInRange(startDate.toISO(), endDate.toISO());

      // For now, return an empty array as a placeholder
      return res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching network data:", error);
      return res.status(500).send("Không thể lấy dữ liệu phân tích bán hàng");
    }
  }
);

// Example function to fetch data within the date range (to be implemented)
async function fetchDataInRange(startDate, endDate) {
  try {
    const query = `
        SELECT
            CONVERT(DATE, o.createdDate) AS orderDate,
            SUM(po.amount) AS totalRevenue,
            SUM(oi.quantity) AS totalItemsSold,
            COUNT(DISTINCT o.id) AS totalOrders
        FROM [Order] AS o
        JOIN Order_item AS oi ON o.id = oi.orderId
        LEFT JOIN Payment_order AS po ON po.orderId = o.id
        WHERE o.createdDate between @startDate AND @endDate
        GROUP BY CONVERT(DATE, o.createdDate)
        ORDER BY orderDate
        `;
    const result = await new sql.Request()
      .input("startDate", startDate)
      .input("endDate", endDate)
      .query(query);
    if (result.recordset.length > 0) {
      const formattedData = result.recordset.reduce((acc, row) => {
        const date = `${row.orderDate.getDate()}/${
          row.orderDate.getMonth() + 1
        }`;
        acc.push({ date, type: "Đơn hàng", value: row.totalOrders });
        acc.push({ date, type: "Sản phẩm", value: row.totalItemsSold });
        acc.push({
          date,
          type: "Doanh thu",
          value: row.totalRevenue / 1000000,
        });
        return acc;
      }, []);
      return formattedData;
    }
    return [];
  } catch (error) {
    throw "Lỗi lấy dữ liệu";
  }
}

router.get(
  "/get-total-analy-sale",
  checkAuth,
  checkRoleAdmin,
  async (req, res) => {
    try {
      const month = parseInt(req.query.month);
      const year = parseInt(req.query.year);

      const { startDate, endDate, currentDate } = getStartEndDate(month, year);

      console.log("startDate:", startDate.toISO(), "endDate:", endDate.toISO());
      // Check if the end date exceeds the current date
      if (endDate > currentDate) {
        console.log("End date exceeds current date");
        return res.status(200).json([]);
      }

      // Fetch data based on the calculated date range
      const data = await getTotal(startDate.toISO(), endDate.toISO());

      // For now, return an empty array as a placeholder
      return res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching network data:", error);
      return res.status(500).send("Không thể lấy dữ liệu phân tích bán hàng");
    }
  }
);

function getStartEndDate(month, year) {
  // Validate month and year
  if (month < 1 || month > 12 || year < 0) {
    throw "Tháng hoặc năm không hợp lệ";
  }
  // Calculate the start date
  let startDate = DateTime.local(year, month, 1).startOf("day");
  // Calculate the end date
  let endDate;
  const currentDate = DateTime.now();
  const isCurrentMonth =
    currentDate.year === year && currentDate.month === month;
  if (isCurrentMonth) {
    endDate = currentDate;
  } else {
    endDate = startDate.plus({ months: 1 }).startOf("day");
  }
  return { startDate, endDate, currentDate };
}

async function getTotal(startDate, endDate) {
  try {
    const query = `
        SELECT
          DATEFROMPARTS(YEAR(o.createdDate), MONTH(o.createdDate), 1) AS orderMonth, -- Lấy tháng của ngày tạo đơn hàng
          SUM(po.amount) AS totalRevenue, -- Tổng doanh thu
          SUM(oi.quantity) AS totalItemsSold, -- Tổng số sản phẩm
          COUNT(DISTINCT o.id) AS totalOrders, -- Số đơn hàng
          COUNT(DISTINCT o.idUser) AS totalCustomers -- Số khách hàng
        FROM [Order] AS o
        JOIN Order_item AS oi ON o.id = oi.orderId
        LEFT JOIN Payment_order AS po ON po.orderId = o.id
        WHERE o.createdDate BETWEEN @startDate AND @endDate
        GROUP BY DATEFROMPARTS(YEAR(o.createdDate), MONTH(o.createdDate), 1) -- Group theo tháng và năm
        ORDER BY orderMonth;
        `;
    const result = await new sql.Request()
      .input("startDate", startDate)
      .input("endDate", endDate)
      .query(query);
    if (result.recordset.length > 0) {
      const formattedData = result.recordset.reduce((acc, row) => {
        acc.push({
          index: 1,
          count: row.totalOrders,
          desc: "Tổng số đơn hàng",
        });
        acc.push({
          index: 2,
          count: row.totalItemsSold,
          desc: "Tổng số sản phẩm",
        });
        acc.push({
          index: 3,
          count: row.totalCustomers,
          desc: "Tổng số khách hàng",
        });
        acc.push({ index: 4, count: row.totalRevenue, desc: "Tổng doanh thu" });
        return acc;
      }, []);
      return formattedData;
    }
    return [];
  } catch (error) {
    throw "Lỗi lấy dữ liệu";
  }
}

module.exports = router;
