import express from 'express';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from './src/db.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) return res.status(401).json({ error: 'Unauthorized' });

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const user = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(session.user_id) as any;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    req.user = user;
    next();
  };

  // API Routes
  app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
      const result = db.prepare('INSERT INTO users (username, password, avatar) VALUES (?, ?, ?)').run(username, hashedPassword, avatar);
      
      const sessionId = crypto.randomUUID();
      db.prepare('INSERT INTO sessions (id, user_id) VALUES (?, ?)').run(sessionId, result.lastInsertRowid);
      
      res.cookie('sessionId', sessionId, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ id: result.lastInsertRowid, username, avatar });
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Username already exists' });
      } else {
        res.status(500).json({ error: 'Server error' });
      }
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const sessionId = crypto.randomUUID();
    db.prepare('INSERT INTO sessions (id, user_id) VALUES (?, ?)').run(sessionId, user.id);
    
    res.cookie('sessionId', sessionId, { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ id: user.id, username: user.username, avatar: user.avatar });
  });

  app.post('/api/auth/logout', (req, res) => {
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    }
    res.clearCookie('sessionId', { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ success: true });
  });

  app.get('/api/auth/me', authenticate, (req: any, res) => {
    res.json(req.user);
  });

  // Posts
  app.get('/api/posts', authenticate, (req: any, res) => {
    const posts = db.prepare(`
      SELECT p.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `).all(req.user.id);
    res.json(posts);
  });

  app.post('/api/posts', authenticate, (req: any, res) => {
    const { image_url, caption } = req.body;
    if (!image_url) return res.status(400).json({ error: 'Image is required' });

    const result = db.prepare('INSERT INTO posts (user_id, image_url, caption) VALUES (?, ?, ?)').run(req.user.id, image_url, caption);
    
    // Extract mentions
    const mentions = caption?.match(/@(\w+)/g);
    if (mentions) {
      mentions.forEach((mention: string) => {
        const username = mention.substring(1);
        const mentionedUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as any;
        if (mentionedUser && mentionedUser.id !== req.user.id) {
          db.prepare('INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)').run(mentionedUser.id, req.user.id, 'mention', result.lastInsertRowid);
        }
      });
    }

    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/posts/:id', authenticate, (req: any, res) => {
    const { caption, image_url } = req.body;
    const postId = req.params.id;
    
    if (!image_url) return res.status(400).json({ error: 'Image is required' });

    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId) as any;
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    db.prepare('UPDATE posts SET caption = ?, image_url = ? WHERE id = ?').run(caption, image_url, postId);
    res.json({ success: true });
  });

  app.delete('/api/posts/:id', authenticate, (req: any, res) => {
    const postId = req.params.id;
    
    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId) as any;
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
    res.json({ success: true });
  });

  app.get('/api/users/:username', authenticate, (req: any, res) => {
    const user = db.prepare('SELECT id, username, avatar, created_at FROM users WHERE username = ?').get(req.params.username) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const posts = db.prepare(`
      SELECT p.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE u.id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id, user.id);

    res.json({ ...user, posts });
  });

  app.put('/api/users/profile', authenticate, (req: any, res) => {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ error: 'Avatar is required' });

    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, req.user.id);
    res.json({ success: true, avatar });
  });

  app.post('/api/posts/:id/like', authenticate, (req: any, res) => {
    const postId = req.params.id;
    const existing = db.prepare('SELECT * FROM likes WHERE post_id = ? AND user_id = ?').get(postId, req.user.id);
    
    if (existing) {
      db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(postId, req.user.id);
      res.json({ liked: false });
    } else {
      db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, req.user.id);
      
      const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId) as any;
      if (post && post.user_id !== req.user.id) {
        db.prepare('INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)').run(post.user_id, req.user.id, 'like', postId);
      }
      res.json({ liked: true });
    }
  });

  app.get('/api/posts/:id/comments', authenticate, (req: any, res) => {
    const comments = db.prepare(`
      SELECT c.*, u.username, u.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id);
    res.json(comments);
  });

  app.post('/api/posts/:id/comment', authenticate, (req: any, res) => {
    const postId = req.params.id;
    const { content } = req.body;
    
    const result = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)').run(postId, req.user.id, content);
    
    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId) as any;
    if (post && post.user_id !== req.user.id) {
      db.prepare('INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)').run(post.user_id, req.user.id, 'comment', postId);
    }

    // Extract mentions
    const mentions = content.match(/@(\\w+)/g);
    if (mentions) {
      mentions.forEach((mention: string) => {
        const username = mention.substring(1);
        const mentionedUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as any;
        if (mentionedUser && mentionedUser.id !== req.user.id) {
          db.prepare('INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)').run(mentionedUser.id, req.user.id, 'mention', postId);
        }
      });
    }

    res.json({ id: result.lastInsertRowid });
  });

  app.get('/api/notifications', authenticate, (req: any, res) => {
    const notifications = db.prepare(`
      SELECT n.*, u.username as actor_username, u.avatar as actor_avatar
      FROM notifications n
      JOIN users u ON n.actor_id = u.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `).all(req.user.id);
    res.json(notifications);
  });

  app.post('/api/notifications/read', authenticate, (req: any, res) => {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
