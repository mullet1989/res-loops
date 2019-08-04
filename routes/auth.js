const express = require("express");
const router = express.Router();

const { RedisClient, StravaClient } = require("../database");

router.get("/", async (req, res, next) => {
  const stravaClient = new StravaClient();
  const authResponse = await stravaClient.authenticate(req.query.code);

  const {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    athlete,
  } = {
    ...authResponse,
  };

  const { id } = { ...athlete };

  const redisClient = new RedisClient();

  try {
    await redisClient.addAthlete(authResponse);

    if (authResponse) {
      console.log(JSON.stringify(athlete));
      res.redirect("/leaderboard/63951472299");
    } else {
      console.log(e);
      res.redirect("/error");
    }
  } catch (e) {
  } finally {
    redisClient.close();
  }
});

module.exports = router;
