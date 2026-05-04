"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminAdManagerPanel } from "@/components/admin/AdminAdManagerPanel";
import { AdminAdStatsPanel } from "@/components/admin/AdminAdStatsPanel";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { FilterBar } from "@/components/feed/FilterBar";
import { MasonryGrid } from "@/components/feed/MasonryGrid";
import { Navbar } from "@/components/global/Navbar";
import { Toast } from "@/components/global/Toast";
import { HeroBanner, HeroBannerSkeleton } from "@/components/hero/HeroBanner";
import { DetailModal } from "@/components/modals/DetailModal";
import { PostModal } from "@/components/modals/PostModal";
import { ToastProvider, useToast } from "@/hooks/useToast";
import { fetchActiveSponsoredPosts } from "@/lib/ads";
import { getUserFriendlyErrorMessage } from "@/lib/errorMessages";
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
import type {
  CreatePostInput,
  FeedFilterState,
  FeedSortOption,
  Post,
  SponsoredPost,
} from "@/types/foodie";

const HERO_BANNER_DISMISSED_STORAGE_KEY = "foodiefeed_hero_banner_dismissed";

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

function matchesCurrentFeedFilter(post: Post, filter: FeedFilterState): boolean {
  const keyword = filter.keyword.trim().toLowerCase();

  if (keyword) {
    const searchable = [
      post.title,
      post.name,
      post.address,
      post.city,
      post.district,
      post.category,
    ]
      .join(" ")
      .toLowerCase();

    if (!searchable.includes(keyword)) {
      return false;
    }
  }

  if (filter.category !== "all" && post.category !== filter.category) {
    return false;
  }

  if (filter.city && post.city !== filter.city) {
    return false;
  }

  if (filter.district && post.district !== filter.district) {
    return false;
  }

  return true;
}

function isHeroPostFallbackCandidate(
  post: Post,
  filter: FeedFilterState,
): boolean {
  const hasRequiredContent = [
    post.title,
    post.name,
    post.city,
    post.district,
    post.address,
  ].every((value) => value.trim().length > 0);
  const hasEnoughEngagement = (post.comment_count ?? 0) >= 1 || post.likes >= 5;

  return (
    !isExpired(post.expiry) &&
    hasRequiredContent &&
    hasEnoughEngagement &&
    matchesCurrentFeedFilter(post, filter)
  );
}

