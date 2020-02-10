module.exports = {
  connections: {
    adapter: 'mysql',
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
  },
  cache: {
    prefix: "cache:",
    ttl: 7200,
    adapter: "redis",
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
    port: process.env.REDIS_PORT,
    db: 19
  },
  athens: process.env.ATHENS_URL,
  gameCode: {
    baccarat: 1,
    dragontiger: 2,
    moneywheel: 3,
    roulette: 4
  }
}
