"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { FilterBar } from "@/components/feed/FilterBar";
import { MasonryGrid } from "@/components/feed/MasonryGrid";
import { Navbar } from "@/components/global/Navbar";
import { DetailModal } from "@/components/modals/DetailModal";
import { PostModal } from "@/components/modals/PostModal";
import {
  createPost,
  deletePost,
  fetchActivePosts,
  incrementPostLike,
} from "@/lib/posts";
import type { CreatePostInput, Post } from "@/types/foodie";

function createMockPosts(): Post[] {
  const now = Date.now();
  const day = 1000 * 60 * 60 * 24;

  return [
    {
      id: 1,
      created_at: new Date(now - day).toISOString(),
      name: "巷口炭烤飯糰",
      title: "午間限定炭烤明太子飯糰",
      city: "台北市",
      district: "大安區",
      address: "台北市大安區復興南路一段 100 號",
      img: "/placeholder-food.jpg",
      category: "當日限定",
      likes: 42,
      expiry: new Date(now + day).toISOString(),
      comment_count: 5,
    },
    {
      id: 2,
      created_at: new Date(now - day * 2).toISOString(),
      name: "春日甜點車",
      title: "快閃草莓千層下午三點開賣",
      city: "新北市",
      district: "板橋區",
      address: "新北市板橋區縣民大道二段 7 號",
      img: "/placeholder-food.jpg",
      category: "快閃店",
      likes: 86,
      expiry: new Date(now + day * 3).toISOString(),
      comment_count: 12,
    },
    {
      id: 3,
      created_at: new Date(now - day * 3).toISOString(),
      name: "海線牛肉湯",
      title: "開幕期間牛肉湯第二碗半價",
      city: "台中市",
      district: "西屯區",
      address: "台中市西屯區朝富路 99 號",
      img: "/placeholder-food.jpg",
      category: "期間限定優惠",
      likes: 31,
      expiry: new Date(now + day * 5).toISOString(),
      comment_count: 2,
    },
    {
      id: 4,
      created_at: new Date(now - day * 4).toISOString(),
      name: "府城豆花舖",
      title: "晚間限定焦糖布丁豆花",
      city: "台南市",
      district: "中西區",
      address: "台南市中西區民生路一段 15 號",
      img: "/placeholder-food.jpg",
      category: "在地美食",
      likes: 64,
      expiry: new Date(now + day * 2).toISOString(),
    },
    {
      id: 5,
      created_at: new Date(now - day * 7).toISOString(),
      name: "港邊鹽酥雞",
      title: "上週限定海味鹽酥雞",
      city: "高雄市",
      district: "鹽埕區",
      address: "高雄市鹽埕區大勇路 33 號",
      img: "/placeholder-food.jpg",
      category: "新品上市",
      likes: 18,
      expiry: new Date(now - day).toISOString(),
      comment_count: 1,
    },
  ];
}

export default function Home() {
  const initialPosts = useMemo(() => createMockPosts(), []);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  useEffect(() => {
    async function loadPosts() {
      try {
        const activePosts = await fetchActivePosts();
        setPosts(activePosts);
      } catch (error) {
        console.warn(
          error instanceof Error ? error.message : "Failed to fetch posts",
        );
      }
    }

    void loadPosts();
  }, []);

  async function handleCreatePost(input: CreatePostInput) {
    const newPost = await createPost(input);
    setPosts((currentPosts) => [newPost, ...currentPosts]);
  }

  async function handleLike(post: Post) {
    const previousPosts = posts;

    setPosts((currentPosts) =>
      currentPosts.map((currentPost) =>
        currentPost.id === post.id
          ? { ...currentPost, likes: currentPost.likes + 1 }
          : currentPost,
      ),
    );

    try {
      const updatedPost = await incrementPostLike(post);
      setPosts((currentPosts) =>
        currentPosts.map((currentPost) =>
          currentPost.id === updatedPost.id ? updatedPost : currentPost,
        ),
      );
    } catch (error) {
      console.warn(
        error instanceof Error ? error.message : "Failed to update likes",
      );
      setPosts(previousPosts);
    }
  }

  async function handleDeletePost(postId: number) {
    const previousPosts = posts;
    const previousSelectedPost = selectedPost;

    setPosts((currentPosts) =>
      currentPosts.filter((post) => post.id !== postId),
    );
    setSelectedPost((currentPost) =>
      currentPost?.id === postId ? null : currentPost,
    );

    try {
      await deletePost(postId);
    } catch (error) {
      console.warn(
        error instanceof Error ? error.message : "Failed to delete post",
      );
      setPosts(previousPosts);
      setSelectedPost(previousSelectedPost);
    }
  }

  function handlePostClick(post: Post) {
    setSelectedPost(post);
  }

  function handleCommentCreated(postId: number) {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId
          ? { ...post, comment_count: (post.comment_count ?? 0) + 1 }
          : post,
      ),
    );
    setSelectedPost((currentPost) =>
      currentPost?.id === postId
        ? {
            ...currentPost,
            comment_count: (currentPost.comment_count ?? 0) + 1,
          }
        : currentPost,
    );
  }

  function handleOpenPostModal() {
    setIsPostModalOpen(true);
  }

  return (
    <main className="min-h-screen">
      <Navbar
        isAdminOpen={isAdminOpen}
        onToggleAdmin={() => setIsAdminOpen((isOpen) => !isOpen)}
        onOpenPostModal={handleOpenPostModal}
      />
      <AdminPanel
        isOpen={isAdminOpen}
        posts={posts}
        onDeletePost={handleDeletePost}
      />
      <FilterBar totalCount={posts.length} />
      <MasonryGrid
        posts={posts}
        onPostClick={handlePostClick}
        onPostLike={handleLike}
      />
      <PostModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onCreatePost={handleCreatePost}
      />
      <DetailModal
        isOpen={selectedPost !== null}
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onCommentCreated={handleCommentCreated}
      />
    </main>
  );
}
