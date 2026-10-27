export interface IFaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  isPublished: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IFaqFilterParams {
  search?: string;
  category?: string;
  isPublished?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface IFaqsResponseData {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  categories: string[];
  data: IFaqItem[];
}

export interface ICreateFaqPayload {
  question: string;
  answer: string;
  category?: string;
  isPublished?: boolean;
  order?: number;
}

export interface IUpdateFaqPayload {
  question?: string;
  answer?: string;
  category?: string;
  isPublished?: boolean;
  order?: number;
}

export interface IBulkPublishPayload {
  ids: string[];
  isPublished: boolean;
}

export interface IBulkCategoryPayload {
  ids: string[];
  category: string;
}

export interface IBulkDeletePayload {
  ids: string[];
}
