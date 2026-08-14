/******************************************************************************
Project Name: GMDSoft Admin and Customer Portal 

File Name: server.js
Description: Entry point of the application. This file initializes the Express  
             server, loads middleware, sets up routes, and starts the server

Author: Samartha Info solution pvt ltd 
Created On: Oct 21 2024
Last Modified: Aug 22 2025

Copyright (c) 2025 GMDSoft. All rights reserved.
******************************************************************************/

//Core Node.js module (if needed)
const path = require('path');

//Third-party libraries
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const routes = require('./routes/routes');
const app = express();
// Routes
app.use('/api/phonepe', routes);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
