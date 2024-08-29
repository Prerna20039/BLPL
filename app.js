// hola 
const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const User = require('./models/User');
const HODTRF = require('./models/HODTRF');
const Client = require('./models/Client');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
require('dotenv').config();


const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Middleware for parsing request body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up session
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Change this to a secure random value
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.COOKIE_SECURE || false } // Set to true if using HTTPS
}));

// Use the user router
app.use('/api/users', userRoutes);

app.use((req, res, next) => {
    res.alert = function (data) {
        this.json({ alert: data.message, ...data });
    };
    next();
});

// Render home page
app.get('/', (req, res) => {
    res.render('index');
});
app.get('/login', (req, res) => {
    res.render('login');
});
app.get('/tools', (req, res) => {
    res.render('tools');
});
app.get('/services', (req, res) => {
    res.render('services');
});
app.get('/about', (req, res) => {
    res.render('about'); 
});
app.get('/contant', (req, res) => {
    res.render('contant');
});
app.get('/info', (req, res) => {
    res.render('info');
});
app.get('/policy', (req, res) => {
    res.render('policy');
});
app.get('/hodDashboard', (req, res) => {
    res.render('hodDashboard');
});


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('MongoDB connected');

        // Check if the admin user already exists
        const existingAdmin = await User.findOne({ userId: 'admin' });
        if (!existingAdmin) {
            // Create admin user if not exists
            const adminUser = new User({
                userId: 'admin',
                name: 'Admin',
                role: 'admin',
                department: 'Administration',
                password: '123', // Store the password as plain text (not recommended for production)
            });
 
            await adminUser.save();
            console.log('Admin user created');

        } else {
            console.log('Admin user already exists');
        }
    })
    .catch(err => console.log('MongoDB connection error:', err));


// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});




// Login route
app.post('/api/login', async (req, res) => {
    const { userId, password } = req.body;
    const user = await User.findOne({ userId });

    if (user && user.password === password) {
        req.session.user = {
            _id: user._id,
            userId: user.userId,
            role: user.role,
            name: user.name
        };

        // Redirect based on role
        switch (user.role) {
            case 'admin':
                return res.redirect('/admin/dashboard');
            case 'hod':
                return res.redirect('/hod/dashboard');
            default:
                res.status(401).send('Invalid role');
        }
    } else {
        res.status(401).send('Invalid credentials');
    }
});



// HOD dashboard route
io.on('connection', (socket) => {
    socket.on('disconnect', () => {
    });
});

// app.get('/admin/dashboard', async (req, res) => {
//     if (req.session.user && req.session.user.role === 'admin') {
//         let query = {};

//         // Check for startDate and endDate in request query parameters
//         const { startDate, endDate } = req.query;

//         if (startDate && endDate) {
//             query.dateOfRequest = {
//                 $gte: new Date(startDate),
//                 $lte: new Date(endDate)
//             };
//         } else {
//             const today = new Date();
//             today.setHours(0, 0, 0, 0);
//             const tomorrow = new Date(today);
//             tomorrow.setDate(today.getDate() + 1);

//             query.dateOfRequest = {
//                 $gte: today,
//                 $lt: tomorrow
//             };
//         }

//         try {
//             const hodtrfs = await HODTRF.find(query);
//             const clients = await Client.find(query);

//             res.render('adminDashboard', {
//                 user: req.session.user,
//                 clients,
//                 hodtrfs,
//                 formCount: hodtrfs.length,
//                 clientCount: Client.length
//             });
//         } catch (error) {
//             res.render('adminDashboard', {
//                 user: req.session.user,
//                 clients:[],
//                 hodtrfs: [],
//                 formCount: 0,
//                 clientCount: 0
//             });
//         }
//     } else {
//         res.redirect('/');
//     }
// });

// Endpoint to update the decision of a form by ID
app.post('/api/HOD/TRF/:id/decision', async (req, res) => {
    const { id } = req.params;
    const { decision } = req.body;

    try {
        const updatedForm = await HODTRF.findByIdAndUpdate(id, { decision: decision }, { new: true });
        res.json({ message: 'Form decision updated successfully', form: updatedForm });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/admin/decision/:id', async (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        try {
            const { decision } = req.body;
            await HODTRF.findByIdAndUpdate(req.params.id, { decision, status: decision });
            res.redirect('/admin/dashboard');
        } catch (error) {
            res.redirect('/admin/dashboard');
        }
    } else {
        res.redirect('/');
    }
});

// Handle form submission and save to database
app.post('/api/HOD/ADMIN/TRF', async (req, res) => {
    try {
        const HODTOADMIN = new HODTRF(req.body); // Use HODTRF model
        await HODTOADMIN.save(); // Save to HODTRF collection
        res.status(201).send('TRF Req Send'); // Success message
    } catch (err) {
        res.status(500).send('Server error'); // Error message
    }
});

app.get('/hod/TRF_ADMIN', async (req, res) => {
    if (req.session.user && req.session.user.role === 'hod') {
        res.render('hod_trf', {
            user: req.session.user,
        });
    } else {
        res.redirect('/');
    }
});

