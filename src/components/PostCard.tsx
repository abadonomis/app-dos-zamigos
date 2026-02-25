import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, MoreHorizontal, Edit2, Trash2, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PostCard({ post, onUpdate }: { post: any, onUpdate?: () => void }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.is_liked > 0);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption || '');
  const [editImageUrl, setEditImageUrl] = useState(post.image_url || '');
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isOwner = user?.username === post.username;

  const handleLike = async () => {
    const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setLiked(data.liked);
      setLikeCount(prev => data.liked ? prev + 1 : prev - 1);
    }
  };

  const fetchComments = async () => {
    const res = await fetch(`/api/posts/${post.id}/comments`);
    if (res.ok) {
      setComments(await res.json());
    }
  };

  const handleCommentToggle = () => {
    if (!showComments) fetchComments();
    setShowComments(!showComments);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    const res = await fetch(`/api/posts/${post.id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment }),
    });
    
    if (res.ok) {
      setNewComment('');
      fetchComments();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta publicação?')) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
    if (res.ok) {
      if (onUpdate) onUpdate();
      else window.location.reload();
    }
  };

  const handleEditSubmit = async () => {
    if (!editImageUrl.trim()) {
      alert('A imagem é obrigatória.');
      return;
    }
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption: editCaption, image_url: editImageUrl }),
    });
    if (res.ok) {
      setIsEditing(false);
      setShowMenu(false);
      if (onUpdate) onUpdate();
      else window.location.reload();
    }
  };

  const renderCaption = (text: string) => {
    return text.split(/(@\w+)/g).map((part, i) => {
      if (part.startsWith('@')) {
        return <Link key={i} to={`/profile/${part.substring(1)}`} className="text-indigo-600 font-medium hover:underline">{part}</Link>;
      }
      return part;
    });
  };

  return (
    <div id={`post-${post.id}`} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="p-4 flex items-center justify-between relative">
        <Link to={`/profile/${post.username}`} className="flex items-center gap-3 group">
          <img src={post.avatar} alt={post.username} className="w-10 h-10 rounded-full border border-zinc-200 group-hover:ring-2 ring-indigo-500 transition-all" />
          <div>
            <h3 className="font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors">{post.username}</h3>
            <p className="text-xs text-zinc-500">{new Date(post.created_at).toLocaleString()}</p>
          </div>
        </Link>
        
        {isOwner && (
          <div>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="text-zinc-400 hover:text-zinc-600 p-2 rounded-full hover:bg-zinc-50 transition-colors"
            >
              <MoreHorizontal size={20} />
            </button>
            
            {showMenu && (
              <div className="absolute right-4 top-14 bg-white border border-zinc-200 shadow-lg rounded-xl overflow-hidden z-10 w-36">
                <button 
                  onClick={() => { setIsEditing(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 text-left"
                >
                  <Edit2 size={16} /> Editar
                </button>
                <button 
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 text-left border-t border-zinc-100"
                >
                  <Trash2 size={16} /> Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="px-4 pb-4 space-y-3">
          <textarea
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Legenda..."
            rows={2}
          />
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={editFileInputRef} 
              onChange={handleEditFileChange} 
            />
            <button 
              type="button"
              onClick={() => editFileInputRef.current?.click()}
              className="px-4 py-2 border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-colors text-sm font-medium"
            >
              Alterar Imagem
            </button>
            {editImageUrl && <span className="text-xs text-green-600 font-medium">Imagem selecionada</span>}
          </div>
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-full font-medium transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleEditSubmit}
              className="px-4 py-2 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="px-4 pb-3">
            {post.caption && <p className="text-zinc-800 whitespace-pre-wrap text-[15px] leading-relaxed mb-3">{renderCaption(post.caption)}</p>}
          </div>
          
          {post.image_url && (
            <div className="w-full bg-zinc-100 border-y border-zinc-100">
              <img src={post.image_url} alt="Post content" className="w-full max-h-[600px] object-contain" loading="lazy" />
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-zinc-100 flex flex-col gap-3">
        <div className="flex items-center gap-6">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-2 transition-colors ${liked ? 'text-red-500' : 'text-zinc-500 hover:text-red-500'}`}
          >
            <Heart size={24} className={liked ? 'fill-red-500' : ''} />
          </button>
          
          <button 
            onClick={handleCommentToggle}
            className="flex items-center gap-2 text-zinc-500 hover:text-blue-500 transition-colors"
          >
            <MessageCircle size={24} />
          </button>
          
          <button className="flex items-center gap-2 text-zinc-500 hover:text-green-500 transition-colors">
            <Share2 size={24} />
          </button>
        </div>
        
        {likeCount > 0 && (
          <div className="font-bold text-sm text-zinc-900">
            {likeCount} {likeCount === 1 ? 'curtida' : 'curtidas'}
          </div>
        )}
        
        {post.comment_count > 0 && !showComments && (
          <button 
            onClick={handleCommentToggle}
            className="text-sm text-zinc-500 hover:text-zinc-700 text-left"
          >
            Ver todos os {post.comment_count} {post.comment_count === 1 ? 'comentário' : 'comentários'}
          </button>
        )}
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="bg-zinc-50 p-4 border-t border-zinc-100">
          <form onSubmit={handleCommentSubmit} className="flex gap-3 mb-6">
            <img src={user?.avatar} alt={user?.username} className="w-8 h-8 rounded-full border border-zinc-200" />
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Adicione um comentário... (use @usuario para mencionar)"
              className="flex-1 bg-white border border-zinc-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button 
              type="submit"
              disabled={!newComment.trim()}
              className="text-indigo-600 font-medium px-4 disabled:opacity-50 hover:bg-indigo-50 rounded-full transition-colors"
            >
              Publicar
            </button>
          </form>

          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <Link to={`/profile/${comment.username}`}>
                  <img src={comment.avatar} alt={comment.username} className="w-8 h-8 rounded-full border border-zinc-200" />
                </Link>
                <div className="flex-1 bg-white p-3 rounded-2xl rounded-tl-none border border-zinc-100 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <Link to={`/profile/${comment.username}`} className="font-bold text-sm text-zinc-900 hover:underline">
                      {comment.username}
                    </Link>
                    <span className="text-xs text-zinc-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-zinc-800">{renderCaption(comment.content)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
