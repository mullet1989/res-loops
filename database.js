const redis = require("redis"),
  client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: 6379
  });

client.on("error", e => {
  console.log(e);
});

client.on("ready", () => {
  console.log("connected");
});

module.exports = client;
