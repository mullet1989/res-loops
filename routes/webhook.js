const express = require("express");
const router = express.Router(); // new router for webhooks
const axios = require("axios");
const querystring = require("querystring");

const { RedisClient, StravaClient } = require("../database");
const subscriptionUrl = "https://api.strava.com/api/v3/push_subscriptions";
const clientId = 563;
const clientSecret = process.env.CLIENT_SECRET || "";

// segment_ids
const SegmentIds = {
  853217: "CCW BPN",
  968350: "BPN",
};

const newSubscription = async () => {
  return new Promise((resolve, reject) => {
    const obj = {
      client_id: clientId,
      client_secret: clientSecret,
      callback_url: `${process.env.NGROK}/webhook`, //ngrok url in here for local development;
      verify_token: process.env.VERIFY_TOKEN.toString() || "",
    };

    axios({
      method: "post",
      url: subscriptionUrl,
      data: querystring.stringify(obj),
      config: { headers: { "Content-Type": "x-www-form-urlencoded" } },
    })
      .then(res => resolve({ success: true }))
      .catch(res => {
        console.log(res.message);
        console.log(res);
        reject({ success: false });
      });
  });
};

const deleteSubscription = async id => {
  return new Promise((resolve, reject) => {
    axios
      .delete(
        `${subscriptionUrl}/${id}?client_id=${clientId}&client_secret=${clientSecret}`
      )
      .then(res => {
        console.log("SUBSCRIPTION DELETED");
        resolve(res);
      })
      .catch(res => {
        reject(res);
      });
  });
};

// GET subscriptions
if (process.env.NODE_ENV === "development") {
  axios
    .get(
      `${subscriptionUrl}?client_id=${clientId}&client_secret=${clientSecret}`
    )
    .then(async res => {
      if (res.data.length < 1) {
        const responseBody = await newSubscription();
        console.log(responseBody);
      } else {
        const sub = res.data[0];
        // DELETE subscriptions
        await deleteSubscription(sub.id);
        // POST subscription
        const { success } = { ...(await newSubscription()) };
        if (success) {
          console.log("NEW SUBSCRIPTION CREATED");
        }
      }
    })
    .catch(res => {
      console.log(res);
    });
}

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
  const data = req.body;
  const {
    object_type: objectType,
    object_id: objectId,
    aspect_type: aspectType,
    updates,
    owner_id: athleteId,
    subscription_id: subscriptionId,
    event_time: eventTime,
  } = { ...data };

  updates && console.log(`uodates : ${JSON.stringify(updates)}`);

  if (objectType !== "activity") {
    return; // we don't do anything with "athlete" changes
  }

  const redisClient = new RedisClient();
  const stravaClient = new StravaClient();

  try {
    switch (aspectType) {
      case "create":
        const activityId = objectId;
        const athleteInfo = await redisClient.getAthlete(athleteId);

        if (athleteInfo === null) {
          break;
        }

        const { data: activity } = await stravaClient.getStravaActivity(
          athleteInfo,
          activityId
        );

        for (let effort of activity["segment_efforts"]) {
          const segment = effort.segment;
          if (segment.id in SegmentIds) {
            try {
              redisClient.addSegmentEffort(
                athleteId,
                segment.id,
                effort["start_date_local"],
                response => {
                  console.log(
                    `added segment effort ${
                      segment["name"]
                    } for athlete ${athleteId}`
                  );
                }
              );
            } catch (e) {
              console.log(e.message);
              console.log("cannot add segment effort for athlete");
            }
          }
        }
        break;
      default:
        console.log("only processing create");
        break;
    }
  } catch (e) {
    console.log(e);
  } finally {
    redisClient.close();
  }
  res.sendStatus(200); // acknowledge
});

module.exports = router;
module.exports.SegmentIds = SegmentIds;
