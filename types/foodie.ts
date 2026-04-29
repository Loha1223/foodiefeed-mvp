export type FoodCategory =
  | "快閃店"
  | "當日限定"
  | "期間限定優惠"
  | "在地美食"
  | "新品上市"
  | "other";

export type Post = {
  id: number;
  created_at: string;
  name: string;
  title: string;
  city: string;
  district: string;
  address: string;
  img: string;
  category: FoodCategory;
  likes: number;
  expiry: string;
  comment_count?: number;
};

export type CreatePostInput = {
  name: string;
  title: string;
  city: string;
  district: string;
  address: string;
  img?: string;
  category?: string;
};

export type Comment = {
  id: number;
  post_id: number;
  created_at: string;
  user_name: string;
  content: string;
};
