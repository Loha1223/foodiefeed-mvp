"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { FilterBar } from "@/components/feed/FilterBar";
import { MasonryGrid } from "@/components/feed/MasonryGrid";
import { Navbar } from "@/components/global/Navbar";
import { DetailModal } from "@/components/modals/DetailModal";
import { PostModal } from "@/components/modals/PostModal";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  createPost,
  deletePost,
  fetchActivePosts,
  fetchAdminPosts,
  fetchMyPosts,
  incrementPostLike,
} from "@/lib/posts";
import { isExpired } from "@/lib/time";
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
  const [feedPosts, setFeedPosts] = useState<Post[]>(initialPosts);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [adminPosts, setAdminPosts] = useState<Post[]>([]);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isMyPostsOpen, setIsMyPostsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isMyPostsLoading, setIsMyPostsLoading] = useState(false);
  const [isAdminPostsLoading, setIsAdminPostsLoading] = useState(false);
  const [myPostsError, setMyPostsError] = useState<string | null>(null);
  const [adminPostsError, setAdminPostsError] = useState<string | null>(null);
  const { currentUser, isAdmin, isAuthLoading, authError } = useCurrentUser();

  useEffect(() => {
    async function loadPosts() {
      try {
        const activePosts = await fetchActivePosts();
        setFeedPosts(activePosts);
      } catch (error) {
        console.warn(
          error instanceof Error ? error.message : "Failed to fetch posts",
        );
      }
    }

    void loadPosts();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setMyPosts([]);
      setAdminPosts([]);
      setMyPostsError(null);
      setAdminPostsError(null);
      setIsMyPostsOpen(false);
      setIsAdminPanelOpen(false);
      return;
    }

    if (!isAdmin) {
      setAdminPosts([]);
      setAdminPostsError(null);
      setIsAdminPanelOpen(false);
    }
  }, [currentUser, isAdmin]);

  async function loadMyPosts() {
    if (isMyPostsLoading) {
      return;
    }

    if (!currentUser) {
      setMyPosts([]);
      setMyPostsError(null);
      return;
    }

    setIsMyPostsLoading(true);
    setMyPostsError(null);

    try {
      const fetchedPosts = await fetchMyPosts();
      setMyPosts(fetchedPosts);
    } catch (error) {
      console.warn(
        error instanceof Error ? error.message : "Failed to fetch my posts",
      );
      setMyPostsError(
        error instanceof Error ? error.message : "目前無法載入你的投稿",
      );
    } finally {
      setIsMyPostsLoading(false);
    }
  }

  async function loadAdminPosts() {
    if (isAdminPostsLoading) {
      return;
    }

    if (!isAdmin) {
      setAdminPosts([]);
      setAdminPostsError(null);
      return;
    }

    setIsAdminPostsLoading(true);
    setAdminPostsError(null);

    try {
      const fetchedPosts = await fetchAdminPosts();
      setAdminPosts(fetchedPosts);
    } catch (error) {
      console.warn(
        error instanceof Error ? error.message : "Failed to fetch admin posts",
      );
      setAdminPostsError(
        error instanceof Error ? error.message : "目前無法載入 Admin 資料",
      );
    } finally {
      setIsAdminPostsLoading(false);
    }
  }

  function removePostFromLists(postId: number) {
    const removePost = (currentPosts: Post[]) =>
      currentPosts.filter((currentPost) => currentPost.id !== postId);

    setFeedPosts(removePost);
    setMyPosts(removePost);
    setAdminPosts(removePost);
    setSelectedPost((currentPost) =>
      currentPost?.id === postId ? null : currentPost,
    );
  }

  function replacePostInLists(updatedPost: Post) {
    const mergePost = (currentPost: Post) =>
      currentPost.id === updatedPost.id
        ? {
            ...updatedPost,
            comment_count:
              currentPost.comment_count ?? updatedPost.comment_count ?? 0,
          }
        : currentPost;

    setFeedPosts((currentPosts) => currentPosts.map(mergePost));
    setMyPosts((currentPosts) => currentPosts.map(mergePost));
    setAdminPosts((currentPosts) => currentPosts.map(mergePost));
    setSelectedPost((currentPost) =>
      currentPost?.id === updatedPost.id ? mergePost(currentPost) : currentPost,
    );
  }

  function incrementCommentCountInLists(postId: number) {
    const incrementCommentCount = (currentPost: Post) =>
      currentPost.id === postId
        ? { ...currentPost, comment_count: (currentPost.comment_count ?? 0) + 1 }
        : currentPost;

    setFeedPosts((currentPosts) => currentPosts.map(incrementCommentCount));
    setMyPosts((currentPosts) => currentPosts.map(incrementCommentCount));
    setAdminPosts((currentPosts) => currentPosts.map(incrementCommentCount));
    setSelectedPost((currentPost) =>
      currentPost?.id === postId
        ? incrementCommentCount(currentPost)
        : currentPost,
    );
  }

  async function handleCreatePost(input: CreatePostInput) {
    const newPost = await createPost(input);
    const postWithCommentCount = {
      ...newPost,
      comment_count: newPost.comment_count ?? 0,
    };

    if (!isExpired(postWithCommentCount.expiry)) {
      setFeedPosts((currentPosts) => [postWithCommentCount, ...currentPosts]);
    }

    if (currentUser) {
      setMyPosts((currentPosts) => [
        postWithCommentCount,
        ...currentPosts.filter((post) => post.id !== postWithCommentCount.id),
      ]);
    }

    if (isAdmin) {
      setAdminPosts((currentPosts) => [
        postWithCommentCount,
        ...currentPosts.filter((post) => post.id !== postWithCommentCount.id),
      ]);
    }
  }

  async function handleLike(post: Post) {
    const previousFeedPosts = feedPosts;
    const previousMyPosts = myPosts;
    const previousAdminPosts = adminPosts;
    const previousSelectedPost = selectedPost;
    const incrementLike = (currentPost: Post) =>
      currentPost.id === post.id
        ? { ...currentPost, likes: currentPost.likes + 1 }
        : currentPost;

    setFeedPosts((currentPosts) => currentPosts.map(incrementLike));
    setMyPosts((currentPosts) => currentPosts.map(incrementLike));
    setAdminPosts((currentPosts) => currentPosts.map(incrementLike));
    setSelectedPost((currentPost) =>
      currentPost?.id === post.id ? incrementLike(currentPost) : currentPost,
    );

    try {
      const updatedPost = await incrementPostLike(post);
      replacePostInLists(updatedPost);
    } catch (error) {
      console.warn(
        error instanceof Error ? error.message : "Failed to update likes",
      );
      setFeedPosts(previousFeedPosts);
      setMyPosts(previousMyPosts);
      setAdminPosts(previousAdminPosts);
      setSelectedPost(previousSelectedPost);
    }
  }

  async function handleDeletePost(post: Post) {
    const previousFeedPosts = feedPosts;
    const previousMyPosts = myPosts;
    const previousAdminPosts = adminPosts;
    const previousSelectedPost = selectedPost;

    removePostFromLists(post.id);

    try {
      await deletePost(post);
    } catch (error) {
      console.warn(
        error instanceof Error ? error.message : "Failed to delete post",
      );
      setFeedPosts(previousFeedPosts);
      setMyPosts(previousMyPosts);
      setAdminPosts(previousAdminPosts);
      setSelectedPost(previousSelectedPost);
    }
  }

  function handlePostClick(post: Post) {
    setSelectedPost(post);
  }

  function handleCommentCreated(postId: number) {
    incrementCommentCountInLists(postId);
  }

  function handleOpenPostModal() {
    setIsPostModalOpen(true);
  }

  function handleToggleMyPosts() {
    const shouldOpen = !isMyPostsOpen;
    setIsMyPostsOpen(shouldOpen);
    setIsAdminPanelOpen(false);

    if (shouldOpen) {
      void loadMyPosts();
    }
  }

  function handleToggleAdminPanel() {
    const shouldOpen = !isAdminPanelOpen;
    setIsAdminPanelOpen(shouldOpen);
    setIsMyPostsOpen(false);

    if (shouldOpen) {
      void loadAdminPosts();
    }
  }

  return (
    <main className="min-h-screen">
      <Navbar
        isMyPostsOpen={isMyPostsOpen}
        isAdminPanelOpen={isAdminPanelOpen}
        currentUser={currentUser}
        isAdmin={isAdmin}
        isAuthLoading={isAuthLoading}
        onToggleMyPosts={handleToggleMyPosts}
        onToggleAdminPanel={handleToggleAdminPanel}
        onOpenPostModal={handleOpenPostModal}
      />
      {authError ? (
        <div className="mx-auto max-w-6xl px-4 pt-4 text-sm text-red-700 sm:px-6">
          {authError}
        </div>
      ) : null}
      <AdminPanel
        mode="mine"
        isOpen={isMyPostsOpen}
        posts={myPosts}
        currentUser={currentUser}
        isAdmin={isAdmin}
        isAuthLoading={isAuthLoading}
        isLoading={isMyPostsLoading}
        error={myPostsError}
        onDeletePost={handleDeletePost}
        onRefresh={() => void loadMyPosts()}
      />
      <AdminPanel
        mode="admin"
        isOpen={isAdminPanelOpen}
        posts={adminPosts}
        currentUser={currentUser}
        isAdmin={isAdmin}
        isAuthLoading={isAuthLoading}
        isLoading={isAdminPostsLoading}
        error={adminPostsError}
        onDeletePost={handleDeletePost}
        onRefresh={() => void loadAdminPosts()}
      />
      <FilterBar totalCount={feedPosts.length} />
      <MasonryGrid
        posts={feedPosts}
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
