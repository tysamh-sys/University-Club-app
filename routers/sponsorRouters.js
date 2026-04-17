const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const {
    createSponsor,
    getSponsors,
    updateSponsor,
    deleteSponsor
} = require("../controllers/sponsorControllers");

router.post("/", auth, createSponsor);

router.get("/", auth, getSponsors);

router.put("/:id", auth, updateSponsor);

router.delete("/:id", auth, deleteSponsor);

module.exports = router;