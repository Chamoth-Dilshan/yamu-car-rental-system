const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  ROLE_KEYS,
  ROLE_STATUSES,
  VERIFICATION_STATUSES,
  ACCOUNT_STATUSES,
  PROVIDER_ROLE_KEYS,
  APPLICATION_STATUSES
} = require('../../utils/roleHelpers');
const { DOCUMENT_STATUSES, SUPPORTED_LANGUAGES } = require('../../utils/profileHelpers');

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

const notificationSchema = new mongoose.Schema({
  type: { type: String, default: 'system' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const documentMetadataSchema = new mongoose.Schema({
  fileName: { type: String, default: '' },
  filePath: { type: String, default: '' },
  reference: { type: String, default: '' },
  status: { type: String, enum: DOCUMENT_STATUSES, default: 'not_uploaded' },
  rejectionReason: { type: String, default: '' },
  uploadedAt: { type: Date, default: null },
  reviewedAt: { type: Date, default: null }
}, { _id: false });

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  relationship: { type: String, default: '' }
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
  preferredLanguage: {
    type: String,
    enum: SUPPORTED_LANGUAGES,
    default: 'English'
  },
  emergencyContact: {
    type: emergencyContactSchema,
    default: () => ({})
  },
  profilePic: { type: String, default: 'avatar.png' },
  accountStatus: {
    type: String,
    enum: ACCOUNT_STATUSES,
    default: 'active'
  },
  isSystemAdmin: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: VERIFICATION_STATUSES,
    default: 'verified'
  },
  roles: [roleAssignmentSchema],
  driverProfile: {
    drivingLicenseNumber: { type: String, default: '' },
    licenseExpiryDate: { type: Date, default: null },
    nicId: { type: String, default: '' },
    serviceArea: { type: String, default: '' },
    providerDetails: { type: String, default: '' },
    documents: {
      nicDocument: {
        type: documentMetadataSchema,
        default: () => ({})
      },
      drivingLicenseDocument: {
        type: documentMetadataSchema,
        default: () => ({})
      },
      proofOfAddressDocument: {
        type: documentMetadataSchema,
        default: () => ({})
      }
    }
  },
  staffProfile: {
    storeName: { type: String, default: '' },
    storeOwner: { type: String, default: '' },
    businessRegistrationNumber: { type: String, default: '' },
    storeAddress: { type: String, default: '' },
    storeContactNumber: { type: String, default: '' },
    storeEmail: { type: String, default: '' },
    documents: {
      businessRegistrationDocument: {
        type: documentMetadataSchema,
        default: () => ({})
      },
      proofOfAddressDocument: {
        type: documentMetadataSchema,
        default: () => ({})
      }
    }
  },
  adminProfile: {
    accessScope: { type: String, default: '' },
    controlNotes: { type: String, default: '' }
  },
  providerApplications: [providerApplicationSchema],
  notifications: [notificationSchema],
  lastLoginAt: { type: Date, default: null },
  deactivatedAt: { type: Date, default: null }
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
