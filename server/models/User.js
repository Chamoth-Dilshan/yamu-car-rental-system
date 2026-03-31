const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  ROLE_KEYS,
  ROLE_STATUSES,
  VERIFICATION_STATUSES,
  ACCOUNT_STATUSES,
  PROVIDER_ROLE_KEYS,
  APPLICATION_STATUSES
} = require('../utils/roleHelpers');

const roleAssignmentSchema = new mongoose.Schema({
  roleKey: { type: String, enum: ROLE_KEYS, required: true },
  roleStatus: { type: String, enum: ROLE_STATUSES, default: 'active' },
  verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: 'verified' },
  isPrimary: { type: Boolean, default: false }
}, { _id: false });

const providerApplicationSchema = new mongoose.Schema({
  roleKey: { type: String, enum: PROVIDER_ROLE_KEYS, required: true },
  status: { type: String, enum: APPLICATION_STATUSES, default: 'pending' },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectionReason: { type: String, default: '' },
  applicationData: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ROLE_KEYS,
    default: 'customer'
  },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  phone: { type: String, default: '' },
  dob: { type: String, default: '' },
  bio: { type: String, default: '' },
  profilePic: { type: String, default: 'avatar.png' },
  accountStatus: {
    type: String,
    enum: ACCOUNT_STATUSES,
    default: 'active'
  },
  verificationStatus: {
    type: String,
    enum: VERIFICATION_STATUSES,
    default: 'verified'
  },
  roles: [roleAssignmentSchema],
  customerProfile: {
    preferences: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  driverProfile: {
    drivingLicenseNumber: { type: String, default: '' },
    licenseExpiryDate: { type: Date },
    nicId: { type: String, default: '' },
    serviceArea: { type: String, default: '' },
    providerDetails: { type: String, default: '' }
  },
  staffProfile: {
    storeName: { type: String, default: '' },
    storeOwner: { type: String, default: '' },
    businessRegistrationNumber: { type: String, default: '' },
    storeAddress: { type: String, default: '' },
      storeContactNumber: { type: String, default: '' },
      storeEmail: { type: String, default: '' }
  },
  adminProfile: {
    accessScope: { type: String, default: '' },
    controlNotes: { type: String, default: '' }
  },
  providerApplications: [providerApplicationSchema],
  lastLoginAt: { type: Date }
}, {
  timestamps: true
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
