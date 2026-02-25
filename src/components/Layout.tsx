import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Home, User, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUnreadCount(data.filter(n => !n.read).length);
        }
      });
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Sidebar / Bottom Nav */}
      <nav className="bg-white border-r border-zinc-200 w-full md:w-64 flex-shrink-0 fixed md:sticky bottom-0 md:top-0 h-16 md:h-screen z-10 flex flex-row md:flex-col justify-around md:justify-start p-4">
        <div className="hidden md:flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
          <span className="text-xl font-bold tracking-tight">SocialApp</span>
        </div>

        <Link to="/" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 transition-colors text-zinc-700">
          <Home size={24} />
          <span className="hidden md:block font-medium">Início</span>
        </Link>
        
        <Link to={`/profile/${user?.username}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 transition-colors text-zinc-700">
          <User size={24} />
          <span className="hidden md:block font-medium">Perfil</span>
        </Link>

        <Link to="/notifications" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 transition-colors text-zinc-700 relative">
          <div className="relative">
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="hidden md:block font-medium">Notificações</span>
        </Link>

        <div className="hidden md:block mt-auto">
          <div className="flex items-center gap-3 p-3 mb-2">
            <img src={user?.avatar} alt={user?.username} className="w-10 h-10 rounded-full border border-zinc-200" />
            <div className="flex flex-col">
              <span className="font-medium text-sm">{user?.username}</span>
              <span className="text-xs text-zinc-500">@{user?.username}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-600 transition-colors">
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
