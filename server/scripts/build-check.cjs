const path = require('path');

const modulesToLoad = [
  '../models/User',
  '../models/Vehicle',
  '../models/DriverAd',
  '../models/Booking',
  '../middleware/auth',
  '../middleware/upload',
  '../utils/roleHelpers',
  '../utils/notificationHelpers',
  '../utils/reservationHelpers',
  '../controllers/authController',
  '../controllers/userController',
  '../controllers/adminController',
  '../controllers/vehicleController',
  '../controllers/driverAdController',
  '../controllers/bookingController',
  '../controllers/adminBookingController',
  '../routes/auth',
  '../routes/users',
  '../routes/admin',
  '../routes/vehicles',
  '../routes/driverAds',
  '../routes/bookings'
];

modulesToLoad.forEach((modulePath) => {
  require(path.resolve(__dirname, modulePath));
});

console.log('Server build check passed');
