import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Server, Shield, FileText, AlertTriangle, Settings, LogOut } from 'lucide-react';
import './Layout.css';

function Layout({ user, onLogout }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Shield size={32} />
          <h1>Station Blanche</h1>
          <p className="subtitle">Serveur Central</p>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/stations" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Server size={20} />
            <span>Stations</span>
          </NavLink>

          <NavLink to="/certificates" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Shield size={20} />
            <span>Certificats</span>
          </NavLink>

          <NavLink to="/logs" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <FileText size={20} />
            <span>Logs</span>
          </NavLink>

          <NavLink to="/alerts" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <AlertTriangle size={20} />
            <span>Alertes</span>
          </NavLink>

          <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Settings size={20} />
            <span>Configuration</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.username?.charAt(0).toUpperCase()}</div>
            <div className="user-details">
              <div className="user-name">{user?.username}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={onLogout}>
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
