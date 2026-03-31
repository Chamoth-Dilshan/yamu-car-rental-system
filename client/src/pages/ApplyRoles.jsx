import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const roleCards = [
  {
    key: 'driver',
    title: 'Driver Role',
    description: 'Add your license and driver details, then submit the request to admin.'
  },
  {
    key: 'staff',
    title: 'Staff Role',
    description: 'Add your store details and submit the staff access request to admin.'
  }
];

export default function ApplyRoles() {
  const { user } = useAuth();
  const roleMap = Object.fromEntries((user?.roles || []).map((item) => [item.roleKey, item]));
  const applicationMap = Object.fromEntries((user?.providerApplications || []).map((item) => [item.roleKey, item]));

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Apply Roles</h2>
          <p style={{ color: 'var(--text-light)' }}>Open the onboarding form for the role you want to request.</p>
        </div>

        <div className="grid-3">
          {roleCards.map((item) => {
            const role = roleMap[item.key];
            const application = applicationMap[item.key];
            const target = item.key === 'driver' ? '/profile#driver-role' : '/profile#staff-role';

            return (
              <div key={item.key} className="card">
                <div className="card-body">
                  <h4>{item.title}</h4>
                  <p style={{ color: 'var(--text-light)', margin: '0.75rem 0 1rem' }}>{item.description}</p>
                  <div className="pill-row" style={{ marginBottom: '1rem' }}>
                    <span className="badge badge-info">Role: {role?.roleStatus || 'not assigned'}</span>
                    <span className="badge badge-warning">Verify: {role?.verificationStatus || 'unverified'}</span>
                    <span className="badge badge-success">Apply: {application?.status || 'not submitted'}</span>
                  </div>
                  <Link to={target} className="btn btn-primary btn-block">
                    Open Form
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
