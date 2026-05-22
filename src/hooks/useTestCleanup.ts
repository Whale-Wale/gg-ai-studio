import { useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export const useTestCleanup = () => {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    let isActive = true;

    const cleanup = async () => {
      const now = Date.now();
      const collections = ['patients', 'alerts', 'tenants'];
      
      for (const col of collections) {
        if (!isActive || !auth.currentUser) break;
        try {
          const q = query(collection(db, col), where('isTest', '==', true));
          const snapshot = await getDocs(q);
          
          for (const document of snapshot.docs) {
            if (!isActive || !auth.currentUser) break;
            const data = document.data();
            if (data.testCreatedAt && (now - data.testCreatedAt > 5 * 60 * 1000)) {
              await deleteDoc(doc(db, col, document.id));
              if (isActive) console.log(`🧹 Cleaned up test data: ${document.id} from ${col}`);
            }
          }
        } catch (e: any) {
          if (!isActive || !auth.currentUser) break;
          // Only log if it's not a permission error caused by rapid unmounting/logging out
          if (e?.code !== 'permission-denied') {
             console.error(`Cleanup error for ${col}:`, e?.message || e);
          }
        }
      }
    };

    const interval = setInterval(cleanup, 30000); // Check every 30s
    cleanup(); // Initial check

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [user]);
};
