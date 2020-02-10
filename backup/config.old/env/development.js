module.exports = {
  connections: {
    adapter: 'mysql',
    host: 'localhost',
    port: '3306',
    user: 'root', // optional
    password: '', // optional
    database: 'panda_dev', //optional
  },
  cache: {
    prefix: "cache:",
    ttl: 7200,
    adapter: "redis",
    host: "localhost",
    password: "",
    port: 6379,
    db: 6
  },
  athens: 'http://localhost:8002/',
  gameCode: {
    baccarat: 1,
    dragontiger: 2,
    moneywheel: 4
  }
}
