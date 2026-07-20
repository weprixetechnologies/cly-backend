const mysql = require('mysql2')

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'rseditz@222',
    database: 'cly',
    timezone: '+05:30'
})

// const pool = mysql.createPool({
//     host: '127.0.0.1',
//     user: 'adminuser',
//     password: 'Vishal@13241',
//     database: 'clydb',
//     timezone: '+05:30'
// })


module.exports = pool.promise();