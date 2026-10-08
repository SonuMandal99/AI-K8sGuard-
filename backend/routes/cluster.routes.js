const express = require("express");

const {
  getClusterStatus,
  getPods,
  getDeployments,
  getServices,
  getEvents,
  getPodLogs
} = require("../controllers/cluster.controller");

const router = express.Router();

// Get overall Kubernetes cluster status
router.get("/status", getClusterStatus);

// Get Pods
router.get("/pods", getPods);

// Get Deployments
router.get("/deployments", getDeployments);

// Get Services
router.get("/services", getServices);

// Get Kubernetes Events
router.get("/events", getEvents);

// Get Pod logs
router.get("/logs", getPodLogs);

module.exports = router;