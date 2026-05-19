import { useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export const useTestCleanup = () => {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const cleanup = async () => {
      const now = Date.now();
      const collections = ['patients', 'alerts', 'tenants'];
      
      for (const col of collections) {
        try {
          const q = query(collection(db, col), where('isTest', '==', true));
          const snapshot = await getDocs(q);
          for (const document of snapshot.docs) {
            const data = document.data();
            if (data.testCreatedAt && (now - data.testCreatedAt > 5 * 60 * 1000)) {
              await deleteDoc(doc(db, col, document.id));
              console.log(`🧹 Cleaned up test data: ${document.id} from ${col}`);
            }
          }
        } catch (e) {
          console.error(`Cleanup error for ${col}:`, e);
        }
      }
    };

    const interval = setInterval(cleanup, 30000); // Check every 30s
    cleanup(); // Initial check

    return () => clearInterval(interval);
  }, [user]);
};
