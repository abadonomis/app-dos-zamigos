import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, MessageCircle, AtSign } from 'lucide-react';

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        setNotifications(data);
        fetch('/api/notifications/read', { method: 'POST' });
      });
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={20} className="text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle size={20} className="text-blue-500" />;
      case 'mention': return <AtSign size={20} className="text-indigo-500" />;
      default: return <Bell size={20} className="text-zinc-500" />;
    }
  };

  const getMessage = (type: string, actor: string) => {
    switch (type) {
      case 'like': return <><span className="font-bold">{actor}</span> curtiu sua publicação</>;
      case 'comment': return <><span className="font-bold">{actor}</span> comentou na sua publicação</>;
      case 'mention': return <><span className="font-bold">{actor}</span> mencionou você em uma publicação/comentário</>;
      default: return <><span className="font-bold">{actor}</span> interagiu com você</>;
    }
  };

  return (
    <div className="py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Notificações</h1>
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">Nenhuma notificação ainda.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {notifications.map(notification => (
              <Link 
                key={notification.id} 
                to={notification.post_id ? `/#post-${notification.post_id}` : '#'}
                className={`flex items-start gap-4 p-4 hover:bg-zinc-50 transition-colors ${!notification.read ? 'bg-indigo-50/30' : ''}`}
              >
                <div className="mt-1">{getIcon(notification.type)}</div>
                <img src={notification.actor_avatar} alt={notification.actor_username} className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <p className="text-zinc-800">{getMessage(notification.type, notification.actor_username)}</p>
                  <p className="text-xs text-zinc-500 mt-1">{new Date(notification.created_at).toLocaleString()}</p>
                </div>
                {!notification.read && <div className="w-2 h-2 rounded-full bg-indigo-600 mt-2"></div>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
