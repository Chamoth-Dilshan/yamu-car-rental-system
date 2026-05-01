const path = require('path');

const modulesToLoad = [
  '../src/app',
  '../src/modules/users/user.model',
  '../src/modules/vehicles/vehicle.model',
  '../src/modules/drivers/driverAd.model',
  '../src/modules/reservations/booking.model',
  '../src/middleware/auth.middleware',
  '../src/middleware/upload.middleware',
  '../src/middleware/error.middleware',
  '../src/middleware/validate.middleware',
  '../src/utils/roleHelpers',
  '../src/utils/notificationHelpers',
  '../src/utils/reservationHelpers',
  '../src/modules/auth/auth.controller',
  '../src/modules/users/user.controller',
  '../src/modules/admin/admin.controller',
  '../src/modules/vehicles/vehicle.controller',
  '../src/modules/drivers/driverAd.controller',
  '../src/modules/reservations/booking.controller',
  '../src/modules/payments/payment.constants',
  '../src/modules/payments/payment.model',
  '../src/modules/payments/paymentMethod.model',
  '../src/modules/payments/payment.controller',
  '../src/modules/payments/payment.service',
  '../src/modules/payments/payment.validation',
  '../src/modules/admin/adminBooking.controller',
  '../src/modules/auth/auth.routes',
  '../src/modules/users/user.routes',
  '../src/modules/admin/admin.routes',
  '../src/modules/vehicles/vehicle.routes',
  '../src/modules/drivers/driverAd.routes',
  '../src/modules/reservations/booking.routes',
  '../src/modules/payments/payment.routes',
  '../src/modules/reviews/review.routes',
  '../src/modules/maintenance/maintenance.routes',
  '../src/modules/promotions/promotion.routes'
];

modulesToLoad.forEach((modulePath) => {
  require(path.resolve(__dirname, modulePath));
});

console.log('Server build check passed');