function HomeContent() {
  const initialPosts = useMemo(() => createMockPosts(), []);
  const [feedPosts, setFeedPosts] = useState<Post[]>(initialPosts);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [adminPosts, setAdminPosts] = useState<Post[]>([]);
  const [sponsoredPosts, setSponsoredPosts] = useState<SponsoredPost[]>([]);
  const [heroSponsoredPost, setHeroSponsoredPost] =
    useState<SponsoredPost | null>(null);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [isHeroSponsoredLoading, setIsHeroSponsoredLoading] = useState(true);
  const [isHeroDismissed, setIsHeroDismissed] = useState(false);
  const [hasResolvedHeroDismissal, setHasResolvedHeroDismissal] =
    useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isMyPostsOpen, setIsMyPostsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isAdStatsOpen, setIsAdStatsOpen] = useState(false);
  const [isAdManagerOpen, setIsAdManagerOpen] = useState(false);
  const [isMyPostsLoading, setIsMyPostsLoading] = useState(false);
  const [isAdminPostsLoading, setIsAdminPostsLoading] = useState(false);
  const [myPostsError, setMyPostsError] = useState<string | null>(null);
  const [adminPostsError, setAdminPostsError] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState<FeedFilterState>({
    keyword: "",
    category: "all",
    city: "",
    district: "",
    sortBy: "latest",
  });
  const { currentUser, isAdmin, isAuthLoading, authError } = useCurrentUser();
  const { toast, showToast, closeToast } = useToast();

  const filteredFeedPosts = useMemo(() => {
    const filtered = feedPosts.filter((post) =>
      matchesCurrentFeedFilter(post, feedFilter),
    );

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (feedFilter.sortBy === "expiry_soon") {
        return new Date(a.expiry).getTime() - new Date(b.expiry).getTime();
      }

      if (feedFilter.sortBy === "popular") {
        return b.likes - a.likes;
      }

      if (feedFilter.sortBy === "comments") {
        return (b.comment_count ?? 0) - (a.comment_count ?? 0);
      }

      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return sorted;
  }, [feedPosts, feedFilter]);

  const heroPost = useMemo(() => {
    if (heroSponsoredPost) {
      return null;
    }

    const candidates = feedPosts.filter((post) =>
      isHeroPostFallbackCandidate(post, feedFilter),
    );

    return (
      [...candidates].sort((a, b) => {
        const commentDifference =
          (b.comment_count ?? 0) - (a.comment_count ?? 0);

        if (commentDifference !== 0) {
          return commentDifference;
        }

        const likeDifference = b.likes - a.likes;

        if (likeDifference !== 0) {
          return likeDifference;
        }

        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      })[0] ?? null
    );
  }, [feedPosts, feedFilter, heroSponsoredPost]);

  const shouldRenderHeroArea = hasResolvedHeroDismissal && !isHeroDismissed;
  const isHeroLoading =
    shouldRenderHeroArea && (isFeedLoading || isHeroSponsoredLoading);

  useEffect(() => {
    try {
      setIsHeroDismissed(
        window.sessionStorage.getItem(HERO_BANNER_DISMISSED_STORAGE_KEY) ===
          "true",
      );
    } catch (error) {
      console.warn(
        error instanceof Error
          ? `Failed to read hero banner session state: ${error.message}`
          : "Failed to read hero banner session state",
      );
    } finally {
      setHasResolvedHeroDismissal(true);
    }
  }, []);

  useEffect(() => {
    async function loadPosts() {
      setIsFeedLoading(true);

      try {
        const activePosts = await fetchActivePosts();
        setFeedPosts(activePosts);
      } catch (error) {
        console.warn(
          error instanceof Error ? error.message : "Failed to fetch posts",
        );
      } finally {
        setIsFeedLoading(false);
      }
    }

    void loadPosts();
  }, []);

  async function loadSponsoredPosts() {
    setIsHeroSponsoredLoading(true);
    const adFilters = {
      city: feedFilter.city,
      district: feedFilter.district,
      category: feedFilter.category === "all" ? undefined : feedFilter.category,
    };

    try {
      const [activeSponsoredPosts, activeHeroSponsoredPosts] = await Promise.all([
        fetchActiveSponsoredPosts({
          ...adFilters,
          placement: "feed",
        }),
        fetchActiveSponsoredPosts({
          ...adFilters,
          placement: "hero",
        }),
      ]);

      setSponsoredPosts(activeSponsoredPosts);
      setHeroSponsoredPost(activeHeroSponsoredPosts[0] ?? null);
    } catch (error) {
      console.warn(
        error instanceof Error
          ? `Failed to load sponsored placements: ${error.message}`
          : "Failed to load sponsored placements",
      );
      setHeroSponsoredPost(null);
    } finally {
      setIsHeroSponsoredLoading(false);
    }
  }

  useEffect(() => {
    if (isFeedLoading) {
      return;
    }
    void loadSponsoredPosts();
  }, [
    isFeedLoading,
    feedFilter.city,
    feedFilter.district,
    feedFilter.category,
  ]);

  useEffect(() => {
    if (!currentUser) {
      setMyPosts([]);
      setAdminPosts([]);
      setMyPostsError(null);
      setAdminPostsError(null);
      setIsMyPostsOpen(false);
      setIsAdminPanelOpen(false);
      setIsAdStatsOpen(false);
      setIsAdManagerOpen(false);
      return;
    }

    if (!isAdmin) {
      setAdminPosts([]);
      setAdminPostsError(null);
      setIsAdminPanelOpen(false);
      setIsAdStatsOpen(false);
      setIsAdManagerOpen(false);
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
      const message = getUserFriendlyErrorMessage(error, "目前無法載入你的投稿");
      setMyPostsError(message);
      showToast({
        variant: "error",
        title: "載入失敗",
        message,
      });
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
      const message = getUserFriendlyErrorMessage(error, "目前無法載入 Admin 資料");
      setAdminPostsError(message);
      showToast({
        variant: "error",
        title: "載入失敗",
        message,
      });
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
    try {
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

      showToast({
        variant: matchesCurrentFeedFilter(postWithCommentCount, feedFilter)
          ? "success"
          : "info",
        title: "發佈成功",
        message: matchesCurrentFeedFilter(postWithCommentCount, feedFilter)
          ? "情報已發佈。"
          : "情報已發佈，但目前搜尋或篩選條件可能未顯示此貼文。",
      });
    } catch (error) {
      throw error;
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
      const isAlreadyLiked =
        error instanceof Error && error.message === "你已經按過讚";
      showToast({
        variant: isAlreadyLiked ? "info" : "error",
        title: isAlreadyLiked ? "已按過讚" : "按讚失敗",
        message: isAlreadyLiked
          ? "你已經按過讚"
          : getUserFriendlyErrorMessage(error, "按讚失敗，請稍後再試。"),
      });
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
      showToast({
        variant: "success",
        title: "刪除成功",
        message: "情報已刪除。",
      });
    } catch (error) {
      console.warn(
        error instanceof Error ? error.message : "Failed to delete post",
      );
      setFeedPosts(previousFeedPosts);
      setMyPosts(previousMyPosts);
      setAdminPosts(previousAdminPosts);
      setSelectedPost(previousSelectedPost);
      showToast({
        variant: "error",
        title: "刪除失敗",
        message: getUserFriendlyErrorMessage(error, "刪除情報失敗，請稍後再試。"),
      });
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
    setIsAdStatsOpen(false);
    setIsAdManagerOpen(false);

    if (shouldOpen) {
      void loadMyPosts();
    }
  }

  function handleToggleAdminPanel() {
    const shouldOpen = !isAdminPanelOpen;
    setIsAdminPanelOpen(shouldOpen);
    setIsMyPostsOpen(false);
    setIsAdStatsOpen(false);
    setIsAdManagerOpen(false);

    if (shouldOpen) {
      void loadAdminPosts();
    }
  }

  function handleToggleAdStats() {
    const shouldOpen = !isAdStatsOpen;
    setIsAdStatsOpen(shouldOpen);
    setIsMyPostsOpen(false);
    setIsAdminPanelOpen(false);
    setIsAdManagerOpen(false);
  }

  function handleToggleAdManager() {
    const shouldOpen = !isAdManagerOpen;
    setIsAdManagerOpen(shouldOpen);
    setIsMyPostsOpen(false);
    setIsAdminPanelOpen(false);
    setIsAdStatsOpen(false);
  }

  function handleResetFeedFilter() {
    setFeedFilter({
      keyword: "",
      category: "all",
      city: "",
      district: "",
      sortBy: "latest",
    });
  }

  function handleSortChange(sortBy: FeedSortOption) {
    setFeedFilter((current) => ({ ...current, sortBy }));
  }

  function handleDismissHeroBanner() {
    setIsHeroDismissed(true);

    try {
      window.sessionStorage.setItem(HERO_BANNER_DISMISSED_STORAGE_KEY, "true");
    } catch (error) {
      console.warn(
        error instanceof Error
          ? `Failed to persist hero banner dismissal: ${error.message}`
          : "Failed to persist hero banner dismissal",
      );
    }
  }

  return (
    <main className="min-h-screen">
      <Navbar
        isMyPostsOpen={isMyPostsOpen}
        isAdminPanelOpen={isAdminPanelOpen}
        isAdStatsOpen={isAdStatsOpen}
        isAdManagerOpen={isAdManagerOpen}
        currentUser={currentUser}
        isAdmin={isAdmin}
        isAuthLoading={isAuthLoading}
        onToggleMyPosts={handleToggleMyPosts}
        onToggleAdminPanel={handleToggleAdminPanel}
        onToggleAdStats={handleToggleAdStats}
        onToggleAdManager={handleToggleAdManager}
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
      <AdminAdStatsPanel
        isOpen={isAdStatsOpen}
        isAdmin={isAdmin}
        onClose={() => setIsAdStatsOpen(false)}
      />
      <AdminAdManagerPanel
        isOpen={isAdManagerOpen}
        isAdmin={isAdmin}
        onClose={() => setIsAdManagerOpen(false)}
        onAdsChanged={() => void loadSponsoredPosts()}
      />
      <FilterBar
        filter={feedFilter}
        isLoading={isFeedLoading}
        totalCount={feedPosts.length}
        filteredCount={filteredFeedPosts.length}
        onKeywordChange={(value) =>
          setFeedFilter((current) => ({ ...current, keyword: value }))
        }
        onCategoryChange={(value) =>
          setFeedFilter((current) => ({ ...current, category: value }))
        }
        onCityChange={(value) =>
          setFeedFilter((current) => ({
            ...current,
            city: value,
            district: "",
          }))
        }
        onDistrictChange={(value) =>
          setFeedFilter((current) => ({
            ...current,
            district: value,
          }))
        }
        onSortChange={handleSortChange}
        onReset={handleResetFeedFilter}
      />
      {isHeroLoading ? <HeroBannerSkeleton /> : null}
      {shouldRenderHeroArea && !isHeroLoading && heroSponsoredPost ? (
        <HeroBanner
          variant="sponsored"
          ad={heroSponsoredPost}
          onDismiss={handleDismissHeroBanner}
        />
      ) : null}
      {shouldRenderHeroArea && !isHeroLoading && !heroSponsoredPost && heroPost ? (
        <HeroBanner
          variant="post"
          post={heroPost}
          onPostClick={handlePostClick}
          onDismiss={handleDismissHeroBanner}
        />
      ) : null}
      <MasonryGrid
        isLoading={isFeedLoading}
        posts={filteredFeedPosts}
        sponsoredPosts={sponsoredPosts}
        onPostClick={handlePostClick}
        onPostLike={handleLike}
      />
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-center text-xs text-stone-500 sm:px-6">
        FoodieFeed 味鮮牆｜限時美食情報站
      </footer>
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
      {toast ? (
        <Toast
          title={toast.title}
          message={toast.message}
          variant={toast.variant}
          onClose={closeToast}
        />
      ) : null}
    </main>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <HomeContent />
    </ToastProvider>
  );
}
