const path = require('path');

const modulesToLoad = [
  '../models/User',
  '../middleware/auth',
  '../middleware/upload',
  '../utils/roleHelpers',
  '../controllers/authController',
  '../controllers/userController',
  '../controllers/adminController',
  '../routes/auth',
  '../routes/users',
  '../routes/admin'
];

modulesToLoad.forEach((modulePath) => {
  require(path.resolve(__dirname, modulePath));
});

console.log('Server build check passed');
