

const express = require('express');
const { streamVideo, uploadVideo, searchVideos } = require('../controllers/videoController');
const router = express.Router();

// Video streaming route
router.get('/:id', streamVideo);

// Video upload route
router.post('/upload', uploadVideo);

//search video
router.get('/search', searchVideos);

module.exports = router;

