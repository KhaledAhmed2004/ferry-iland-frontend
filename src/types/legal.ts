export interface ILegalPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateLegalPagePayload {
  title: string;
  slug?: string;
  content: string;
  isPublished?: boolean;
}

export interface IUpdateLegalPagePayload {
  title?: string;
  slug?: string;
  content?: string;
  isPublished?: boolean;
}

