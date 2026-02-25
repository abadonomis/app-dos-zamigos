import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CreatePost({ onPostCreated }: { onPostCreated: () => void }) {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'data:';
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return; // Image is required
    
    if (!isValidUrl(imageUrl)) {
      alert('Por favor, insira uma URL de imagem válida.');
      return;
    }
    
    setLoading(true);
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption, image_url: imageUrl }),
    });
    
    if (res.ok) {
      setCaption('');
      setImageUrl('');
      onPostCreated();
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
      <div className="flex gap-4">
        <img src={user?.avatar} alt={user?.username} className="w-12 h-12 rounded-full border border-zinc-100" />
        <form onSubmit={handleSubmit} className="flex-1 space-y-4">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="O que você está pensando? Mencione alguém com @usuario"
            className="w-full resize-none border-none focus:ring-0 text-lg placeholder-zinc-400 min-h-[80px]"
          />
          
          {imageUrl && (
            <div className="relative rounded-xl overflow-hidden border border-zinc-200">
              <img src={imageUrl} alt="Preview" className="w-full h-auto max-h-[400px] object-cover" />
              <button 
                type="button" 
                onClick={() => setImageUrl('')}
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
              >
                &times;
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
              >
                <ImageIcon size={20} />
              </button>
            </div>
            <button
              type="submit"
              disabled={loading || !imageUrl.trim()}
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={16} />
              Publicar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
