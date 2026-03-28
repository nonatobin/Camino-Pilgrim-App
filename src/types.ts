export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email: string;
  departureDate?: string;
  targetSpeed?: number;
}

export interface TrainingLog {
  id?: string;
  uid: string;
  date: string;
  distance: number;
  speed?: number;
  heartRate?: number;
  weight?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
