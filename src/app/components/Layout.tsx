import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n/translations';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  FileText, 
  Settings, 
  Bell,
  LogOut,
  ChevronRight,
  Menu
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';

export default function Layout() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  const unreadCount = 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: t.dashboard },
    { path: '/projects', icon: FolderKanban, label: t.projects },
    { path: '/users', icon: Users, label: t.users },
    { path: '/reports', icon: FileText, label: t.reports },
    { path: '/settings', icon: Settings, label: t.settings },
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="h-16 border-b border-foreground/10 bg-background sticky top-0 z-50">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold" style={{ color: '#6246EA' }}>
              Project Management
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  style={{ backgroundColor: '#E45858', color: '#FFFFFE' }}
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>

            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback style={{ backgroundColor: '#6246EA', color: '#FFFFFE' }}>
                  {user?.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <div className="font-medium">{user?.name}</div>
                <div className="text-foreground/60 text-xs capitalize">{user?.role.replace('_', ' ')}</div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title={t.logout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-64 border-r border-foreground/10 min-h-[calc(100vh-4rem)] bg-background">
            <nav className="p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link key={item.path} to={item.path}>
                    <div
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive 
                          ? 'text-white' 
                          : 'text-foreground hover:bg-secondary'
                      }`}
                      style={isActive ? { backgroundColor: '#6246EA' } : {}}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                      {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}