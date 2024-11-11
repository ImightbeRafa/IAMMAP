import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// API routes should be handled before static files
const apiRouter = express.Router();

// Middleware specifically for API routes
apiRouter.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

// Rate limiting for API
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
apiRouter.use(limiter);

// Basic middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Helmet security configuration
if (process.env.NODE_ENV === 'development') {
    app.use(
        helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false,
            crossOriginResourcePolicy: { policy: "cross-origin" }
        })
    );
} else {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "'unsafe-eval'",
                    "unpkg.com",
                    "cdnjs.cloudflare.com"
                ],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "unpkg.com",
                    "cdnjs.cloudflare.com"
                ],
                imgSrc: [
                    "'self'",
                    "data:",
                    "blob:",
                    "*.tile.openstreetmap.org",
                    "cdnjs.cloudflare.com",
                    "unpkg.com"
                ],
                connectSrc: [
                    "'self'",
                    "*.tile.openstreetmap.org",
                    "nominatim.openstreetmap.org"
                ],
                fontSrc: [
                    "'self'", 
                    "data:", 
                    "cdnjs.cloudflare.com"
                ],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
                workerSrc: ["'self'", "blob:"],
                childSrc: ["'self'", "blob:"],
                manifestSrc: ["'self'"]
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }));
}

// MongoDB connection with enhanced error handling
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mrmap');
        console.log('MongoDB connected successfully');
        console.log('Connection string:', process.env.MONGODB_URI || 'mongodb://localhost:27017/mrmap');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        // Retry connection after 5 seconds
        setTimeout(connectDB, 5000);
    }
}
connectDB();

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.once('open', () => {
    console.log('MongoDB connected successfully');
});

// Schema definitions
const locationSchema = new mongoose.Schema({
    locationId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    geometry: {
        type: {
            type: String,
            enum: ['Polygon', 'Point', 'LineString'],
            required: true
        },
        coordinates: {
            type: Array,
            required: true
        }
    },
    safetyLevel: {
        type: String,
        enum: ['green', 'yellow', 'red'],
        required: true
    },
    safetyMessage: {
        type: String,
        trim: true,
        maxLength: 500
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
    locationId: {
        type: String,
        required: true,
        index: true
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxLength: 1000
    },
    author: {
        type: String,
        default: 'Anonymous',
        trim: true,
        maxLength: 50
    },
    timestamp: { type: Date, default: Date.now }
});

locationSchema.index({ 'geometry': '2dsphere' });
commentSchema.index({ timestamp: -1 });

const Location = mongoose.model('Location', locationSchema);
const Comment = mongoose.model('Comment', commentSchema);

// Validation middleware
const validateLocation = (req, res, next) => {
    const { locationId, geometry, safetyLevel } = req.body;
    if (!locationId || !geometry || !safetyLevel) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!['green', 'yellow', 'red'].includes(safetyLevel)) {
        return res.status(400).json({ error: 'Invalid safety level' });
    }
    next();
};

const validateComment = (req, res, next) => {
    const { text } = req.body;
    if (!text?.trim()) {
        return res.status(400).json({ error: 'Comment text is required' });
    }
    if (text.length > 1000) {
        return res.status(400).json({ error: 'Comment is too long' });
    }
    next();
};

// API Routes
apiRouter.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

apiRouter.post('/locations', validateLocation, async (req, res) => {
    try {
        const location = new Location(req.body);
        await location.save();
        res.status(201).json(location);
    } catch (error) {
        if (error.code === 11000) {
            res.status(409).json({ error: 'Location already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

apiRouter.get('/locations', async (req, res) => {
    try {
        const locations = await Location.find().lean();
        res.json(locations || []);
    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});

apiRouter.patch('/locations/:locationId', validateLocation, async (req, res) => {
    try {
        const location = await Location.findOneAndUpdate(
            { locationId: req.params.locationId },
            { ...req.body, updatedAt: Date.now() },
            { new: true }
        );
        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }
        res.json(location);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

apiRouter.delete('/locations/:locationId', async (req, res) => {
    try {
        const location = await Location.findOneAndDelete({ locationId: req.params.locationId });
        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }
        await Comment.deleteMany({ locationId: req.params.locationId });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

apiRouter.post('/locations/:locationId/comments', validateComment, async (req, res) => {
    try {
        const locationExists = await Location.exists({ locationId: req.params.locationId });
        if (!locationExists) {
            return res.status(404).json({ error: 'Location not found' });
        }

        const comment = new Comment({
            locationId: req.params.locationId,
            ...req.body
        });
        await comment.save();
        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

apiRouter.get('/locations/:locationId/comments', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const comments = await Comment.find({ locationId: req.params.locationId })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        const total = await Comment.countDocuments({ locationId: req.params.locationId });

        res.json({
            comments,
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mount API router
app.use('/api', apiRouter);

// Static files served after API routes
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    const response = {
        error: 'Something went wrong!',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
    };
    res.status(500).json(response);
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => shutdown(server));
process.on('SIGINT', () => shutdown(server));

async function shutdown(server) {
    console.log('Received shutdown signal');
    try {
        await new Promise((resolve) => {
            server.close(resolve);
        });
        await mongoose.connection.close();
        console.log('Server and MongoDB connections closed');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
}

export default app;