app.post('/add', async (req, res) => {
    const { userId, name, role, department, password, hodId } = req.body;

    console.log('Received hodId:', hodId); // Debug line to check hodId format

    // Validate required fields
    if (!userId || !name || !role || !department || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // Convert hodId to ObjectId if role is 'employee'
    let hodIdObj = null;
    if (role === 'employee' && hodId) {
        try {
            hodIdObj = mongoose.Types.ObjectId(hodId);
        } catch (err) {
            return res.status(400).json({ message: 'Invalid HOD ID format' });
        }
    }

    const user = new User({
        userId,
        name,
        role,
        department,
        password, // Store password as is (not recommended for production)
        hodId: role === 'employee' ? hodIdObj : null // Set hodId if role is 'employee'
    });

    try {
        await user.save();
        res.redirect('/api/users/list'); // Redirect on successful save
    } catch (err) {
        res.status(400).json({ message: 'Error creating user', error: err });
    }
});

app.post('/api/users/add', async (req, res) => {
    const { userId, name, role, department, password, hodId } = req.body;

    // Validate required fields
    if (!userId || !name || !role || !department || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate and convert hodId if role is 'employee'
    let validatedHodId = null;
    if (role === 'employee') {
        if (hodId) {
            if (mongoose.isValidObjectId(hodId)) {
                validatedHodId = new mongoose.Types.ObjectId(hodId); // Use 'new' keyword
            } else {
                return res.status(400).json({ message: 'Invalid HOD ID format' });
            }
        } else {
            return res.status(400).json({ message: 'HOD ID is required for employee role' });
        }
    }

    const user = new User({
        userId,
        name,
        role,
        department,
        password, // Store password as is (not recommended for production)
        hodId: role === 'employee' ? validatedHodId : null // Set hodId if role is 'employee'
    });

    try {
        await user.save();
        res.redirect('/api/users/list'); // Redirect on successful save
    } catch (err) {
        res.status(400).json({ message: 'Error creating user', error: err });
    }
});
// Example Express route to get HODs
app.get('/api/hods', async (req, res) => {
    try {
        const hods = await User.find({ role: 'hod' }, 'userId name'); // Adjust query as needed
        res.json(hods);
    } catch (error) {
        console.error('Error fetching HODs:', error);
        res.status(500).json({ message: 'Error fetching HODs' });
    }
});


app.get('/createUser', async (req, res) => {
    try {
        const hods = await User.find({ role: 'hod' }).select('userId name _id'); // Ensure proper fields are selected
        res.render('createUser', { hods });
    } catch (err) {
        console.error('Error fetching HODs:', err);
        res.status(500).send('Server Error');
    }
});


app.get('/api/users/list', async (req, res) => {
    try {
        const users = await User.find().populate('hodId');
        const hods = await User.find({ role: 'hod' });
        const adminCount = await User.countDocuments({ role: 'admin' });
        const hodCount = await User.countDocuments({ role: 'hod' });
        const driverCount = await User.countDocuments({ role: 'driver' });
        const employeeCount = await User.countDocuments({ role: 'employee' });
        const DhodCount = await User.countDocuments({ role: 'Dhod' });

        res.render('userList', {
            users,
            adminCount,
            hodCount,
            driverCount,
            employeeCount,
            hods // Ensure hods is passed to the template
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});


app.get('/hod/dashboard', async (req, res) => {
    if (req.session.user && req.session.user.role === 'hod') {
        const { startDate, endDate } = req.query;
        let hodId = req.session.user._id;

        try {
            if (!mongoose.Types.ObjectId.isValid(hodId)) {
                return res.status(400).send('Invalid HOD ID');
            }

            hodId = new mongoose.Types.ObjectId(hodId);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            const dateFilter = startDate && endDate ? {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            } : {
                $gte: today,
                $lt: tomorrow
            };

            const queryReceived = {
                status: 'pending',
                hodId: hodId,
                dateOfRequest: dateFilter
            };

            const querySent = {
                dateOfRequest: dateFilter
            };

            const hodtrf = await HODTRF.find(querySent);

            console.log('Sent Forms:', hodtrf);
            console.log('HOD ID:', hodId);
            console.log('Date Filter:', dateFilter);


            res.render('hodDashboard', {
                user: req.session.user,
                hodtrf,
                sentCount: hodtrf.length,
            });
        } catch (error) {
            console.error('Error:', error.message);
            res.render('hodDashboard', {
                user: req.session.user,
                hodtrf: [],
                sentCount: 0,
            });
        }
    } else {
        res.redirect('/');
    }
});


app.post('/clients', async (req, res) => {
    try {
        const client = new Client(req.body);
        await client.save();
        res.status(201).json(client);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


app.get('/admin/dashboard', async (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        let query = {};
        const { startDate, endDate } = req.query;

        if (startDate && endDate) {
            query.dateOfRequest = {
                $gte: new Date(new Date(startDate).toISOString()), // Ensure the date is in UTC
                $lte: new Date(new Date(endDate).toISOString())
            };
        } else {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0); // Use UTC
            const tomorrow = new Date(today);
            tomorrow.setUTCDate(today.getUTCDate() + 1);

            query.dateOfRequest = {
                $gte: today,
                $lt: tomorrow
            };
        }

        console.log('Client Query:', query); // Debugging line

        try {
            const hodtrfs = await HODTRF.find(query);
            const clients = await Client.find(query);

            console.log('Fetched Clients:', clients); // Debugging line

            res.render('adminDashboard', {
                user: req.session.user,
                clients,
                hodtrfs,
                formCount: hodtrfs.length,
                clientCount: clients.length // Ensure this is set to the length of `clients`
            });
        } catch (error) {
            console.error('Error fetching data:', error); // Debugging line
            res.render('adminDashboard', {
                user: req.session.user,
                clients: [],
                hodtrfs: [],
                formCount: 0,
                clientCount: 0
            });
        }
    } else {
        res.redirect('/');
    }
});
