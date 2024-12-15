// const express = require('express');
// const dotenv = require('dotenv');
// const connectDB = require('./config/db');
// const videoRoutes = require('./routes/videoRoutes');

// dotenv.config();
// const app = express();
// connectDB();

// app.use('/videos', videoRoutes);

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const videoRoutes = require('./routes/videoRoutes');
const path = require('path');

dotenv.config();
const app = express();
connectDB();

app.get('/video-page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/videoPage.html'));
});

app.use('/videos', videoRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
