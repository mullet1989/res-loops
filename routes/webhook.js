const express = require("express");
const router = express.Router(); // new router for webhooks
const axios = require("axios");
const fetchActivity = require("../utils").fetchActivity;

const subscriptionUrl = "https://api.strava.com/api/v3/push_subscriptions";
const clientId = 563;
const clientSecret = process.env.CLIENT_SECRET || "";

// GET subscriptions
axios
  .get(`${subscriptionUrl}?client_id=${clientId}&client_secret=${clientSecret}`)
  .then(res => {
    // DELETE subscriptions
    // todo : get subscription id
    axios
      .delete(subscriptionUrl, {
        id: "",
        client_id: clientId,
        client_secret: clientSecret
      })
      .then(res => {
        // POST subscription
        axios
          .post(subscriptionUrl, {
            client_id: clientId,
            client_secret: clientSecret,
            callback_url: `${process.env.NGROK}/webhook`, //ngrok url in here for local development
            verify_token: process.env.VERIFY_TOKEN || ""
          })
          .then(res => {
            console.log(res.response);
          });
      })
      .catch(res => console.log(res));
  })
  .catch(res => console.log(res.status));

/**
 *
 */
router.get("/", function(req, res, next) {
  // Your verify token. Should be a random string.
  const verifyToken = process.env.VERIFY_TOKEN;
  const VERIFY_TOKEN = verifyToken;
  // Parses the query params
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Verifies that the mode and token sent are valid
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.json({ "hub.challenge": challenge });
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

router.post("/", async (req, res, next) => {
  console.log("webhook event received!", req.query, req.body);

  const data = req.body;
  const {
    object_type: objectType,
    object_id: objectId,
    aspect_type: aspectType,
    updates,
    owner_id: athleteId,
    subscription_id: subscriptionId,
    event_time: eventTime
  } = { ...data };

  let stravaResponse;
  switch (aspectType) {
    case "create":
      // todo : do something in here
      const { data: activity } =
        (await fetchActivity(objectId, athleteId)) || "something is not right";
      for (let segment of activity["segment_efforts"]) {
        if (segmentIds.has(segment.id)) {
          // increment the counter
          if (segment.id in leaderboard) {
            let currentCount = leaderboard[segment.id][activity.athlete.id];
            leaderboard[segment.id][activity.athlete.id] = currentCount + 1;
          } else {
            leaderboard[segment.id] = {};
            leaderboard[segment.id][activity.athlete.id] = 1;
          }
        }
      }
      res.sendStatus(200); // acknowledge
      break;
    default:
      console.log("only processing create");
      break;
  }
});

const segmentIds = new Set([63951472299]);

const leaderboard = {};

module.exports = router;
module.exports.leaderboard = leaderboard;
