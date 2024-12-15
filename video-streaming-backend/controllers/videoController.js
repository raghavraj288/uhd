const multer = require('multer');
const Video = require('../models/videoModel');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const storage = multer.memoryStorage();
const upload = multer({ storage }).single('video');

const streamVideo = async (req, res) => {
    try {
        const { id } = req.params;

        // Log the headers to debug the request
        console.log('Request Headers:', req.headers);

        // Find the video metadata in MongoDB
        const video = await Video.findById(id);
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        const { s3Key } = video;
        const range = req.headers.range;

        if (!range) {
            return res.status(416).json({ message: 'Requires Range header' });
        }

        // Get the size of the file from S3
        const headParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: s3Key,
        };
        const headData = await s3.headObject(headParams).promise();
        const fileSize = headData.ContentLength;

        // Parse the range header
        const CHUNK_SIZE = 10 ** 6; // 1MB
        const rangeMatch = range.match(/bytes=(\d+)-(\d*)/);

        if (!rangeMatch) {
            return res.status(416).json({ message: 'Invalid Range header' });
        }

        let start = parseInt(rangeMatch[1], 10);
        let end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : Math.min(start + CHUNK_SIZE - 1, fileSize - 1);

        // Ensure the end byte is not out of bounds
        end = Math.min(end, fileSize - 1);

        // Set headers for partial content
        const contentLength = end - start + 1;
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': contentLength,
            'Content-Type': 'video/mp4',
        });

        // Stream the requested chunk from S3
        const streamParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: s3Key,
            Range: `bytes=${start}-${end}`,
        };
        const stream = s3.getObject(streamParams).createReadStream();
        stream.pipe(res);
    } catch (error) {
        console.error('Error streaming video:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

const uploadVideo = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error('Error uploading video:', err);
            return res.status(500).json({ message: 'Error uploading video' });
        }

        const { title } = req.body;

        if (!req.file || !title) {
            return res.status(400).json({ message: 'Title and video file are required' });
        }

        try {
            const s3Params = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `videos/${Date.now()}_${req.file.originalname}`,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            };

            const s3Response = await s3.upload(s3Params).promise();

            const newVideo = new Video({
                title,
                s3Key: s3Params.Key,
            });
            const savedVideo = await newVideo.save();

            res.status(201).json({
                message: 'Video uploaded successfully',
                video: {
                    id: savedVideo._id,
                    title: savedVideo.title,
                    s3Key: savedVideo.s3Key,
                    s3Url: s3Response.Location,
                },
            });
        } catch (error) {
            console.error('Error saving video:', error);
            res.status(500).json({ message: 'Error saving video to S3 or database' });
        }
    });
};

const searchVideos = async (req, res) => {
    try {
        const { title } = req.query;

        if (!title) {
            return res.status(400).json({ message: 'Title query parameter is required' });
        }

        const videos = await Video.find({ 
            title: { $regex: title, $options: 'i' }
        });

        if (videos.length === 0) {
            return res.status(404).json({ message: 'No videos found' });
        }

        res.status(200).json(videos);
    } catch (error) {
        console.error('Error searching videos:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { streamVideo, uploadVideo, searchVideos };
