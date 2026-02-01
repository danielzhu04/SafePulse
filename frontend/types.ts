export type Role = "STUDENT" | "SAFEWALKER";

export type User = {
  id: string;
  role: Role;
  name: string;
  email: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export type LatLng = { lat: number; lng: number };

export type StudentCreateRequestBody = {
  pickup: { label: string; lat: number | null; lng: number | null };
  destination: { label: string; lat?: number | null; lng?: number | null };
  expoPushToken: string | null;
};

export type StudentCreateRequestResponse = { requestId: string; code?: string };

export type StudentRequestStatus =
  | "MATCHING"
  | "ASSIGNED"
  | "WALKING"
  | "NO_AVAILABLE"
  | "CANCELLED"
  | "COMPLETED";

export type StudentRequestStatusResponse = {
  requestId: string;
  status: StudentRequestStatus;
  etaSeconds: number | null;
  safewalkerLive: { lat: number; lng: number } | null;
  studentCode?: string;
  safewalkerCode?: string;
  safewalkerHeadingDegrees?: number | null;
};

export type SafewalkerRequestListItem = {
  requestId: string;
  studentName: string;
  pickupLabel: string;
  destinationLabel: string;
  createdAt: number;
  pickupLat: number;
  pickupLng: number;
};

export type SafewalkerRequestDetail = {
  requestId: string;
  studentName: string;
  pickup: { label: string; lat: number | null; lng: number | null };
  destination: { label: string; lat?: number | null; lng?: number | null };
  etaToStudentSeconds: number | null;
  etaTripSeconds: number | null;
  status: "OPEN" | "ACCEPTED" | "COMPLETED";
  studentCode?: string;
  safewalkerCode?: string;
};

export type StatusUpdateResponse = {
  success: boolean;
  matching_status: boolean;
  // Safewalker Polling
  is_assigned?: boolean;
  student_lat?: number;
  student_lng?: number;
  student_label?: string;
  // Safewalker Polling
  safewalker_lat?: number;
  safewalker_lng?: number;
  match_code?: number;
};
