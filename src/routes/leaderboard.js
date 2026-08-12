const express = require('express');
const router = express.Router();
const db = require('../store');

router.get('/leaderboard', (req, res) => {
  const entries = db.get('leaderboard').value();
    const counts = {};

      entries.forEach((entry) => {
          counts[entry.attendeeAddress] = (counts[entry.attendeeAddress] || 0) + 1;
            });

              const ranked = Object.entries(counts)
                  .map(([attendeeAddress, eventsAttended]) => ({ attendeeAddress, eventsAttended }))
                      .sort((a, b) => b.eventsAttended - a.eventsAttended);

                        res.json(ranked);
                        });

                        module.exports = router;