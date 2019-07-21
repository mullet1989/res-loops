var express = require("express");
var router = express.Router();
const leaderboard = require("./webhook").leaderboard;

/* GET home page. */
router.get("/", function(req, res, next) {
  res.render("index", {
    title: "Express",
    redirect_uri: `${process.env.NGROK}/auth`
  });
});

router.get("/leaderboard", function(req, res, next) {
  res.render("leaderboard", {
    leaderboard: JSON.stringify(leaderboard)
  });
});

module.exports = router;
