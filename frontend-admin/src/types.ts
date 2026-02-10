export interface Cluster {
  id?: number;  // Database ID
  cluster_id: string;
  intent: string;
  submission_ids: number[];
  center_latitude?: number;
  center_longitude?: number;
  ward?: string;
  size: number;
  priority: string;
  escalated: boolean;
  created_at: string;
  // SLA fields
  sla_target_hours?: number;
  sla_deadline?: string;
  sla_breached?: boolean;
  // Assignment fields
  assigned_crew_id?: number;
  assigned_at?: string;
  resolved_at?: string;
}

export interface Submission {
  id: number;
  latitude?: number;
  longitude?: number;
  intent: string;
  status: string;
  priority: string;
  sentiment?: number; // 0.0 (Happy) to 1.0 (Angry)
  text?: string;
  phone?: string;
  ocr_parsed_data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface HeatmapData {
  clusters: Cluster[];
  submissions: Submission[];
}

export interface AdminSimulateUpdate {
  submission_ids: number[];
  status: string;
  priority?: string;
}

export interface KPIData {
  totalSubmissions: number;
  activeClusters: number;
  avgResolutionTime: string;
  highPriorityQueue: number;
}

export interface CrewInfo {
  id: string;
  name: string;
  specialty: string;
  available: boolean;
}

export interface ActivityLogEntry {
  id: string;
  type: 'submission_received' | 'cluster_formed' | 'dispatch_simulated' | 'status_updated';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
