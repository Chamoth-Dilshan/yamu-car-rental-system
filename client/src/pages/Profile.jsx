import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import API from '../api/axios';
import { buildUploadUrl } from '../api/config';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { formatDateTime } from '../utils/formatters';

const blockedProfileStatuses = ['rejected', 'suspended', 'deactivated'];
const blockedApplicationStatuses = ['suspended', 'deactivated'];

const roleLabel = (value) => value.charAt(0).toUpperCase() + value.slice(1);

export default function Profile() {
  const {
    user,
    refreshMe,
    setUser,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    refreshNotifications
  } = useAuth();
  const [profile, setProfile] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    dob: '',
    bio: '',
    preferredLanguage: 'English',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    currentPassword: '',
    password: ''
  });
  const [customerProfile, setCustomerProfile] = useState({
    preferences: '',
    notes: ''
  });
  const [driverProfile, setDriverProfile] = useState({
    drivingLicenseNumber: '',
    licenseExpiryDate: '',
    nicId: '',
    serviceArea: '',
    providerDetails: '',
    documents: {
      nicDocument: {
        reference: '',
        note: ''
      },
      licenseProof: {
        reference: '',
        note: ''
      }
    }
  });
  const [staffProfile, setStaffProfile] = useState({
    storeName: '',
    storeOwner: '',
    businessRegistrationNumber: '',
    storeAddress: '',
    storeContactNumber: '',
    storeEmail: '',
    documents: {
      businessRegistrationProof: {
        reference: '',
        note: ''
      }
    }
  });
  const [adminProfile, setAdminProfile] = useState({
    accessScope: '',
    controlNotes: ''
  });
  const [profilePic, setProfilePic] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState('');

  const roleMap = useMemo(() => (
    Object.fromEntries((user?.roles || []).map((item) => [item.roleKey, item]))
  ), [user]);

  const applicationMap = useMemo(() => (
    Object.fromEntries((user?.providerApplications || []).map((item) => [item.roleKey, item]))
  ), [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfile({
      fullName: user.fullName || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      dob: user.dob || '',
      bio: user.bio || '',
      preferredLanguage: user.preferredLanguage || 'English',
      emergencyContactName: user.emergencyContact?.name || '',
      emergencyContactPhone: user.emergencyContact?.phone || '',
      emergencyContactRelationship: user.emergencyContact?.relationship || '',
      currentPassword: '',
      password: ''
    });

    setCustomerProfile({
      preferences: user.customerProfile?.preferences || '',
      notes: user.customerProfile?.notes || ''
    });

    setDriverProfile({
      drivingLicenseNumber: user.driverProfile?.drivingLicenseNumber || '',
      licenseExpiryDate: user.driverProfile?.licenseExpiryDate ? String(user.driverProfile.licenseExpiryDate).slice(0, 10) : '',
      nicId: user.driverProfile?.nicId || '',
      serviceArea: user.driverProfile?.serviceArea || '',
      providerDetails: user.driverProfile?.providerDetails || '',
      documents: {
        nicDocument: {
          reference: user.driverProfile?.documents?.nicDocument?.reference || '',
          note: user.driverProfile?.documents?.nicDocument?.note || ''
        },
        licenseProof: {
          reference: user.driverProfile?.documents?.licenseProof?.reference || '',
          note: user.driverProfile?.documents?.licenseProof?.note || ''
        }
      }
    });

    setStaffProfile({
      storeName: user.staffProfile?.storeName || '',
      storeOwner: user.staffProfile?.storeOwner || '',
      businessRegistrationNumber: user.staffProfile?.businessRegistrationNumber || '',
      storeAddress: user.staffProfile?.storeAddress || '',
      storeContactNumber: user.staffProfile?.storeContactNumber || '',
      storeEmail: user.staffProfile?.storeEmail || '',
      documents: {
        businessRegistrationProof: {
          reference: user.staffProfile?.documents?.businessRegistrationProof?.reference || '',
          note: user.staffProfile?.documents?.businessRegistrationProof?.note || ''
        }
      }
    });

    setAdminProfile({
      accessScope: user.adminProfile?.accessScope || '',
      controlNotes: user.adminProfile?.controlNotes || ''
    });
  }, [user]);

  const customerRole = roleMap.customer;
  const driverRole = roleMap.driver;
  const staffRole = roleMap.staff;
  const adminRole = roleMap.admin;
  const driverApplication = applicationMap.driver;
  const staffApplication = applicationMap.staff;

  const saveBasicProfile = async (event) => {
    event.preventDefault();
    setBusyAction('basic');
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      Object.entries(profile).forEach(([key, value]) => {
        if (key === 'password') {
          if (value) {
            formData.append(key, value);
          }
          return;
        }

        if (key === 'currentPassword') {
          if (profile.password && value) {
            formData.append(key, value);
          }
          return;
        }

        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      if (profilePic) {
        formData.append('profilePic', profilePic);
      }

      const res = await API.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser(res.data);
      await refreshMe();
      setProfile((prev) => ({ ...prev, currentPassword: '', password: '' }));
      setProfilePic(null);
      setMessage('Common profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setBusyAction('');
    }
  };

  const saveRoleProfile = async (endpoint, payload, successMessage, actionKey) => {
    setBusyAction(actionKey);
    setMessage('');
    setError('');

    try {
      await API.put(endpoint, payload);
      await refreshMe();
      setMessage(successMessage);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setBusyAction('');
    }
  };

  const submitProviderApplication = async (roleKey, payload) => {
    setBusyAction(`apply-${roleKey}`);
    setMessage('');
    setError('');

    try {
      await API.post(`/users/applications/${roleKey}`, payload);
      await refreshMe();
      await refreshNotifications();
      setMessage(`${roleLabel(roleKey)} application submitted for admin review`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setBusyAction('');
    }
  };

  const avatarSrc = user?.profilePic && user.profilePic !== 'avatar.png'
    ? buildUploadUrl(user.profilePic)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}&background=f0a500&color=0d1b2a&bold=true`;

  const driverProfileBlocked = driverRole && blockedProfileStatuses.includes(driverRole.roleStatus);
  const staffProfileBlocked = staffRole && blockedProfileStatuses.includes(staffRole.roleStatus);
  const driverApplicationBlocked = driverRole && blockedApplicationStatuses.includes(driverRole.roleStatus);
  const staffApplicationBlocked = staffRole && blockedApplicationStatuses.includes(staffRole.roleStatus);
  const profileCompletion = user?.profileCompletion?.percent || 0;

  const updateDriverDocument = (documentKey, field, value) => {
    setDriverProfile((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentKey]: {
          ...prev.documents[documentKey],
          [field]: value
        }
      }
    }));
  };

  const updateStaffDocument = (documentKey, field, value) => {
    setStaffProfile((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentKey]: {
          ...prev.documents[documentKey],
          [field]: value
        }
      }
    }));
  };

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>My Profile</h2>
          <p style={{ color: 'var(--text-light)' }}>Manage your common account details, role-specific profiles, and provider onboarding.</p>
        </div>

        <div className="profile-summary-card">
          <img className="profile-summary-avatar" src={avatarSrc} alt={user?.fullName} />
          <div>
            <h3>{user?.fullName}</h3>
            <p>{user?.email}</p>
            <div className="pill-row" style={{ marginTop: '0.75rem' }}>
              <span className="badge badge-info">Active role: {user?.activeRole}</span>
              <span className="badge badge-success">Primary role: {user?.primaryRole}</span>
              <span className="badge badge-warning">Account: {user?.accountStatus}</span>
              <span className="badge badge-info">Profile complete: {profileCompletion}%</span>
            </div>
          </div>
        </div>

        {(driverApplication?.status === 'pending' || staffApplication?.status === 'pending') && (
          <div className="alert alert-info">
            A provider application is waiting for admin review. Pending roles stay visible for onboarding, but they cannot be used as active roles until approved.
          </div>
        )}

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div id="notifications" className="form-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div>
              <h3>Notifications</h3>
              <p style={{ color: 'var(--text-light)' }}>Track booking updates, admin actions, and role workflow changes from one feed.</p>
            </div>
            <div className="pill-row">
              <span className="badge badge-info">{unreadNotificationCount} unread</span>
              {notifications.length > 0 && (
                <button className="btn btn-outline btn-sm" type="button" onClick={() => markAllNotificationsRead()}>
                  Mark All Read
                </button>
              )}
            </div>
          </div>

          {notifications.length > 0 ? (
            <div className="notification-feed">
              {notifications.map((notification) => (
                <div key={notification._id} className={`notification-card${notification.isRead ? '' : ' unread'}`}>
                  <div className="notification-card-copy">
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <small>{formatDateTime(notification.createdAt)}</small>
                  </div>
                  <div className="notification-card-actions">
                    {!notification.isRead && (
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={() => markNotificationRead(notification._id)}
                      >
                        Mark Read
                      </button>
                    )}
                    {notification.link && (
                      <Link className="btn btn-primary btn-sm" to={notification.link}>
                        Open
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="reservation-empty">No notifications yet. Booking and review actions will appear here.</div>
          )}
        </div>

        <div className="form-card" style={{ marginBottom: '1.5rem' }}>
          <div className="form-header">
            <h2>Common Profile</h2>
            <p style={{ color: 'var(--text-light)' }}>These details belong to your account regardless of the active role.</p>
          </div>
          <form onSubmit={saveBasicProfile}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input value={profile.fullName} onChange={(e) => setProfile((prev) => ({ ...prev, fullName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input value={profile.username} onChange={(e) => setProfile((prev) => ({ ...prev, username: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={profile.email} onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={profile.phone} onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input value={profile.city} onChange={(e) => setProfile((prev) => ({ ...prev, city: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" value={profile.dob} onChange={(e) => setProfile((prev) => ({ ...prev, dob: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Preferred Language</label>
                <select
                  value={profile.preferredLanguage}
                  onChange={(e) => setProfile((prev) => ({ ...prev, preferredLanguage: e.target.value }))}
                >
                  <option value="English">English</option>
                  <option value="Sinhala">Sinhala</option>
                  <option value="Tamil">Tamil</option>
                </select>
              </div>
              <div className="form-group">
                <label>Emergency Contact Name</label>
                <input
                  value={profile.emergencyContactName}
                  onChange={(e) => setProfile((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Address</label>
              <input value={profile.address} onChange={(e) => setProfile((prev) => ({ ...prev, address: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Emergency Contact Phone</label>
                <input
                  value={profile.emergencyContactPhone}
                  onChange={(e) => setProfile((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Relationship</label>
                <input
                  value={profile.emergencyContactRelationship}
                  onChange={(e) => setProfile((prev) => ({ ...prev, emergencyContactRelationship: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Bio</label>
                <textarea rows="3" value={profile.bio} onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" value={profile.currentPassword} onChange={(e) => setProfile((prev) => ({ ...prev, currentPassword: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={profile.password} onChange={(e) => setProfile((prev) => ({ ...prev, password: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Profile Picture</label>
              <input type="file" accept="image/*" onChange={(e) => setProfilePic(e.target.files?.[0] || null)} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busyAction === 'basic'}>
              {busyAction === 'basic' ? 'Saving...' : 'Save Common Profile'}
            </button>
          </form>
        </div>

        {customerRole && (
          <div className="form-card" style={{ marginBottom: '1.5rem' }}>
            <div className="form-header">
              <h2>Customer Profile</h2>
              <p style={{ color: 'var(--text-light)' }}>Customer-specific details stay available for booking-side workflows in the wider Yamu system.</p>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              saveRoleProfile('/users/customer-profile', customerProfile, 'Customer profile updated successfully', 'customer');
            }}
            >
              <div className="form-group">
                <label>Preferences</label>
                <textarea rows="3" value={customerProfile.preferences} onChange={(e) => setCustomerProfile((prev) => ({ ...prev, preferences: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea rows="3" value={customerProfile.notes} onChange={(e) => setCustomerProfile((prev) => ({ ...prev, notes: e.target.value }))} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={busyAction === 'customer'}>
                {busyAction === 'customer' ? 'Saving...' : 'Save Customer Profile'}
              </button>
            </form>
          </div>
        )}

        {(customerRole || driverRole) && (
          <div id="driver-role" className="form-card" style={{ marginBottom: '1.5rem' }}>
            <div className="form-header">
              <h2>Driver Role Onboarding</h2>
              <p style={{ color: 'var(--text-light)' }}>Use this section to maintain the driver profile and submit or re-submit the provider request.</p>
            </div>
            <div className="pill-row" style={{ marginBottom: '1rem' }}>
              <span className="badge badge-info">Role status: {driverRole?.roleStatus || 'not assigned'}</span>
              <span className="badge badge-warning">Verification: {driverRole?.verificationStatus || 'unverified'}</span>
              <span className="badge badge-success">Application: {driverApplication?.status || 'not submitted'}</span>
            </div>
            {driverApplication?.rejectionReason && (
              <div className="alert alert-warning">Admin note: {driverApplication.rejectionReason}</div>
            )}
            {driverProfileBlocked && (
              <div className="alert alert-danger">This role is blocked. Contact an admin before submitting further driver updates.</div>
            )}
            <form onSubmit={(e) => {
              e.preventDefault();
              saveRoleProfile('/users/driver-profile', driverProfile, 'Driver profile updated successfully', 'driver');
            }}
            >
              <div className="form-row">
                <div className="form-group">
                  <label>Driving License Number</label>
                  <input value={driverProfile.drivingLicenseNumber} onChange={(e) => setDriverProfile((prev) => ({ ...prev, drivingLicenseNumber: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>License Expiry Date</label>
                  <input type="date" value={driverProfile.licenseExpiryDate} onChange={(e) => setDriverProfile((prev) => ({ ...prev, licenseExpiryDate: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>NIC / ID</label>
                  <input value={driverProfile.nicId} onChange={(e) => setDriverProfile((prev) => ({ ...prev, nicId: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Service Area</label>
                  <input value={driverProfile.serviceArea} onChange={(e) => setDriverProfile((prev) => ({ ...prev, serviceArea: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Provider Onboarding Details</label>
                <textarea rows="3" value={driverProfile.providerDetails} onChange={(e) => setDriverProfile((prev) => ({ ...prev, providerDetails: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>NIC / ID Document Reference</label>
                  <input
                    value={driverProfile.documents.nicDocument.reference}
                    onChange={(e) => updateDriverDocument('nicDocument', 'reference', e.target.value)}
                    placeholder="Reference or placeholder for future upload"
                  />
                </div>
                <div className="form-group">
                  <label>Driving License Proof Reference</label>
                  <input
                    value={driverProfile.documents.licenseProof.reference}
                    onChange={(e) => updateDriverDocument('licenseProof', 'reference', e.target.value)}
                    placeholder="Reference or placeholder for future upload"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>NIC / ID Review Notes</label>
                  <input
                    value={driverProfile.documents.nicDocument.note}
                    onChange={(e) => updateDriverDocument('nicDocument', 'note', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>License Proof Notes</label>
                  <input
                    value={driverProfile.documents.licenseProof.note}
                    onChange={(e) => updateDriverDocument('licenseProof', 'note', e.target.value)}
                  />
                </div>
              </div>
              {driverRole && (
                <button className="btn btn-secondary" type="submit" disabled={busyAction === 'driver' || driverProfileBlocked}>
                  {busyAction === 'driver' ? 'Saving...' : 'Save Driver Profile'}
                </button>
              )}
            </form>
            {customerRole && !driverApplicationBlocked && (
              <button
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
                type="button"
                disabled={
                  busyAction === 'apply-driver'
                  || driverApplication?.status === 'pending'
                  || (driverRole?.roleStatus === 'active' && driverRole?.verificationStatus === 'verified')
                }
                onClick={() => submitProviderApplication('driver', driverProfile)}
              >
                {busyAction === 'apply-driver'
                  ? 'Submitting...'
                  : driverApplication?.status === 'pending'
                    ? 'Driver Application Pending'
                    : driverApplication?.status === 'rejected'
                      ? 'Re-apply for Driver Role'
                      : driverRole?.roleStatus === 'active' && driverRole?.verificationStatus === 'verified'
                        ? 'Driver Role Approved'
                        : 'Apply for Driver Role'}
              </button>
            )}
          </div>
        )}

        {(customerRole || staffRole) && (
          <div id="staff-role" className="form-card" style={{ marginBottom: '1.5rem' }}>
            <div className="form-header">
              <h2>Staff Role Onboarding</h2>
              <p style={{ color: 'var(--text-light)' }}>Maintain rental center information and submit the staff provider request from here.</p>
            </div>
            <div className="pill-row" style={{ marginBottom: '1rem' }}>
              <span className="badge badge-info">Role status: {staffRole?.roleStatus || 'not assigned'}</span>
              <span className="badge badge-warning">Verification: {staffRole?.verificationStatus || 'unverified'}</span>
              <span className="badge badge-success">Application: {staffApplication?.status || 'not submitted'}</span>
            </div>
            {staffApplication?.rejectionReason && (
              <div className="alert alert-warning">Admin note: {staffApplication.rejectionReason}</div>
            )}
            {staffProfileBlocked && (
              <div className="alert alert-danger">This role is blocked. Contact an admin before submitting further staff updates.</div>
            )}
            <form onSubmit={(e) => {
              e.preventDefault();
              saveRoleProfile('/users/staff-profile', staffProfile, 'Staff profile updated successfully', 'staff');
            }}
            >
              <div className="form-row">
                <div className="form-group">
                  <label>Store Name</label>
                  <input value={staffProfile.storeName} onChange={(e) => setStaffProfile((prev) => ({ ...prev, storeName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Store Owner</label>
                  <input value={staffProfile.storeOwner} onChange={(e) => setStaffProfile((prev) => ({ ...prev, storeOwner: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Business Registration Number</label>
                  <input value={staffProfile.businessRegistrationNumber} onChange={(e) => setStaffProfile((prev) => ({ ...prev, businessRegistrationNumber: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Store Contact Number</label>
                  <input value={staffProfile.storeContactNumber} onChange={(e) => setStaffProfile((prev) => ({ ...prev, storeContactNumber: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Store Email</label>
                  <input type="email" value={staffProfile.storeEmail} onChange={(e) => setStaffProfile((prev) => ({ ...prev, storeEmail: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Store Address</label>
                  <input value={staffProfile.storeAddress} onChange={(e) => setStaffProfile((prev) => ({ ...prev, storeAddress: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Business Registration Proof Reference</label>
                  <input
                    value={staffProfile.documents.businessRegistrationProof.reference}
                    onChange={(e) => updateStaffDocument('businessRegistrationProof', 'reference', e.target.value)}
                    placeholder="Reference or placeholder for future upload"
                  />
                </div>
                <div className="form-group">
                  <label>Business Registration Notes</label>
                  <input
                    value={staffProfile.documents.businessRegistrationProof.note}
                    onChange={(e) => updateStaffDocument('businessRegistrationProof', 'note', e.target.value)}
                  />
                </div>
              </div>
              {staffRole && (
                <button className="btn btn-secondary" type="submit" disabled={busyAction === 'staff' || staffProfileBlocked}>
                  {busyAction === 'staff' ? 'Saving...' : 'Save Staff Profile'}
                </button>
              )}
            </form>
            {customerRole && !staffApplicationBlocked && (
              <button
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
                type="button"
                disabled={
                  busyAction === 'apply-staff'
                  || staffApplication?.status === 'pending'
                  || (staffRole?.roleStatus === 'active' && staffRole?.verificationStatus === 'verified')
                }
                onClick={() => submitProviderApplication('staff', staffProfile)}
              >
                {busyAction === 'apply-staff'
                  ? 'Submitting...'
                  : staffApplication?.status === 'pending'
                    ? 'Staff Application Pending'
                    : staffApplication?.status === 'rejected'
                      ? 'Re-apply for Staff Role'
                      : staffRole?.roleStatus === 'active' && staffRole?.verificationStatus === 'verified'
                        ? 'Staff Role Approved'
                        : 'Apply for Staff Role'}
              </button>
            )}
          </div>
        )}

        {adminRole && (
          <div className="form-card">
            <div className="form-header">
              <h2>Admin Profile</h2>
              <p style={{ color: 'var(--text-light)' }}>Reserved for seeded administrators and internal control notes.</p>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              saveRoleProfile('/users/admin-profile', adminProfile, 'Admin profile updated successfully', 'admin');
            }}
            >
              <div className="form-group">
                <label>Access Scope</label>
                <input value={adminProfile.accessScope} onChange={(e) => setAdminProfile((prev) => ({ ...prev, accessScope: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Control Notes</label>
                <textarea rows="4" value={adminProfile.controlNotes} onChange={(e) => setAdminProfile((prev) => ({ ...prev, controlNotes: e.target.value }))} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={busyAction === 'admin'}>
                {busyAction === 'admin' ? 'Saving...' : 'Save Admin Profile'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
