export type TrekCategory = 'weekend' | 'oneday' | 'backpacking' | 'bike';

export interface Trek {
  id: number;
  name: string;
  category: TrekCategory;
  image: string;
  description: string;
  duration: string;
  difficulty: string;
  distance: string;
  price: number;
  priceText: string;
  tag?: string;
  hot?: boolean;
}

export interface Review {
  id: number;
  name: string;
  initial: string;
  trek: string;
  date: string;
  text: string;
  rating: number;
}
