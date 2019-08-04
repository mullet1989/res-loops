const express = require("express");
const router = express.Router();
const { RedisClient } = require("../database");
const { SegmentIds } = require("./webhook");

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
    // make lookup for athletes
    const athleteMap = new Map();
    for (let a of allAthletes) {
      athleteMap.set(a.id, { firstName: a.firstname, lastName: a.lastname });
    }

    const allAthleteSegmentEfforts = await Promise.all(
      allAthleteIds.map(x =>
        redisClient.getSegmentEffortsForAthleteSegmentByDateRange(x, segmentId)
      )
    );

    let result = [];
    for (let effort of allAthleteSegmentEfforts) {
      const athleteInfo = athleteMap.get(effort.athleteId);
      result.push({ ...athleteInfo, ...effort });
    }

    result.sort((a, b) => {
      if (a.efforts.length < b.efforts.length) {
        return 1;
      }

      return -1;
    });

    res.render("leaderboard.hbs", {
      segment: { name: SegmentIds[segmentId], id: segmentId },
      athletes: result,
    });
  } catch (e) {
    console.log(e);
    res.redirect("/error");
  } finally {
    redisClient.close();
  }
});

module.exports = router;
