import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Enhanced security headers for iframe communication
const CSP_DIRECTIVES = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "blob:", "*.tile.openstreetmap.org"],
    connectSrc: ["'self'", "*.tile.openstreetmap.org"],
    frameSrc: ["'self'", "https://www.openstreetmap.org"],
    childSrc: ["'self'", "https://www.openstreetmap.org"],
    frameAncestors: ["'self'"],
    workerSrc: ["'self'", "blob:"],
    manifestSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"]
};

// API rate limiting configuration
const API_LIMIT = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
};

// Initialize API router with enhanced middleware
const apiRouter = express.Router();

// Add compression for all routes
app.use(compression());

// API middleware
apiRouter.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});

apiRouter.use(rateLimit(API_LIMIT));

// Updated CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
    optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '10mb' }));

// Enhanced helmet configuration
app.use(helmet({
    contentSecurityPolicy: {
        directives: CSP_DIRECTIVES
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Improved MongoDB connection with retry strategy
async function connectDB(retries = 5) {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mrmap', {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 50
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        if (retries > 0) {
            console.log(`Retrying connection... (${retries} attempts remaining)`);
            setTimeout(() => connectDB(retries - 1), 5000);
        } else {
            console.error('Failed to connect to MongoDB after multiple attempts');
            process.exit(1);
        }
    }
}

// Enhanced schema definitions with timestamps and validation
const locationSchema = new mongoose.Schema({
    locationId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    gridKey: {
        x: { type: Number, required: true },
        y: { type: Number, required: true }
    },
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true,
            validate: {
                validator: function(v) {
                    return v.length === 2 && 
                           v[0] >= -85.0 && v[0] <= -82.0 && // longitude
                           v[1] >= 8.0 && v[1] <= 11.0;      // latitude
                },
                message: 'Coordinates must be within Costa Rica bounds'
            }
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
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true }
});

// Optimized indexes
locationSchema.index({ 'geometry': '2dsphere' });
locationSchema.index({ 'gridKey.x': 1, 'gridKey.y': 1 });
locationSchema.index({ updatedAt: -1 });

// Improved validation middleware
const validateLocation = (req, res, next) => {
    const { zones } = req.body;
    
    if (!Array.isArray(zones)) {
        return res.status(400).json({ error: 'Zones must be an array' });
    }

    // Batch validation
    const errors = zones.reduce((acc, zone, index) => {
        if (!zone.locationId || !zone.geometry || !zone.safetyLevel) {
            acc.push(`Zone at index ${index} is missing required fields`);
        } else if (!['green', 'yellow', 'red'].includes(zone.safetyLevel)) {
            acc.push(`Zone at index ${index} has invalid safety level`);
        }
        return acc;
    }, []);

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }
    next();
};

// Optimized API Routes with proper error handling
apiRouter.post('/locations', validateLocation, async (req, res) => {
    try {
        const { zones } = req.body;
        const operations = zones.map(zone => ({
            updateOne: {
                filter: { locationId: zone.locationId },
                update: { $set: zone },
                upsert: true
            }
        }));

        const result = await Location.bulkWrite(operations);
        res.status(201).json({
            message: 'Locations updated successfully',
            modified: result.modifiedCount,
            upserted: result.upsertedCount
        });
    } catch (error) {
        if (error.code === 11000) {
            res.status(409).json({ error: 'Duplicate locations detected' });
        } else {
            console.error('Error saving locations:', error);
            res.status(500).json({ error: 'Failed to save locations' });
        }
    }
});

// Optimized location fetching with spatial queries
apiRouter.get('/locations', async (req, res) => {
    try {
        const { bounds, limit = 1000 } = req.query;
        
        let query = {};
        if (bounds) {
            const [west, south, east, north] = bounds.split(',').map(Number);
            query['geometry'] = {
                $geoWithin: {
                    $box: [
                        [west, south],
                        [east, north]
                    ]
                }
            };
        }

        const locations = await Location.find(query)
            .limit(Number(limit))
            .lean()
            .select('-__v')
            .exec();

        // Add cache control headers
        res.set('Cache-Control', 'public, max-age=60'); // Cache for 1 minute
        res.json(locations);
    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});

// Mount routes and start server
app.use('/api', apiRouter);

// Static file serving with improved caching
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1h',
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
        // Add cache control headers for static files
        res.setHeader('Cache-Control', 'public, max-age=3600');
    }
}));

// Error handling middleware with more detailed errors in development
app.use((err, req, res, next) => {
    console.error(err);
    const response = {
        error: 'Something went wrong!',
        ...(process.env.NODE_ENV === 'development' && {
            details: err.message,
            stack: err.stack
        })
    };
    res.status(err.status || 500).json(response);
});

// Start server with enhanced error handling
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}).on('error', (error) => {
    console.error('Server failed to start:', error);
    process.exit(1);
});

// Enhanced shutdown handling
async function shutdown(server) {
    console.log('Initiating graceful shutdown...');
    try {
        await new Promise((resolve, reject) => {
            server.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        await mongoose.connection.close(false); // false = don't force close
        console.log('Graceful shutdown completed');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
}

process.on('SIGTERM', () => shutdown(server));
process.on('SIGINT', () => shutdown(server));

export default app;