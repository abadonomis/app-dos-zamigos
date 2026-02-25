import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { Camera } from 'lucide-react';

export default function Profile() {
  const { username } = useParams();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = user?.username === username;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${username}`)
      .then(res => res.ok ? res.json() : Promise.reject('User not found'))
      .then(data => {
        setProfile(data);
        setError('');
      })
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [username]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      
      try {
        const res = await fetch('/api/users/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: base64String }),
        });
        
        if (res.ok) {
          setProfile({ ...profile, avatar: base64String });
          updateUser({ avatar: base64String });
        } else {
          alert('Erro ao atualizar a foto de perfil.');
        }
      } catch (err) {
        alert('Erro ao atualizar a foto de perfil.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando perfil...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!profile) return null;

  return (
    <div className="py-8 px-4">
      <div className="bg-white p-8 rounded-2xl border border-zinc-200 mb-8 flex items-center gap-6">
        <div className="relative group">
          <img 
            src={profile.avatar} 
            alt={profile.username} 
            className={`w-24 h-24 rounded-full border-4 border-zinc-50 object-cover ${isUploading ? 'opacity-50' : ''}`} 
          />
          {isOwnProfile && (
            <>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
                disabled={isUploading}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
              >
                <Camera size={24} />
              </button>
            </>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{profile.username}</h1>
          <p className="text-zinc-500 mt-1">Entrou em {new Date(profile.created_at).toLocaleDateString()}</p>
          <div className="mt-4 flex gap-4 text-sm font-medium">
            <div><span className="font-bold text-zinc-900">{profile.posts?.length || 0}</span> publicações</div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-6 border-b border-zinc-200 pb-4">Publicações</h2>
      <div className="space-y-6">
        {profile.posts?.map((post: any) => (
          <PostCard key={post.id} post={post} onUpdate={() => window.location.reload()} />
        ))}
        {(!profile.posts || profile.posts.length === 0) && (
          <div className="text-center text-zinc-500 py-10">Nenhuma publicação ainda.</div>
        )}
      </div>
    </div>
  );
}
