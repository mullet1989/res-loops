const express = require("express");
const router = express.Router();
const { RedisClient } = require("../database");

/* GET home page. */
router.get("/", function(req, res, next) {
  res.render("index", {
    title: "Express",
    redirect_uri: `${process.env.NGROK}/auth`,
  });
});

router.get("/leaderboard/:id", async function(req, res, next) {
  const segmentId = req.params.id;

  const redisClient = new RedisClient();

  try {
    const allAthleteIds = await redisClient.AllAthletes;
    const allAthletes = await Promise.all(
      allAthleteIds.map(x => redisClient.getAthlete(x))
    );

    const allAthleteSegmentEffots = await Promise.all(
      allAthleteIds.map(x =>
        redisClient.getSegmentEffortsForAthleteSegmentByDateRange(x, segmentId)
      )
    );

    res.render("leaderboard", {
      athletes: JSON.stringify(
        allAthletes.map(a => {
          return {
            firstName: a.firstname,
            lastName: a.lastname,
          };
        })
      ),
      segment: segmentId,
      efforts: JSON.stringify(allAthleteSegmentEffots),
    });
  } catch (e) {
    console.log(e);
    res.redirect("/error");
  } finally {
    redisClient.close();
  }
});

module.exports = router;
