import { useEffect, useState } from 'react';
import axios from 'axios';

const ChatBadgeUpdater = () => {
    const [unreadCount, setUnreadCount] = useState(0);
    const userId = window.Laravel?.user?.id;
    const badgeElement = document.getElementById('unread-chat-count');

    /**
     * Updates the DOM element for the global navigation badge
     */
    const updateBadge = (count) => {
      if (badgeElement) {
        if (count > 0) {
          badgeElement.textContent = count;
          badgeElement.classList.remove('d-none');
        } else {
          badgeElement.textContent = '';
          badgeElement.classList.add('d-none');
        }
      }
    };

    /**
     * Fetches current unread count from the API
     */
    const refreshCount = async () => {
      try {
        const response = await axios.get('/api/chat/unread-count');
        const count = response.data.count;
        setUnreadCount(count);
        updateBadge(count);
      } catch (error) {
        console.error("Error fetching chat count:", error);
      }
    };

    // 1. Initial Fetch on Load
    useEffect(() => {
      if (!userId) return;
      refreshCount();
    }, [userId]);

    /**
     * 2. Real-Time Global Listener.
     * Updated to use the environment prefix (dev_ or prod_)
     */
    useEffect(() => {
      if (!userId || !window.Echo) return;

      // GET PREFIX: Usamos el objeto que inyectamos en app.blade.php
      const appEnv = window.Laravel && window.Laravel.env ? window.Laravel.env : 'local';
      const prefix = appEnv === 'production' ? 'prod_' : 'dev_';

      // APPLY PREFIX: Ahora el canal coincide con lo que Laravel espera
      const userChannel = `${prefix}App.Models.User.${userId}`;

      window.Echo.private(userChannel)
        .listen('.MessageSent', (e) => {
          if (Number(e.message.receiver_id) === Number(userId)) {
            setUnreadCount(prevCount => {
              const newCount = prevCount + 1;
              updateBadge(newCount);
              return newCount;
            });
          }
        })
        .error((error) => {
          console.error('Echo global channel error:', error);
        });

      return () => {
        window.Echo.leave(userChannel);
      };
    }, [userId]); 

    /**
     * 3. UI Synchronization Listener.
     */
    useEffect(() => {
      if (!userId) return;

      const handleMessagesRead = () => {
        console.log('Syncing global badge after reading messages...');
        refreshCount();
      };

      window.addEventListener('chat-messages-read', handleMessagesRead);

      return () => {
        window.removeEventListener('chat-messages-read', handleMessagesRead);
      };
    }, [userId]);
    
    return null;
};

export default ChatBadgeUpdater;