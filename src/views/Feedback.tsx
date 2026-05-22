import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, Send, User } from 'lucide-react';

const Feedback: React.FC<{ language: 'en' | 'vi' }> = ({ language }) => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.tenantId) return;

    // Fetch users in the same tenant to chat with
    const q = query(collection(db, 'users'), where('tenantId', '==', profile.tenantId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      
      // Filter out self
      let contacts = data.filter(u => u.id !== profile.uid);
      
      // If User, show professionals. If Professional, show Users
      if (profile.role === 'User') {
         contacts = contacts.filter(u => ['Professional', 'Nurse'].includes(u.role));
      } else if (['Professional', 'Nurse'].includes(profile.role)) {
         contacts = contacts.filter(u => u.role === 'User');
      }

      setUsers(contacts);
    }, (error) => console.error("Users snapshot error:", error.message));

    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (!profile?.uid || !selectedUser?.id) return;

    // Fetch messages between profile.uid and selectedUser.id
    // To do this simply in Firestore without complex composite indexes, we can fetch messages where tenantId = profile.tenantId
    // and filter in memory, or use a composite conversation ID limit.
    // Let's use a conversation ID: smallId_largeId
    const convId = [profile.uid, selectedUser.id].sort().join('_');
    
    const q = query(
      collection(db, 'feedbacks'),
      where('conversationId', '==', convId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      data.sort((a: any, b: any) => {
        const t1 = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const t2 = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return t1 - t2;
      });
      setMessages(data);
    }, (error: any) => {
      console.error("Feedback snapshot error: ", error.message);
    });

    return () => unsubscribe();
  }, [profile, selectedUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !profile) return;
    
    const convId = [profile.uid, selectedUser.id].sort().join('_');
    
    try {
      await addDoc(collection(db, 'feedbacks'), {
        conversationId: convId,
        senderId: profile.uid,
        receiverId: selectedUser.id,
        content: newMessage.trim(),
        createdAt: serverTimestamp(),
        tenantId: profile.tenantId
      });
      setNewMessage('');
    } catch (e: any) {
      console.error(e);
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6">
      {/* Contacts List */}
      <div className="w-1/3 glass rounded-3xl overflow-hidden flex flex-col border border-white/5">
        <div className="p-4 border-b border-white/5 bg-white/5">
           <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">
             {language === 'en' ? 'Contacts' : 'Liên hệ'}
           </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
           {users.length === 0 && (
             <div className="p-6 object-center text-center opacity-50 text-sm glass rounded-2xl">
               {language === 'en' ? 'No contacts found.' : 'Không tìm thấy liên hệ.'}
             </div>
           )}
           {users.map(u => (
             <button
               key={u.id}
               onClick={() => setSelectedUser(u)}
               className={`w-full p-4 flex items-center gap-4 text-left transition-all rounded-2xl border ${selectedUser?.id === u.id ? 'bg-accent-teal/10 border-accent-teal/30 shadow-lg' : 'border-transparent hover:bg-white/5'}`}
             >
               <div className="w-10 h-10 rounded-full bg-accent-teal/20 text-accent-teal flex items-center justify-center shrink-0">
                 <User size={20} />
               </div>
               <div className="overflow-hidden">
                 <div className="font-bold truncate">{u.name || (language === 'en' ? 'Unnamed' : 'Chưa đặt tên')}</div>
                 <div className="text-[10px] opacity-60 uppercase tracking-widest truncate">{u.role}</div>
               </div>
             </button>
           ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 glass rounded-3xl overflow-hidden flex flex-col border border-white/5">
        {selectedUser ? (
          <>
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-accent-teal/20 text-accent-teal flex flex-center items-center justify-center">
                <User size={20} />
              </div>
              <div>
                <h2 className="font-bold">{selectedUser.name}</h2>
                <p className="text-[10px] opacity-50 uppercase tracking-widest">{selectedUser.role}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center opacity-50 text-sm mt-10">
                  {language === 'en' ? 'No messages yet. Send a feedback to start.' : 'Chưa có tin nhắn. Hãy gửi phản hồi để bắt đầu.'}
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === profile?.uid;
                return (
                  <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isMe ? 'bg-accent-teal text-black' : 'bg-white/10 text-white'}`}>
                       <User size={14} />
                    </div>
                    <div className={`max-w-[75%] rounded-2xl p-3 text-sm ${isMe ? 'bg-accent-teal/20 border border-accent-teal/30 rounded-tr-none' : 'bg-white/10 border border-white/5 rounded-tl-none'}`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="p-4 border-t border-white/5 bg-black/20 shrink-0">
              <div className="relative">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={language === 'en' ? 'Type your feedback...' : 'Nhập phản hồi...'}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-sm focus:bg-white/10 focus:border-accent-teal/50 outline-none transition-all placeholder:text-white/30 shadow-inner"
                />
                <button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-accent-teal text-black rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Send size={16} className="-ml-1" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
            <div className="text-center space-y-4">
              <MessageSquare size={48} className="mx-auto opacity-20" />
              <p>{language === 'en' ? 'Select a contact to send feedback' : 'Chọn một liên hệ để gửi phản hồi'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feedback;
