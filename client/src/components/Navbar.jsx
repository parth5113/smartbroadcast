import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { HiBell, HiLogout, HiChartBar } from 'react-icons/hi';

export default function Navbar() {
  const { user, logout } = useAuth();
  const socketCtx = useSocket();
  const unreadCount = socketCtx?.unreadCount || 0;
  const location = useLocation();

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="brand-icon">📡</div>
          SmartCast
        </Link>

        <div className="navbar-right">
          {user.role === 'admin' && (
            <Link to="/analytics" className={`btn btn-ghost btn-sm ${location.pathname === '/analytics' ? 'active' : ''}`}>
              <HiChartBar /> Analytics
            </Link>
          )}

          {user.role === 'student' && (
            <Link to="/" className="notification-bell" title="Notifications">
              <HiBell />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </Link>
          )}

          <div className="nav-user-info">
            <div className="nav-avatar">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="nav-user-name">{user.name}</div>
              <div className="nav-user-role">{user.role}</div>
            </div>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={logout} title="Logout">
            <HiLogout />
          </button>
        </div>
      </div>
    </nav>
  );
}
