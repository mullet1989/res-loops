const { RedisClient } = require("../database");
const moment = require("moment");

var assert = require("assert");

describe("RedisClient", function() {
  let _client;

  // shared redis client
  before(function() {
    _client = new RedisClient();
  });

  after(function() {
    _client.close();
  });

  describe("addSegmentEffort", function() {
    after(function() {
      _client.deleteKey(`segment_${-1}_athlete_${-1}`, response => {});
    });

    it("should get something from the database", function() {
      const time = moment("2019-01-01").toDate();
      _client.addSegmentEffort(-1, -1, time, response => {
        assert.strictEqual(response, 1);
      });
    });
  });

  describe("getSegmentEffortsForAthleteSegmentByDateRange", function() {
    const time = moment("2019-01-01");
    before(function() {
      _client.addSegmentEffort(-1, -1, time, response => {});
    });

    after(function() {
      _client.deleteKey(`segment_${-1}_athlete_${-1}`, response => {});
    });

    it("should get something from the database", async function() {
      const values = await _client.getSegmentEffortsForAthleteSegmentByDateRange(
        -1,
        -1
      );
      assert.deepStrictEqual(values, [time.toISOString()]);
    });
  });

  describe("addAthlete", function() {
    it("should add an athlete to the collection or create the collection when not exists", function() {
      _client.addAthlete(-1, response => {
        assert.strictEqual(response, 1); // should add to this collection
      });
    });
  });

  describe("AllAthletes", function() {
    before(function() {
      _client.addAthlete(-1, response => {
        _client.addAthlete(-2);
      });
    });

    after(function() {
      _client.deleteKey("athletes_");
    });

    it("should get two athletes from the key", async function() {
      const allAthletes = await _client.AllAthletes;
      assert.strictEqual(allAthletes.length, 2); // we should get -1 and -2 from here
    });
  });

  describe("getSegmentEffortsForAthleteSegmentByDateRange", async function() {
    const segmentIds = [-2, -1];
    const segmentEffortTimes = [
      moment("2019-01-01").toDate(),
      moment("2019-01-03").toDate(),
    ];

    before(function() {
      for (let s of segmentIds) {
        for (let se of segmentEffortTimes) {
          _client.addSegmentEffort(-1, s, se);
        }
      }
    });

    after(function() {
      for (let se of segmentIds) {
        const key = `segment_${se}_athlete_${-1}`;
        _client.deleteKey(key, function() {});
      }
    });

    it("should get all the segments effort by athlete and segement id", async function() {
      const start = new Date(0);
      const end = new Date("2019-01-03");
      const promises = segmentIds.map(x =>
        _client.getSegmentEffortsForAthleteSegmentByDateRange(-1, x, start, end)
      );
      const results = await Promise.all(promises);
      console.log(results);
    });
  });
});
