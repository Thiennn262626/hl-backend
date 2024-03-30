const sql = require("mssql");
require("dotenv").config();
const { name_database_01 } = require("./configs/dbs.info");
const config = name_database_01.config;
const pool = new sql.ConnectionPool(config);
const connection = pool
  .connect()
  .then(() => {
    console.log("Đã kết nối với cơ sở dữ liệu SQL Server trên Azure...");
  })
  .catch((err) => {
    console.error("Lỗi kết nối: " + err.stack);
  });

module.exports = pool;
