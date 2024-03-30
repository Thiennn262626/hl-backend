// "use trict";
// const sql = require("mssql");

// const { name_database_01 } = require("../configs/dbs.info");

// const config = name_database_01.config;
// const pool = new sql.ConnectionPool(config);
// const connection = pool
//   .connect()
//   .then(() => {
//     console.log("Đã kết nối với cơ sở dữ liệu SQL Server trên Azure...2");
//   })
//   .catch((err) => {
//     console.error("Lỗi kết nối: " + err.stack);
//   });

// module.exports = pool;

// "use strict";

// const mysql = require("mssql");
// // const mysql = require('mysql');
// const { name_database_01 } = require("../configs/dbs.info");

// class DatabaseService {
//   constructor() {
//     this.pools = {};
//   }

//   createPool(databaseName, config) {
//     this.pools[databaseName] = mysql.createPool(config);
//   }

//   getPool(databaseName) {
//     const pool = this.pools[databaseName];
//     if (!pool) {
//       throw new Error(`Pool for '${databaseName}' is not defined.`);
//     }

//     return pool;
//   }
// }

// module.exports = new DatabaseService();
