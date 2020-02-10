module.exports = {
  connections: {
    adapter: "mysql",
    database: "panda_test",
    host: "rm-3ns74i0qn45u458jt.mysql.rds.aliyuncs.com",
    user: "panda_BBGS_t",
    password: "B4MDsyLHmzFxrpwhN9cw",
    port: 3306
  },
  cache: {
    prefix: "cache:",
    ttl: 7200,
    adapter: "redis",
    host: "r-3nsfce6e05da13f4.redis.rds.aliyuncs.com",
    password: "9BFEdDGkDs",
    port: 6379,
    db: 6
  },
  athens: 'http://athens.oriental-game.com:8001/',
  gameCode: {
    baccarat: 1,
    dragontiger: 2,
    moneywheel: 4
  }
}
