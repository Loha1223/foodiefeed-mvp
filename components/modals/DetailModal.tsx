"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Comment, Post } from "@/types/foodie";
import {
  createComment,
  fetchCommentsByPostId,
} from "@/lib/comments";
import { useToast } from "@/hooks/useToast";
import { getUserFriendlyErrorMessage } from "@/lib/errorMessages";
import { getExpiryLabel } from "@/lib/time";

type DetailModalProps = {
  isOpen: boolean;
  post: Post | null;
  onClose: () => void;
  onCommentCreated?: (postId: number) => void;
};

export function DetailModal({
  isOpen,
  post,
  onClose,
  onCommentCreated,
}: DetailModalProps) {
  const { showToast } = useToast();
  const postId = post?.id;
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const previousBodyOverflowRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !postId) {
      return;
    }

    let isCancelled = false;
    const activePostId = postId;

    async function loadComments() {
      setIsLoadingComments(true);
      setLoadError("");
      setFormError("");
      setComments([]);

      try {
        const fetchedComments = await fetchCommentsByPostId(activePostId);

        if (!isCancelled) {
          setComments(fetchedComments);
        }
      } catch {
        if (!isCancelled) {
          setLoadError("目前無法載入留言，可能尚未設定 Supabase。");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingComments(false);
        }
      }
    }

    void loadComments();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, postId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    previousBodyOverflowRef.current = previousOverflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflowRef.current ?? "";
      previousBodyOverflowRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!post) {
      return;
    }

    const trimmedContent = commentContent.trim();

    if (!trimmedContent) {
      setFormError("請輸入留言內容");
      return;
    }

    setFormError("");
    setIsSubmittingComment(true);

    try {
      const newComment = await createComment(post.id, trimmedContent);
      setComments((currentComments) => [...currentComments, newComment]);
      setCommentContent("");
      onCommentCreated?.(post.id);
      showToast({
        variant: "success",
        title: "留言成功",
        message: "你的留言已送出。",
      });
    } catch (error) {
      const message = getUserFriendlyErrorMessage(error, "留言送出失敗，請稍後再試。");
      setFormError(
        message,
      );
      showToast({
        variant: "error",
        title: "留言失敗",
        message,
      });
    } finally {
      setIsSubmittingComment(false);
    }
  }

  if (!isOpen || !post) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-stone-950/50 px-3 py-4 sm:items-center sm:px-4 sm:py-8"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl sm:max-h-full"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative">
          <img
            src={post.img || "/placeholder-food.jpg"}
            alt={post.title}
            className="h-56 w-full object-cover sm:h-72"
            onError={(event) => {
              event.currentTarget.src = "/placeholder-food.jpg";
            }}
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md bg-white/95 px-3 py-2 text-sm font-medium text-stone-700 shadow hover:bg-white"
          >
            關閉
          </button>
        </div>

        <div className="space-y-6 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700">
                {getExpiryLabel(post.expiry)}
              </span>
              <span className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-600">
                {post.category}
              </span>
              <span className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-600">
                {post.city} / {post.district}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-stone-950">
              {post.title}
            </h2>
            <p className="mt-2 text-base font-medium text-stone-700">
              {post.name}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              {post.address}
            </p>
          </div>

          <div className="grid gap-3 rounded-lg bg-stone-50 p-4 text-sm text-stone-600 sm:grid-cols-3">
            <div>
              <p className="font-medium text-stone-900">按讚</p>
              <p className="mt-1">{post.likes}</p>
            </div>
            <div>
              <p className="font-medium text-stone-900">留言</p>
              <p className="mt-1">{post.comment_count ?? 0}</p>
            </div>
            <div>
              <p className="font-medium text-stone-900">到期時間</p>
              <p className="mt-1">
                {new Date(post.expiry).toLocaleString("zh-TW", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>

          <section className="border-t border-stone-200 pt-5">
            <h3 className="text-lg font-bold text-stone-950">留言區</h3>

            <div className="mt-3 space-y-3">
              {isLoadingComments ? (
                <div className="rounded-lg border border-dashed border-stone-300 bg-white px-4 py-6 text-sm text-stone-500">
                  留言載入中...
                </div>
              ) : null}

              {!isLoadingComments && loadError ? (
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-700">
                  {loadError}
                </div>
              ) : null}

              {!isLoadingComments && !loadError && comments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-stone-300 bg-white px-4 py-6 text-sm text-stone-500">
                  目前還沒有留言，成為第一個分享情報的人。
                </div>
              ) : null}

              {!isLoadingComments && !loadError && comments.length > 0 ? (
                <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
                  {comments.map((comment) => (
                    <li key={comment.id} className="px-4 py-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-stone-900">
                          {comment.user_name || "訪客"}
                        </p>
                        <time className="text-xs text-stone-400">
                          {new Date(comment.created_at).toLocaleString(
                            "zh-TW",
                          )}
                        </time>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">
                        {comment.content}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <form onSubmit={handleCommentSubmit} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-stone-700">
                補充情報
                <span className="mt-1 block text-xs font-normal text-stone-500">
                  登入後可以留言補充情報
                </span>
                <textarea
                  value={commentContent}
                  onChange={(event) => {
                    setCommentContent(event.target.value);
                    if (formError) {
                      setFormError("");
                    }
                  }}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500"
                  placeholder="補充你的情報，例如排隊狀況、推薦餐點、優惠內容"
                />
              </label>

              {formError ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {formError}
                </p>
              ) : null}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingComment}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-400"
                >
                  {isSubmittingComment ? "送出中..." : "送出留言"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
