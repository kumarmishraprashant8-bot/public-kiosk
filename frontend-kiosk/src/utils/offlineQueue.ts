import { LocalSubmission, SubmissionCreate, ReceiptResponse } from "../types";
import api from "./api";

const DB_NAME = "civicpulse_kiosk";
const STORE_NAME = "submissions";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function saveToOfflineQueue(submission: SubmissionCreate, file?: File): Promise<string> {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  const localSubmission: LocalSubmission = {
    id: crypto.randomUUID(),
    data: submission,
    status: "queued",
    created_at: new Date().toISOString(),
  };

  if (file) {
    localSubmission.offline_file = {
      name: file.name,
      type: file.type,
      blob: file // IDB can store Blobs directly
    };
  }

  return new Promise((resolve, reject) => {
    const request = store.add(localSubmission);
    request.onsuccess = () => resolve(localSubmission.id);
    request.onerror = () => reject(request.error);
  });
}

export async function getQueuedSubmissions(): Promise<LocalSubmission[]> {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], "readonly");
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const submissions = request.result.filter((s: LocalSubmission) => s.status === "queued");
      resolve(submissions);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function markSynced(id: string, receiptId: string): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const submission = getRequest.result;
      if (submission) {
        submission.status = "synced";
        submission.receipt_id = receiptId;
        // Optional: Clear blob to save space
        delete submission.offline_file;
        const putRequest = store.put(submission);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function syncOfflineQueue(): Promise<void> {
  if (!navigator.onLine) return;

  const queued = await getQueuedSubmissions();

  for (const localSub of queued) {
    try {
      // 1. Upload File if present
      if (localSub.offline_file) {
        try {
          const formData = new FormData();
          formData.append("file", localSub.offline_file.blob, localSub.offline_file.name);

          const uploadRes = await api.post<{ url: string }>("/files/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          // Update submission data with URL
          localSub.data.uploaded_files = [uploadRes.data.url];

        } catch (uploadError) {
          console.error("Failed to sync file for", localSub.id, uploadError);
          // Proceed? Or abort? 
          // If file upload fails, we probably shouldn't submit without it if it was intended.
          // But for now, let's try to submit anyway or maybe skip.
          // Let's skip this submission for now.
          continue;
        }
      }

      // 2. Submit Data
      const response = await api.post<ReceiptResponse>("/submission", localSub.data);
      await markSynced(localSub.id, response.data.receipt_id);

    } catch (error) {
      console.error("Sync error for submission:", localSub.id, error);
    }
  }
}
