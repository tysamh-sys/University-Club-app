const express = require("express");
const router = express.Router();

const { architectAgent, liaisonAgent, ingestExcel, archivistAgent, getHistoricalEvents } = require("../controllers/aiController");
const adminAuth = require("../middlewares/adminAuth"); // Restricting AI usage to admins 

router.post("/architect", adminAuth, architectAgent);

router.post("/liaison", adminAuth, liaisonAgent);

router.post("/ingest-excel", adminAuth, ingestExcel);

router.get("/historical-events", getHistoricalEvents);

// Temporary security bypass for debugging connection
router.post("/archivist", archivistAgent); 

module.exports = router;