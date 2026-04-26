const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    getArchivedEvents,
    archiveEvent,
    restoreEvent,
    requestParticipation,
    getMyRequests,
    getEventRequests,
    approveRequest,
    rejectRequest
} = require("../controllers/eventControllers");

router.post("/", auth, createEvent);

router.get("/", auth, getEvents);

router.get("/archived", auth, getArchivedEvents);
router.get("/my-requests", auth, getMyRequests);

// Participation Routes
router.post("/:id/request-participation", auth, requestParticipation);
router.get("/:id/requests", auth, getEventRequests);
router.put("/requests/:id/approve", auth, approveRequest);
router.put("/requests/:id/reject", auth, rejectRequest);

router.get("/:id", auth, getEventById);

router.put("/:id", auth, updateEvent);

router.put("/:id/archive", auth, archiveEvent);

router.put("/:id/restore", auth, restoreEvent);

router.delete("/:id", auth, deleteEvent);

module.exports = router;