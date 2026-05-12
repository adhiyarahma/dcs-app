export type UserRole = 'admin' | 'viewer';
export type DocumentStatus = 'terbaru' | 'kadaluarsa' | 'dihapus';
export type FileLabel = 'word' | 'pdf' | 'indonesia' | 'inggris';
export type FileType = 'docx' | 'xlsx' | 'pdf';

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  created_at: string;
};

export type DocumentType = {
  id: string;
  category_id: string;
  name: string;
  created_at: string;
};

export type Department = {
  id: string;
  code: string;
  name: string;
};

export type Document = {
  id: string;
  category_id: string;
  type_id: string;
  department_id: string | null;
  uploaded_by: string | null;
  doc_number: string;
  title: string;
  revision: number;
  effective_date: string;
  revision_date: string | null;
  expiry_date: string | null;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
};

export type DocumentFile = {
  id: string;
  document_id: string;
  file_label: FileLabel;
  file_url: string;
  file_name: string;
  file_type: FileType;
  uploaded_at: string;
};
