const sql = require("mssql");
const config = {
  user: "hl-shop-admin",
  password: "12345678QT#",
  database: "hl-shop-database",
  server: "hl-shop.database.windows.net",
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: true, // for azure
    trustServerCertificate: true, // change to true for local dev / self-signed certs
  },
};

// Tạo kết nối đến cơ sở dữ liệu SQL Server trên Azure

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


