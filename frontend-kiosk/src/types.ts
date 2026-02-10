export interface OTPRequest {
  phone: string;
}

export interface OTPVerify {
  phone: string;
  code: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface SubmissionCreate {
  intent: string;
  text: string;
  latitude?: number;
  longitude?: number;
  postal_code?: string;
  ward?: string;
  uploaded_files?: string[];
  ocr_parsed_data?: Record<string, any>;
  citizen_id_masked?: string;
}

export interface ReceiptResponse {
  receipt_id: string;
  receipt_hash: string;
  qr_data: string;
  created_at: string;
}

export interface ReceiptVerifyResponse {
  receipt_id: string;
  verification: "OK" | "FAIL";
  verified: boolean;
  chain_position: number;
  chain_length: number;
  receipt_hash: string;
  chain_hash?: string;
  prev_hash?: string;
}

export interface OCRParseResponse {
  name?: string;
  account_no?: string;
  address?: string;
  biller?: string;
  amount?: string;
  date?: string;
  raw_text: string;
  confidence: number;
  parsed_fields: Record<string, any>;
  field_confidence?: Record<string, number>;
}

export type Language = "en" | "hi" | "ta";

export interface LocalSubmission {
  id: string;
  data: SubmissionCreate;
  status: "queued" | "synced";
  receipt_id?: string;
  created_at: string;
  offline_file?: {
    name: string;
    type: string;
    blob: Blob;
  };
}
