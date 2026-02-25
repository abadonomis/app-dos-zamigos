import { useState, useEffect } from 'react';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';

export default function Feed() {
  const [posts, setPosts] = useState<any[]>([]);

  const fetchPosts = () => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => setPosts(data));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Feed</h1>
      <CreatePost onPostCreated={fetchPosts} />
      <div className="space-y-6 mt-8">
        {posts.map(post => (
          <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
        ))}
        {posts.length === 0 && (
          <div className="text-center text-zinc-500 py-10">Nenhuma publicação ainda. Seja o primeiro a postar!</div>
        )}
      </div>
    </div>
  );
}
