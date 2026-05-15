'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { initializeApp, getApps, FirebaseOptions } from 'firebase/app';
import { getAuth, Auth, User, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, Firestore, onSnapshot, Query, DocumentData, QuerySnapshot } from 'firebase/firestore';

import firebaseConfig from '../../firebase-applet-config.json';

// Configuration from config file
const config = {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: firebaseConfig.authDomain || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseConfig.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: firebaseConfig.storageBucket || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseConfig.messagingSenderId || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseConfig.appId || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Automatic fallback for essential domains if Project ID is provided
if (!config.authDomain && config.projectId) {
  config.authDomain = `${config.projectId}.firebaseapp.com`;
}
if (!config.storageBucket && config.projectId) {
  config.storageBucket = `${config.projectId}.firebasestorage.app`;
}

interface FirebaseContextType {
  app: any | null;
  auth: Auth | null;
  firestore: Firestore | null;
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  auth: null,
  firestore: null,
  user: null,
  loading: true,
  isConfigured: false,
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, auth: Auth | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const FirebaseClientProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isConfigured = !!config.apiKey;

  const instances = useMemo(() => {
    if (!isConfigured) {
      if (typeof window !== 'undefined') {
        console.warn("Firebase Studio: apiKey is missing. Please check your firebase-applet-config.json or .env file.");
      }
      return { app: null, auth: null, firestore: null };
    }

    try {
      const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
      const auth = getAuth(app);
      const firestore = getFirestore(app, (config as any).firestoreDatabaseId || '(default)');
      return { app, auth, firestore };
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      return { app: null, auth: null, firestore: null };
    }
  }, [isConfigured]);

  useEffect(() => {
    if (!instances.auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(instances.auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [instances.auth]);

  return (
    <FirebaseContext.Provider
      value={{
        ...instances,
        user,
        loading,
        isConfigured,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => useContext(FirebaseContext);
export const useAuth = () => useFirebase().auth;
export const useFirestore = () => useFirebase().firestore;
export const useUser = () => useFirebase().user;

// Helper hooks
export function useCollection(query: Query<DocumentData> | null) {
  const [data, setData] = useState<DocumentData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { auth } = useFirebase();

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(docs);
        setLoading(false);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, (query as any)._query?.path?.segments?.join('/') || 'unknown', auth);
        } catch (wrappedError) {
          setError(wrappedError as Error);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query, auth]);

  return { data, loading, error };
}


