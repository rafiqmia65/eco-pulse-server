export interface IIdea {
  title: string;
  problem: string;
  solution: string;
  description: string;
  image?: string;
  slug?: string;
  isPaid?: boolean;
  price?: number;
  categoryId: string;
  isDraft?: boolean;
}
