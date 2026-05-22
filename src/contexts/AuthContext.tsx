
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isPro: boolean;
  isPatient: boolean;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        
        unsubscribeSnapshot = (await import('firebase/firestore')).onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            let shouldUpdate = false;
            
            if (user.email === 'admin@healthchain.com' && data.role !== 'PlatformAdmin') {
              data.role = 'PlatformAdmin';
              data.tenantId = 'system';
              shouldUpdate = true;
            } else if (user.email === 'clinic@healthchain.com' && data.role !== 'Professional') {
              data.role = 'Professional';
              shouldUpdate = true;
            }
            
            if (shouldUpdate) {
              await setDoc(docRef, { role: data.role, tenantId: data.tenantId }, { merge: true });
            }
            
            setProfile(data);
          } else {
            // New user logic
            let targetRole = 'User';
            let targetTenant = 'demo-tenant';
            if (user.email === 'admin@healthchain.com') {
               targetRole = 'PlatformAdmin';
               targetTenant = 'system';
            } else if (user.email === 'clinic@healthchain.com') {
               targetRole = 'Professional';
            }

            let patientIdStr = undefined;
            if (targetRole === 'User') {
              const { addDoc, collection } = await import('firebase/firestore');
               const pRef = await addDoc(collection(db, 'patients'), {
                 name: user.displayName || user.email?.split('@')[0] || 'Patient',
                 tenantId: targetTenant,
                 status: 'Normal',
                 createdAt: new Date()
               });
               patientIdStr = pRef.id;
            }

            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              name: user.displayName || user.email?.split('@')[0] || 'User',
              role: targetRole as any,
              tenantId: targetTenant,
              patientId: patientIdStr,
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        });
      } else {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
        }
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const signOut = () => auth.signOut();

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    await setDoc(docRef, data, { merge: true });

    if (profile?.role === 'User' && profile?.patientId) {
      const patientData: any = {};
      if (data.name !== undefined) patientData.name = data.name;
      if (data.email !== undefined) patientData.email = data.email;
      if (data.tenantId !== undefined) patientData.tenantId = data.tenantId;
      if (data.dob !== undefined) patientData.dob = data.dob;
      if (data.gender !== undefined) patientData.gender = data.gender;
      
      if (Object.keys(patientData).length > 0) {
        const patientRef = doc(db, 'patients', profile.patientId);
        await setDoc(patientRef, patientData, { merge: true });
      }
    }

    setProfile(prev => prev ? { ...prev, ...data } : null);
  };

  const isAdmin = profile?.role === 'PlatformAdmin';
  const isPro = profile?.role === 'Professional';
  const isPatient = profile?.role === 'User';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isPro, isPatient, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
